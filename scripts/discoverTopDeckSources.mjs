import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const researchQueueFilePath = path.join(
  projectRoot,
  "data",
  "deckResearchQueue.json"
);

const registryFilePath = path.join(projectRoot, "data", "deckSourceRegistry.json");

const intakeFilePath = path.join(projectRoot, "data", "deckSourceIntake.json");

const discoveryReportFilePath = path.join(
  projectRoot,
  "data",
  "topDeckSourceDiscoveryReport.json"
);

const DEFAULT_TARGET_LIMIT = 50;
const DEFAULT_MAX_PAGES_PER_TARGET = 3;
const DEFAULT_MAX_SOURCES = 50;

function getArgValue(name, fallback) {
  const arg = process.argv.find((item) => item.startsWith(`--${name}=`));

  if (!arg) {
    return fallback;
  }

  return arg.replace(`--${name}=`, "").trim();
}

function getNumberArg(name, fallback) {
  const value = Number(getArgValue(name, fallback));

  if (!Number.isInteger(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return normalizeText(value).replace(/\s+/g, "-");
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripTags(value) {
  return decodeHtmlEntities(String(value ?? "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function getSourceKey(source) {
  return [
    source.year,
    normalizeText(source.target),
    normalizeText(source.label),
    normalizeText(source.player),
    normalizeText(source.url),
  ].join("|");
}

function getDeckIdFromUrl(url) {
  return String(url ?? "").match(/\/deck\/(\d+)/)?.[1] ?? null;
}

function getExistingKeys(registry, intake) {
  const keys = new Set();

  (registry.sources ?? []).forEach((source) => {
    keys.add(getSourceKey(source));
  });

  (intake.sources ?? []).forEach((source) => {
    keys.add(getSourceKey(source));
  });

  return keys;
}

function getExistingDeckIds(registry, intake) {
  const ids = new Set();

  [...(registry.sources ?? []), ...(intake.sources ?? [])].forEach((source) => {
    const deckId = getDeckIdFromUrl(source.url);

    if (deckId) {
      ids.add(deckId);
    }
  });

  return ids;
}

function selectQueueItems(queue, targetLimit) {
  return queue
    .filter((item) => item.populationStatus !== "imported")
    .slice(0, targetLimit);
}

function buildSearchUrls(queueItem, maxPagesPerTarget) {
  const queries = [
    `${queueItem.targetName} ${queueItem.year}`,
    queueItem.targetName,
  ];

  const urls = [];

  queries.forEach((query) => {
    for (let page = 1; page <= maxPagesPerTarget; page += 1) {
      const params = new URLSearchParams();

      params.set("q", query);

      if (page > 1) {
        params.set("page", String(page));
      }

      urls.push({
        query,
        page,
        url: `https://www.yugiohtopdecks.org/decks/search?${params.toString()}`,
      });
    }
  });

  return urls;
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; YuGiOhMetaDecksSourceDiscovery/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text,
  };
}

function extractDeckLinksFromSearchHtml(html) {
  const links = [];
  const linkPattern = /<a\s+[^>]*href=["']([^"']*\/deck\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = linkPattern.exec(html)) !== null) {
    const rawHref = decodeHtmlEntities(match[1]);
    const href = rawHref.startsWith("http")
      ? rawHref
      : `https://www.yugiohtopdecks.org${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;
    const deckId = getDeckIdFromUrl(href);
    const labelText = stripTags(match[2]);

    if (!deckId) {
      continue;
    }

    links.push({
      deckId,
      url: `https://www.yugiohtopdecks.org/deck/${deckId}`,
      labelText,
    });
  }

  const uniqueLinks = new Map();

  links.forEach((link) => {
    uniqueLinks.set(link.deckId, link);
  });

  return Array.from(uniqueLinks.values());
}

function findNearText(html, needle, radius = 900) {
  const index = html.indexOf(needle);

  if (index === -1) {
    return "";
  }

  const start = Math.max(index - radius, 0);
  const end = Math.min(index + radius, html.length);

  return stripTags(html.slice(start, end));
}

function extractFieldFromText(text, fieldName) {
  const escapedField = fieldName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedField}:\\s*([^\\n|]+)`, "i");
  const match = text.match(pattern);

  return match?.[1]?.trim() ?? null;
}

function extractYearFromText(text) {
  const yearMatch = text.match(/\b(20[0-2][0-9]|200[5-9])\b/);
  return yearMatch ? Number(yearMatch[1]) : null;
}

function getCandidateMetadataFromSearchHtml(html, link) {
  const nearText = findNearText(html, `/deck/${link.deckId}`);
  const title = link.labelText || extractFieldFromText(nearText, "Deck") || "";
  const archetype = extractFieldFromText(nearText, "Archetype");
  const player =
    extractFieldFromText(nearText, "Built By") ??
    extractFieldFromText(nearText, "Player");
  const tournament = extractFieldFromText(nearText, "Tournament");
  const discoveredYear = extractYearFromText(nearText);

  return {
    title,
    archetype,
    player,
    tournament,
    discoveredYear,
    nearText,
  };
}

function scoreCandidate(queueItem, metadata) {
  const normalizedTarget = normalizeText(queueItem.targetName);
  const normalizedTitle = normalizeText(metadata.title);
  const normalizedArchetype = normalizeText(metadata.archetype);
  const normalizedText = normalizeText(metadata.nearText);

  let score = 0;

  if (normalizedArchetype.includes(normalizedTarget)) {
    score += 5;
  }

  if (normalizedTarget.includes(normalizedArchetype) && normalizedArchetype) {
    score += 4;
  }

  if (normalizedTitle.includes(normalizedTarget)) {
    score += 3;
  }

  if (normalizedText.includes(normalizedTarget)) {
    score += 2;
  }

  if (metadata.discoveredYear === queueItem.year) {
    score += 3;
  }

  if (!metadata.discoveredYear) {
    score += 1;
  }

  return score;
}

function looksRelevant(queueItem, metadata) {
  return scoreCandidate(queueItem, metadata) >= 3;
}

function buildSourceFromCandidate(queueItem, link, metadata) {
  const deckType = metadata.archetype || queueItem.targetName;
  const labelParts = ["Yu-Gi-Oh! Top Decks", `deck ${link.deckId}`];

  if (metadata.tournament) {
    labelParts.push(metadata.tournament);
  }

  return {
    year: queueItem.year,
    target: queueItem.targetName,
    status: "source-registered",
    sourceType: "deck-database",
    parseStatus: "unknown",
    label: labelParts.join(" - "),
    player: metadata.player ?? null,
    deckType,
    url: link.url,
    notes:
      "Automatically discovered from Yu-Gi-Oh! Top Decks search. Needs fetch/parse validation before import.",
  };
}

async function discoverForQueueItem(queueItem, options) {
  const searchUrls = buildSearchUrls(queueItem, options.maxPagesPerTarget);
  const candidates = [];
  const fetches = [];

  for (const search of searchUrls) {
    try {
      const response = await fetchText(search.url);

      fetches.push({
        query: search.query,
        page: search.page,
        url: search.url,
        ok: response.ok,
        status: response.status,
      });

      if (!response.ok) {
        continue;
      }

      const links = extractDeckLinksFromSearchHtml(response.text);

      links.forEach((link) => {
        const metadata = getCandidateMetadataFromSearchHtml(response.text, link);
        const score = scoreCandidate(queueItem, metadata);

        candidates.push({
          queueItem,
          search,
          link,
          metadata,
          score,
          relevant: looksRelevant(queueItem, metadata),
        });
      });
    } catch (error) {
      fetches.push({
        query: search.query,
        page: search.page,
        url: search.url,
        ok: false,
        status: null,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const uniqueCandidates = new Map();

  candidates
    .filter((candidate) => candidate.relevant)
    .sort((a, b) => b.score - a.score)
    .forEach((candidate) => {
      if (!uniqueCandidates.has(candidate.link.deckId)) {
        uniqueCandidates.set(candidate.link.deckId, candidate);
      }
    });

  return {
    queueItem,
    fetches,
    candidates,
    relevantCandidates: Array.from(uniqueCandidates.values()),
  };
}

async function main() {
  const targetLimit = getNumberArg("target-limit", DEFAULT_TARGET_LIMIT);
  const maxPagesPerTarget = getNumberArg(
    "pages-per-target",
    DEFAULT_MAX_PAGES_PER_TARGET
  );
  const maxSources = getNumberArg("max-sources", DEFAULT_MAX_SOURCES);

  const queue = readJsonFile(researchQueueFilePath, []);
  const registry = readJsonFile(registryFilePath, { sources: [] });
  const intake = readJsonFile(intakeFilePath, { sources: [] });

  const queueItems = selectQueueItems(queue, targetLimit);
  const existingKeys = getExistingKeys(registry, intake);
  const existingDeckIds = getExistingDeckIds(registry, intake);

  const discoveredSources = [];
  const targetReports = [];

  console.log("");
  console.log("Discovering Yu-Gi-Oh! Top Decks sources");
  console.log("----------------------------------------");
  console.log(`Targets checked: ${queueItems.length}`);
  console.log(`Max pages per target: ${maxPagesPerTarget}`);
  console.log(`Max sources to add: ${maxSources}`);

  for (const queueItem of queueItems) {
    if (discoveredSources.length >= maxSources) {
      break;
    }

    console.log(`Searching ${queueItem.year} ${queueItem.targetName}...`);

    const report = await discoverForQueueItem(queueItem, {
      maxPagesPerTarget,
    });

    const sourcesForTarget = [];

    for (const candidate of report.relevantCandidates) {
      if (discoveredSources.length >= maxSources) {
        break;
      }

      if (existingDeckIds.has(candidate.link.deckId)) {
        continue;
      }

      const source = buildSourceFromCandidate(
        queueItem,
        candidate.link,
        candidate.metadata
      );
      const key = getSourceKey(source);

      if (existingKeys.has(key)) {
        continue;
      }

      existingKeys.add(key);
      existingDeckIds.add(candidate.link.deckId);
      discoveredSources.push(source);
      sourcesForTarget.push(source);
    }

    targetReports.push({
      year: queueItem.year,
      targetName: queueItem.targetName,
      fetchCount: report.fetches.length,
      candidateCount: report.candidates.length,
      relevantCandidateCount: report.relevantCandidates.length,
      addedSourceCount: sourcesForTarget.length,
      addedSources: sourcesForTarget,
      fetches: report.fetches,
      topCandidates: report.relevantCandidates.slice(0, 5).map((candidate) => ({
        deckId: candidate.link.deckId,
        url: candidate.link.url,
        score: candidate.score,
        title: candidate.metadata.title,
        archetype: candidate.metadata.archetype,
        player: candidate.metadata.player,
        tournament: candidate.metadata.tournament,
        discoveredYear: candidate.metadata.discoveredYear,
      })),
    });
  }

  const updatedIntake = {
    sources: [...(intake.sources ?? []), ...discoveredSources],
  };

  writeJsonFile(intakeFilePath, updatedIntake);

  const discoveryReport = {
    generatedAt: new Date().toISOString(),
    targetLimit,
    maxPagesPerTarget,
    maxSources,
    checkedTargetCount: queueItems.length,
    discoveredSourceCount: discoveredSources.length,
    discoveredSources,
    targets: targetReports,
  };

  writeJsonFile(discoveryReportFilePath, discoveryReport);

  console.log("");
  console.log("Top Deck source discovery report");
  console.log("--------------------------------");
  console.log(`Discovered sources added to intake: ${discoveredSources.length}`);

  discoveredSources.forEach((source) => {
    console.log(`- ${source.year} ${source.target}: ${source.label}`);
  });

  console.log("");
  console.log("Updated:");
  console.log("data/deckSourceIntake.json");
  console.log("data/topDeckSourceDiscoveryReport.json");

  console.log("");
  console.log("Next:");
  console.log("npm run sources:merge");
  console.log("npm run sources:fetch");
  console.log("npm run sources:parse");
  console.log("npm run sources:append-new");
  console.log("npm run decks:import");
}

main().catch((error) => {
  console.error("Top Deck source discovery failed.");
  console.error(error);
  process.exit(1);
});
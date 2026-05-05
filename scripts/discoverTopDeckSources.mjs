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

const curatedYearCoverageFilePath = path.join(
  projectRoot,
  "data",
  "curatedYearCoverageReport.json"
);

const discoveryReportFilePath = path.join(
  projectRoot,
  "data",
  "topDeckSourceDiscoveryReport.json"
);

const DEFAULT_MAX_PAGES = 461;
const DEFAULT_START_PAGE = 1;
const DEFAULT_PAGE_LIMIT = 75;
const DEFAULT_MAX_SOURCES = 50;
const DEFAULT_CANDIDATES_PER_MISSING_SLOT = 5;

const targetAliases = {
  "performapal performage": ["performapal", "performage", "draco performapal"],
  "plant synchro": ["plant", "synchro", "tengu plant"],
  "tengu plant": ["tengu plant", "plant", "synchro"],
  "quickdraw dandywarrior": ["quickdraw", "dandywarrior"],
  "dino rabbit": ["dino rabbit", "dino", "rabbit"],
  "hero beat": ["hero beat", "hero"],
  "dark armed return": ["dark armed return", "dad", "dark armed"],
  "frog monarch": ["frog monarch", "frog", "monarch"],
  "chaos dragon": ["chaos dragon", "dragon chaos"],
  "branded despia": ["branded despia", "branded", "despia"],
  "pendulum magician": ["pendulum magician", "magician"],
  "dogmatika invoked": ["dogmatika invoked", "dogmatika", "invoked"],
  "sky striker": ["sky striker", "striker"],
  "thunder dragon": ["thunder dragon", "thunder"],
  "tenpai dragon": ["tenpai", "tenpai dragon"],
};

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

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

function getDeckIdFromUrl(url) {
  return String(url ?? "").match(/\/deck\/(\d+)/)?.[1] ?? null;
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

function getUnderfilledYearMap(curatedYearCoverageReport) {
  const map = new Map();

  (curatedYearCoverageReport.years ?? []).forEach((yearReport) => {
    if (yearReport.missingDeckCount > 0) {
      map.set(yearReport.year, yearReport.missingDeckCount);
    }
  });

  return map;
}

function selectQueueItems(queue, options) {
  return queue.filter((item) => {
    if (item.populationStatus === "imported") {
      return false;
    }

    if (!options.onlyUnderfilledYears) {
      return true;
    }

    return options.underfilledYearMap.has(item.year);
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; YuGiOhMetaDecksFullDeckCrawler/1.0)",
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

function extractRowsFromTableHtml(html) {
  const rows = [];
  const rowPattern = /<tr[\s\S]*?<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowHtml = rowMatch[0];
    const cellMatches = Array.from(
      rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)
    );

    if (cellMatches.length === 0) {
      continue;
    }

    const cells = cellMatches.map((match) => stripTags(match[1]));
    const linkMatch = rowHtml.match(/href=["']([^"']*\/deck\/\d+[^"']*)["']/i);
    const rawHref = linkMatch ? decodeHtmlEntities(linkMatch[1]) : null;

    const deckIdFromHref = rawHref ? getDeckIdFromUrl(rawHref) : null;
    const deckIdFromFirstCell = String(cells[0] ?? "").match(/\d+/)?.[0] ?? null;
    const deckId = deckIdFromHref ?? deckIdFromFirstCell;

    if (!deckId || cells.length < 6) {
      continue;
    }

    rows.push({
      deckId,
      url: `https://www.yugiohtopdecks.org/deck/${deckId}`,
      cells,
      rowText: cells.join(" | "),
    });
  }

  return rows;
}

function extractRowsFromTextFallback(html) {
  const text = stripTags(html);
  const lines = text
    .split(/\n|(?=\b\d{1,5}\s+[A-Za-z0-9])/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return lines
    .map((line) => {
      const match = line.match(/^(\d{1,5})\s+(.+)$/);

      if (!match) {
        return null;
      }

      return {
        deckId: match[1],
        url: `https://www.yugiohtopdecks.org/deck/${match[1]}`,
        cells: [],
        rowText: line,
      };
    })
    .filter(Boolean);
}

function extractDeckRows(html) {
  const tableRows = extractRowsFromTableHtml(html);

  if (tableRows.length > 0) {
    return tableRows;
  }

  return extractRowsFromTextFallback(html);
}

function parseDateYear(value) {
  const match = String(value ?? "").match(/\b(20[0-2][0-9]|200[5-9])\b/);
  return match ? Number(match[1]) : null;
}

function parseRowMetadata(row) {
  const cells = row.cells ?? [];

  if (cells.length >= 7) {
    return {
      deckId: row.deckId,
      url: row.url,
      deckName: cells[1] ?? "",
      archetype: cells[2] ?? "",
      player: cells[3] ?? "",
      tournament: cells[4] ?? "",
      date: cells[5] ?? "",
      placement: cells[6] ?? "",
      discoveredYear: parseDateYear(cells[5]) ?? parseDateYear(row.rowText),
      rowText: row.rowText,
    };
  }

  return {
    deckId: row.deckId,
    url: row.url,
    deckName: "",
    archetype: "",
    player: "",
    tournament: "",
    date: "",
    placement: "",
    discoveredYear: parseDateYear(row.rowText),
    rowText: row.rowText,
  };
}

function getTargetTerms(targetName) {
  const normalizedTarget = normalizeText(targetName);
  const aliases = targetAliases[normalizedTarget] ?? [];

  return Array.from(new Set([targetName, ...aliases]))
    .map(normalizeText)
    .filter(Boolean);
}

function scoreCandidate(queueItem, metadata) {
  const targetTerms = getTargetTerms(queueItem.targetName);
  const normalizedDeckName = normalizeText(metadata.deckName);
  const normalizedArchetype = normalizeText(metadata.archetype);
  const normalizedRowText = normalizeText(metadata.rowText);

  let score = 0;

  targetTerms.forEach((term) => {
    if (normalizedArchetype === term) {
      score += 10;
    } else if (
      normalizedArchetype.includes(term) ||
      term.includes(normalizedArchetype)
    ) {
      score += 7;
    }

    if (normalizedDeckName.includes(term)) {
      score += 5;
    }

    if (normalizedRowText.includes(term)) {
      score += 2;
    }
  });

  if (metadata.discoveredYear === queueItem.year) {
    score += 8;
  }

  if (
    metadata.discoveredYear &&
    Math.abs(metadata.discoveredYear - queueItem.year) === 1
  ) {
    score += 2;
  }

  return score;
}

function looksRelevant(queueItem, metadata) {
  return scoreCandidate(queueItem, metadata) >= 10;
}

function buildSourceFromCandidate(queueItem, metadata) {
  const deckType = metadata.archetype || queueItem.targetName;
  const labelParts = ["Yu-Gi-Oh! Top Decks", `deck ${metadata.deckId}`];

  if (metadata.tournament) {
    labelParts.push(metadata.tournament);
  }

  if (metadata.date) {
    labelParts.push(metadata.date);
  }

  return {
    year: queueItem.year,
    target: queueItem.targetName,
    status: "source-registered",
    sourceType: "deck-database",
    parseStatus: "unknown",
    label: labelParts.join(" - "),
    player: metadata.player || null,
    deckType,
    url: metadata.url,
    notes:
      "Automatically discovered from Yu-Gi-Oh! Top Decks full search result pages. Needs fetch/parse validation before import.",
  };
}

function findBestTargetForRow(queueItems, metadata) {
  const scoredTargets = queueItems
    .map((queueItem) => ({
      queueItem,
      score: scoreCandidate(queueItem, metadata),
      relevant: looksRelevant(queueItem, metadata),
    }))
    .filter((item) => item.relevant)
    .sort((a, b) => b.score - a.score);

  return scoredTargets[0] ?? null;
}

function getYearBudget(year, options) {
  if (!options.onlyUnderfilledYears) {
    return Infinity;
  }

  const missingDeckCount = options.underfilledYearMap.get(year) ?? 0;

  return missingDeckCount * options.candidatesPerMissingSlot;
}

async function main() {
  const maxPages = getNumberArg("max-pages", DEFAULT_MAX_PAGES);
  const startPage = getNumberArg("start-page", DEFAULT_START_PAGE);
  const pageLimit = getNumberArg("page-limit", DEFAULT_PAGE_LIMIT);
  const endPage = Math.min(maxPages, startPage + pageLimit - 1);
  const maxSources = getNumberArg("max-sources", DEFAULT_MAX_SOURCES);
  const candidatesPerMissingSlot = getNumberArg(
    "candidates-per-missing-slot",
    DEFAULT_CANDIDATES_PER_MISSING_SLOT
  );
  const onlyUnderfilledYears = hasFlag("only-underfilled-years");

  const queue = readJsonFile(researchQueueFilePath, []);
  const registry = readJsonFile(registryFilePath, { sources: [] });
  const intake = readJsonFile(intakeFilePath, { sources: [] });
  const curatedYearCoverageReport = readJsonFile(curatedYearCoverageFilePath, {
    years: [],
  });

  const underfilledYearMap = getUnderfilledYearMap(curatedYearCoverageReport);

  const options = {
    onlyUnderfilledYears,
    candidatesPerMissingSlot,
    underfilledYearMap,
  };

  const queueItems = selectQueueItems(queue, options);
  const existingKeys = getExistingKeys(registry, intake);
  const existingDeckIds = getExistingDeckIds(registry, intake);

  const discoveredSources = [];
  const pageReports = [];
  const discoveredCountByYear = new Map();

  console.log("");
  console.log("Discovering Yu-Gi-Oh! Top Decks sources");
  console.log("----------------------------------------");
  console.log(`Queue targets available: ${queueItems.length}`);
  console.log(`Max archive pages: ${maxPages}`);
  console.log(`Start page: ${startPage}`);
  console.log(`Page limit: ${pageLimit}`);
  console.log(`End page: ${endPage}`);
  console.log(`Max sources to add: ${maxSources}`);
  console.log(`Only underfilled years: ${onlyUnderfilledYears ? "yes" : "no"}`);

  if (onlyUnderfilledYears) {
    console.log(`Candidates per missing slot: ${candidatesPerMissingSlot}`);
    console.log("");
    console.log("Underfilled year budgets:");
    Array.from(underfilledYearMap.entries())
      .sort(([yearA], [yearB]) => yearA - yearB)
      .forEach(([year, missingDeckCount]) => {
        console.log(
          `- ${year}: missing ${missingDeckCount}, source budget ${
            missingDeckCount * candidatesPerMissingSlot
          }`
        );
      });
  }

  for (let page = startPage; page <= endPage; page += 1) {
    if (discoveredSources.length >= maxSources) {
      break;
    }

    const url =
      page === 1
        ? "https://www.yugiohtopdecks.org/decks/search"
        : `https://www.yugiohtopdecks.org/decks/search?page=${page}`;

    console.log(`Scanning page ${page}/${endPage}...`);

    try {
      const response = await fetchText(url);

      if (!response.ok) {
        pageReports.push({
          page,
          url,
          ok: false,
          status: response.status,
          rowCount: 0,
          relevantRowCount: 0,
          addedSourceCount: 0,
          error: response.statusText,
        });
        continue;
      }

      const rows = extractDeckRows(response.text);
      const relevantRows = [];
      const addedSources = [];

      for (const row of rows) {
        if (discoveredSources.length >= maxSources) {
          break;
        }

        const metadata = parseRowMetadata(row);
        const bestTarget = findBestTargetForRow(queueItems, metadata);

        if (!bestTarget) {
          continue;
        }

        const targetYear = bestTarget.queueItem.year;
        const yearBudget = getYearBudget(targetYear, options);
        const discoveredForYear = discoveredCountByYear.get(targetYear) ?? 0;

        relevantRows.push({
          deckId: metadata.deckId,
          deckName: metadata.deckName,
          archetype: metadata.archetype,
          player: metadata.player,
          tournament: metadata.tournament,
          date: metadata.date,
          discoveredYear: metadata.discoveredYear,
          targetYear,
          targetName: bestTarget.queueItem.targetName,
          score: bestTarget.score,
        });

        if (discoveredForYear >= yearBudget) {
          continue;
        }

        if (existingDeckIds.has(metadata.deckId)) {
          continue;
        }

        const source = buildSourceFromCandidate(bestTarget.queueItem, metadata);
        const key = getSourceKey(source);

        if (existingKeys.has(key)) {
          continue;
        }

        existingKeys.add(key);
        existingDeckIds.add(metadata.deckId);
        discoveredSources.push(source);
        addedSources.push(source);
        discoveredCountByYear.set(targetYear, discoveredForYear + 1);
      }

      pageReports.push({
        page,
        url,
        ok: true,
        status: response.status,
        rowCount: rows.length,
        relevantRowCount: relevantRows.length,
        addedSourceCount: addedSources.length,
        relevantRows,
        addedSources,
      });
    } catch (error) {
      pageReports.push({
        page,
        url,
        ok: false,
        status: null,
        rowCount: 0,
        relevantRowCount: 0,
        addedSourceCount: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const updatedIntake = {
    sources: [...(intake.sources ?? []), ...discoveredSources],
  };

  writeJsonFile(intakeFilePath, updatedIntake);

  const discoveryReport = {
    generatedAt: new Date().toISOString(),
    maxPages,
    startPage,
    pageLimit,
    endPage,
    maxSources,
    onlyUnderfilledYears,
    candidatesPerMissingSlot,
    underfilledYears: Array.from(underfilledYearMap.entries()).map(
      ([year, missingDeckCount]) => ({
        year,
        missingDeckCount,
        sourceBudget: missingDeckCount * candidatesPerMissingSlot,
        discoveredSourceCount: discoveredCountByYear.get(year) ?? 0,
      })
    ),
    discoveredSourceCount: discoveredSources.length,
    discoveredSources,
    pageReports,
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
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const outputFilePath = path.join(
  projectRoot,
  "data",
  "cardGameSources.generated.ts"
);

const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "cardGameSources.importReport.json"
);

const sourcePageUrl =
  "https://www.linkevolutionpro.com/updated-card-shop-guide";

const gameName = "Yu-Gi-Oh! Legacy of the Duelist: Link Evolution";

function escapeString(value) {
  return JSON.stringify(value);
}

function normalizeCardName(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”"]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function decodePossiblyEscapedText(value) {
  let current = String(value ?? "");

  for (let index = 0; index < 4; index += 1) {
    try {
      const decoded = JSON.parse(`"${current}"`);

      if (decoded === current) {
        break;
      }

      current = decoded;
    } catch {
      break;
    }
  }

  return current;
}

function cleanText(value) {
  return decodePossiblyEscapedText(value)
    .replace(/\\{1,4}"/g, '"')
    .replace(/\\{1,4}'/g, "'")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyCardName(name) {
  if (!name) {
    return false;
  }

  if (name.length < 2 || name.length > 120) {
    return false;
  }

  if (/^\d{1,2}\s+\w{3},\s+\d{4}/.test(name)) {
    return false;
  }

  if (/^\d{1,2}\s+[A-Z][a-z]{2},/.test(name)) {
    return false;
  }

  if (name.includes("@")) {
    return false;
  }

  if (/^https?:\/\//i.test(name)) {
    return false;
  }

  return true;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; YuGiOhMetaDecksLinkEvolutionImporter/1.0)",
      Accept: "text/html,application/xhtml+xml,application/javascript,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function getScriptUrls(pageHtml) {
  return Array.from(pageHtml.matchAll(/<script[^>]+src=["']([^"']+)["']/g))
    .map((match) => match[1])
    .map((src) =>
      src.startsWith("http") ? src : new URL(src, sourcePageUrl).href
    )
    .filter((url) => url.includes("/static/js/"));
}

function extractCardLocationPairs(scriptText) {
  const pairs = [];

  const pairPattern =
    /"Name"\s*:\s*"([\s\S]*?)"\s*,\s*"Location"\s*:\s*"([\s\S]*?)"/g;

  let match;

  while ((match = pairPattern.exec(scriptText)) !== null) {
    const name = cleanText(match[1]);
    const location = cleanText(match[2]);

    if (!isLikelyCardName(name) || !location) {
      continue;
    }

    pairs.push({
      name,
      location,
    });
  }

  return pairs;
}

function addCardSource(cardSources, pair) {
  const normalizedName = normalizeCardName(pair.name);
  const existing = cardSources.get(normalizedName);

  const source = {
    game: gameName,
    packName: pair.location,
    characterName: pair.location,
    cardCategory: "Card Shop",
    notes: `Generated from LinkEvolutionPro updated card shop guide. Listed under the ${pair.location} card shop location.`,
  };

  if (!existing) {
    cardSources.set(normalizedName, {
      name: pair.name,
      status: "available",
      sources: [source],
    });
    return;
  }

  const alreadyHasLocation = existing.sources.some(
    (existingSource) =>
      normalizeCardName(existingSource.packName) ===
      normalizeCardName(pair.location)
  );

  if (!alreadyHasLocation) {
    existing.sources.push(source);
  }
}

function sortCardSources(cardSources) {
  return Array.from(cardSources.values()).sort((cardA, cardB) =>
    cardA.name.localeCompare(cardB.name)
  );
}

function formatSource(source) {
  const lines = [
    `        game: ${escapeString(source.game)},`,
    `        packName: ${escapeString(source.packName)},`,
    `        characterName: ${escapeString(source.characterName)},`,
    `        cardCategory: ${escapeString(source.cardCategory)},`,
    `        notes: ${escapeString(source.notes)},`,
  ];

  return `      {\n${lines.join("\n")}\n      }`;
}

function formatCardSource(cardSource) {
  return `  ${escapeString(cardSource.name)}: {
    name: ${escapeString(cardSource.name)},
    status: "available",
    sources: [
${cardSource.sources.map(formatSource).join(",\n")}
    ],
  }`;
}

function generateTypeScript(cardSources) {
  return `import type { CardGameSourceInfo } from "../types/deck";

export const generatedCardGameSources: Record<string, CardGameSourceInfo> = {
${sortCardSources(cardSources).map(formatCardSource).join(",\n\n")}
};
`;
}

function buildReport({
  scriptUrls,
  scriptReports,
  cardSources,
  rawPairCount,
  duplicateLocationCount,
}) {
  const sortedSources = sortCardSources(cardSources);

  return {
    generatedAt: new Date().toISOString(),
    sourcePageUrl,
    gameName,
    scriptUrls,
    scriptReports,
    rawPairCount,
    generatedCardCount: sortedSources.length,
    generatedSourceCount: sortedSources.reduce(
      (total, card) => total + card.sources.length,
      0
    ),
    duplicateLocationCount,
    sampleCards: sortedSources.slice(0, 25).map((card) => ({
      name: card.name,
      locations: card.sources.map((source) => source.packName),
    })),
  };
}

async function main() {
  console.log("");
  console.log("Importing Link Evolution card shop sources");
  console.log("-----------------------------------------");
  console.log(`Source page: ${sourcePageUrl}`);

  const pageHtml = await fetchText(sourcePageUrl);
  const scriptUrls = getScriptUrls(pageHtml);

  if (scriptUrls.length === 0) {
    throw new Error("No app script URLs found on LinkEvolutionPro page.");
  }

  const cardSources = new Map();
  const seenPairs = new Set();
  const scriptReports = [];
  let rawPairCount = 0;
  let duplicateLocationCount = 0;

  for (const scriptUrl of scriptUrls) {
    const scriptText = await fetchText(scriptUrl);
    const pairs = extractCardLocationPairs(scriptText);

    scriptReports.push({
      scriptUrl,
      length: scriptText.length,
      extractedPairCount: pairs.length,
    });

    console.log(
      `${pairs.length.toString().padStart(5)} card/location pairs from ${scriptUrl}`
    );

    pairs.forEach((pair) => {
      rawPairCount += 1;

      const pairKey = `${normalizeCardName(pair.name)}|${normalizeCardName(
        pair.location
      )}`;

      if (seenPairs.has(pairKey)) {
        duplicateLocationCount += 1;
        return;
      }

      seenPairs.add(pairKey);
      addCardSource(cardSources, pair);
    });
  }

  if (cardSources.size === 0) {
    throw new Error(
      "No card sources were extracted from LinkEvolutionPro scripts."
    );
  }

  const output = generateTypeScript(cardSources);
  const report = buildReport({
    scriptUrls,
    scriptReports,
    cardSources,
    rawPairCount,
    duplicateLocationCount,
  });

  fs.writeFileSync(outputFilePath, output, "utf8");
  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Generated card source database");
  console.log("------------------------------");
  console.log(`Cards generated: ${report.generatedCardCount}`);
  console.log(`Source mappings generated: ${report.generatedSourceCount}`);
  console.log(`Raw card/location pairs: ${report.rawPairCount}`);
  console.log(
    `Duplicate card/location pairs skipped: ${report.duplicateLocationCount}`
  );
  console.log("");
  console.log("Generated:");
  console.log("data/cardGameSources.generated.ts");
  console.log("data/cardGameSources.importReport.json");
}

main().catch((error) => {
  console.error("Card source import failed.");
  console.error(error);
  process.exit(1);
});
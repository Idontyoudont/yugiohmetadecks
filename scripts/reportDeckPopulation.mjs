import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const targetsFilePath = path.join(projectRoot, "data", "metaDeckTargets.json");
const sourceRegistryFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceRegistry.json"
);
const importedDecksFilePath = path.join(
  projectRoot,
  "data",
  "importedDecks.generated.ts"
);
const manualDecksFilePath = path.join(projectRoot, "data", "decks.ts");

const jsonReportOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckPopulationReport.json"
);

const csvReportOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckPopulationReport.csv"
);

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readTextFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function extractDecksFromTypeScript(fileContent, sourceType) {
  const deckBlocks = fileContent.match(/\{\s*id:[\s\S]*?\n\s*\}/g) ?? [];

  return deckBlocks
    .map((block) => {
      const id = block.match(/id:\s*["'`](.*?)["'`]/)?.[1];
      const name = block.match(/name:\s*["'`](.*?)["'`]/)?.[1];
      const yearText = block.match(/year:\s*(\d+)/)?.[1];
      const format = block.match(/format:\s*["'`](.*?)["'`]/)?.[1];
      const status = block.match(/status:\s*["'`](.*?)["'`]/)?.[1];

      if (!id || !name || !yearText) {
        return null;
      }

      return {
        id,
        name,
        year: Number(yearText),
        format: format ?? "Unknown",
        status: status ?? "unknown",
        sourceType,
      };
    })
    .filter(Boolean);
}

function getAllKnownDecks() {
  const manualDecks = extractDecksFromTypeScript(
    readTextFile(manualDecksFilePath),
    "manual"
  );

  const importedDecks = extractDecksFromTypeScript(
    readTextFile(importedDecksFilePath),
    "imported"
  );

  return [...manualDecks, ...importedDecks];
}

function targetMatchesDeck(targetName, deck) {
  const normalizedTarget = normalizeText(targetName);
  const normalizedDeckName = normalizeText(deck.name);

  return (
    normalizedDeckName.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedDeckName)
  );
}

function sourceMatchesTarget(source, year, targetName) {
  return (
    source.year === year &&
    normalizeText(source.target) === normalizeText(targetName)
  );
}

function getPopulationStatus({ hasSource, hasDeck }) {
  if (hasSource && hasDeck) {
    return "imported";
  }

  if (hasSource && !hasDeck) {
    return "source-registered";
  }

  if (!hasSource && hasDeck) {
    return "deck-without-registered-source";
  }

  return "missing-source-and-deck";
}

function buildPopulationReport(targetConfig, sourceRegistry, knownDecks) {
  const sources = sourceRegistry.sources ?? [];

  const years = targetConfig.years.map((yearConfig) => {
    const targetRows = yearConfig.targets.map((targetName) => {
      const matchingSources = sources.filter((source) =>
        sourceMatchesTarget(source, yearConfig.year, targetName)
      );

      const decksForYear = knownDecks.filter(
        (deck) => deck.year === yearConfig.year
      );

      const matchingDecks = decksForYear.filter((deck) =>
        targetMatchesDeck(targetName, deck)
      );

      const hasSource = matchingSources.length > 0;
      const hasDeck = matchingDecks.length > 0;

      return {
        year: yearConfig.year,
        targetName,
        status: getPopulationStatus({ hasSource, hasDeck }),
        hasSource,
        hasDeck,
        sourceCount: matchingSources.length,
        deckCount: matchingDecks.length,
        sources: matchingSources,
        decks: matchingDecks,
      };
    });

    const importedCount = targetRows.filter(
      (row) => row.status === "imported"
    ).length;

    const sourceRegisteredCount = targetRows.filter(
      (row) => row.status === "source-registered"
    ).length;

    const deckWithoutRegisteredSourceCount = targetRows.filter(
      (row) => row.status === "deck-without-registered-source"
    ).length;

    const missingCount = targetRows.filter(
      (row) => row.status === "missing-source-and-deck"
    ).length;

    return {
      year: yearConfig.year,
      targetDecksPerYear: targetConfig.targetDecksPerYear,
      targetCount: targetRows.length,
      importedCount,
      sourceRegisteredCount,
      deckWithoutRegisteredSourceCount,
      missingCount,
      targets: targetRows,
    };
  });

  const flatTargets = years.flatMap((year) => year.targets);

  return {
    generatedAt: new Date().toISOString(),
    startYear: targetConfig.startYear,
    endYear: targetConfig.endYear,
    targetDecksPerYear: targetConfig.targetDecksPerYear,
    totalYears: targetConfig.endYear - targetConfig.startYear + 1,
    totalTargetSlots: flatTargets.length,
    importedCount: flatTargets.filter((row) => row.status === "imported")
      .length,
    sourceRegisteredCount: flatTargets.filter(
      (row) => row.status === "source-registered"
    ).length,
    deckWithoutRegisteredSourceCount: flatTargets.filter(
      (row) => row.status === "deck-without-registered-source"
    ).length,
    missingCount: flatTargets.filter(
      (row) => row.status === "missing-source-and-deck"
    ).length,
    years,
  };
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function buildCsvReport(report) {
  const rows = [
    [
      "year",
      "target",
      "status",
      "hasSource",
      "hasDeck",
      "sourceCount",
      "deckCount",
      "sourceLabels",
      "deckNames",
    ],
  ];

  report.years.forEach((year) => {
    year.targets.forEach((target) => {
      rows.push([
        target.year,
        target.targetName,
        target.status,
        target.hasSource,
        target.hasDeck,
        target.sourceCount,
        target.deckCount,
        target.sources.map((source) => source.label).join(" | "),
        target.decks.map((deck) => deck.name).join(" | "),
      ]);
    });
  });

  return rows
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
}

function printReport(report) {
  console.log("");
  console.log("Deck population report");
  console.log("----------------------");
  console.log(`Range: ${report.startYear}–${report.endYear}`);
  console.log(`Years: ${report.totalYears}`);
  console.log(`Total target slots: ${report.totalTargetSlots}`);
  console.log(`Imported: ${report.importedCount}`);
  console.log(`Source registered, not imported: ${report.sourceRegisteredCount}`);
  console.log(
    `Deck imported without registered source: ${report.deckWithoutRegisteredSourceCount}`
  );
  console.log(`Missing source and deck: ${report.missingCount}`);

  console.log("");
  console.log("Year population:");
  report.years.forEach((year) => {
    console.log(
      `${year.year}: ${year.importedCount}/${year.targetDecksPerYear} imported, ${year.sourceRegisteredCount} sourced, ${year.missingCount} missing`
    );
  });

  console.log("");
  console.log("Reports saved:");
  console.log("data/deckPopulationReport.json");
  console.log("data/deckPopulationReport.csv");
}

function main() {
  const targetConfig = readJsonFile(targetsFilePath, null);
  const sourceRegistry = readJsonFile(sourceRegistryFilePath, { sources: [] });

  if (!targetConfig) {
    console.error(`Missing target file: ${targetsFilePath}`);
    process.exit(1);
  }

  const knownDecks = getAllKnownDecks();
  const report = buildPopulationReport(
    targetConfig,
    sourceRegistry,
    knownDecks
  );

  fs.writeFileSync(
    jsonReportOutputFilePath,
    JSON.stringify(report, null, 2),
    "utf8"
  );

  fs.writeFileSync(csvReportOutputFilePath, buildCsvReport(report), "utf8");

  printReport(report);
}

main();
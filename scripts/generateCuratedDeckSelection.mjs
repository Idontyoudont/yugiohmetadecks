import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const importReportFilePath = path.join(
  projectRoot,
  "data",
  "importedDecks.importReport.json"
);

const qualityReportFilePath = path.join(
  projectRoot,
  "data",
  "importedDeckQualityReport.json"
);

const outputFilePath = path.join(
  projectRoot,
  "data",
  "curatedDeckIds.generated.ts"
);

const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "curatedDeckSelectionReport.json"
);

const MAX_DECKS_PER_YEAR = 5;

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getDeckTypeKey(deck) {
  const sourceDeckType = deck.source?.deckType;
  const deckName = deck.name;

  const baseName = sourceDeckType || deckName;

  return normalizeText(baseName)
    .replace(/\b20[0-2][0-9]\b/g, "")
    .replace(/\b200[5-9]\b/g, "")
    .trim();
}

function getQualitySeverityByDeckId(qualityReport) {
  const severityByDeckId = new Map();

  (qualityReport.issueDecks ?? []).forEach((issueDeck) => {
    if (issueDeck.deck?.id) {
      severityByDeckId.set(issueDeck.deck.id, issueDeck.highestSeverity);
    }
  });

  return severityByDeckId;
}

function getQualityRank(severity) {
  if (!severity || severity === "ok") {
    return 0;
  }

  if (severity === "info") {
    return 1;
  }

  if (severity === "warning") {
    return 2;
  }

  if (severity === "error") {
    return 3;
  }

  return 4;
}

function getDeckSortScore(deck, severityByDeckId) {
  const severity = severityByDeckId.get(deck.id) ?? "ok";
  const qualityRank = getQualityRank(severity);

  const hasSourceUrl = deck.source?.url ? 0 : 1;
  const hasPlayer = deck.source?.player ? 0 : 1;
  const warningRank = deck.warningCount ?? 0;

  return {
    qualityRank,
    warningRank,
    hasSourceUrl,
    hasPlayer,
    totalCount: deck.totalCount ?? 0,
    name: deck.name,
  };
}

function compareDecks(a, b, severityByDeckId) {
  const scoreA = getDeckSortScore(a, severityByDeckId);
  const scoreB = getDeckSortScore(b, severityByDeckId);

  return (
    scoreA.qualityRank - scoreB.qualityRank ||
    scoreA.warningRank - scoreB.warningRank ||
    scoreA.hasSourceUrl - scoreB.hasSourceUrl ||
    scoreA.hasPlayer - scoreB.hasPlayer ||
    scoreB.totalCount - scoreA.totalCount ||
    scoreA.name.localeCompare(scoreB.name)
  );
}

function groupDecksByYear(decks) {
  return decks.reduce((groups, deck) => {
    if (!groups[deck.year]) {
      groups[deck.year] = [];
    }

    groups[deck.year].push(deck);
    return groups;
  }, {});
}

function curateDecksForYear(year, decks, severityByDeckId) {
  const sortedDecks = [...decks].sort((a, b) =>
    compareDecks(a, b, severityByDeckId)
  );

  const selectedDecks = [];
  const skippedDecks = [];
  const selectedDeckTypeKeys = new Set();

  sortedDecks.forEach((deck) => {
    const severity = severityByDeckId.get(deck.id) ?? "ok";
    const deckTypeKey = getDeckTypeKey(deck);

    if (severity === "error" || severity === "warning") {
      skippedDecks.push({
        id: deck.id,
        name: deck.name,
        deckTypeKey,
        reason: `Quality severity is ${severity}.`,
      });
      return;
    }

    if (selectedDecks.length >= MAX_DECKS_PER_YEAR) {
      skippedDecks.push({
        id: deck.id,
        name: deck.name,
        deckTypeKey,
        reason: `Year already has ${MAX_DECKS_PER_YEAR} selected decks.`,
      });
      return;
    }

    if (selectedDeckTypeKeys.has(deckTypeKey)) {
      skippedDecks.push({
        id: deck.id,
        name: deck.name,
        deckTypeKey,
        reason: `Duplicate deck type in ${year}: ${deckTypeKey}.`,
      });
      return;
    }

    selectedDeckTypeKeys.add(deckTypeKey);
    selectedDecks.push({
      id: deck.id,
      name: deck.name,
      year: deck.year,
      deckType: deck.source?.deckType ?? null,
      player: deck.source?.player ?? null,
      source: deck.source ?? null,
      mainDeckCount: deck.mainDeckCount,
      extraDeckCount: deck.extraDeckCount,
      sideDeckCount: deck.sideDeckCount,
      totalCount: deck.totalCount,
      qualitySeverity: severity,
      deckTypeKey,
    });
  });

  return {
    year: Number(year),
    importedDeckCount: decks.length,
    selectedDeckCount: selectedDecks.length,
    skippedDeckCount: skippedDecks.length,
    selectedDecks,
    skippedDecks,
  };
}

function generateTypeScript(selectedDeckIds) {
  return `export const curatedDeckIds = [
${selectedDeckIds.map((id) => `  ${JSON.stringify(id)}`).join(",\n")}
];

export const curatedDeckIdSet = new Set(curatedDeckIds);
`;
}

function main() {
  const importReport = readJsonFile(importReportFilePath, null);
  const qualityReport = readJsonFile(qualityReportFilePath, {
    issueDecks: [],
  });

  if (!importReport) {
    console.error(`Missing import report: ${importReportFilePath}`);
    console.error("Run this first:");
    console.error("npm run decks:import");
    process.exit(1);
  }

  const severityByDeckId = getQualitySeverityByDeckId(qualityReport);
  const decksByYear = groupDecksByYear(importReport.decks ?? {});

  const yearReports = Object.entries(decksByYear)
    .sort(([yearA], [yearB]) => Number(yearA) - Number(yearB))
    .map(([year, decks]) => curateDecksForYear(year, decks, severityByDeckId));

  const selectedDeckIds = yearReports.flatMap((yearReport) =>
    yearReport.selectedDecks.map((deck) => deck.id)
  );

  const report = {
    generatedAt: new Date().toISOString(),
    maxDecksPerYear: MAX_DECKS_PER_YEAR,
    importedDeckCount: importReport.deckCount,
    selectedDeckCount: selectedDeckIds.length,
    yearCount: yearReports.length,
    years: yearReports,
  };

  fs.writeFileSync(outputFilePath, generateTypeScript(selectedDeckIds), "utf8");
  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Curated deck selection");
  console.log("----------------------");
  console.log(`Imported decks: ${importReport.deckCount}`);
  console.log(`Selected decks: ${selectedDeckIds.length}`);
  console.log(`Max decks per year: ${MAX_DECKS_PER_YEAR}`);

  yearReports.forEach((yearReport) => {
    console.log("");
    console.log(`${yearReport.year}`);
    console.log(`Imported: ${yearReport.importedDeckCount}`);
    console.log(`Selected: ${yearReport.selectedDeckCount}`);

    yearReport.selectedDecks.forEach((deck) => {
      console.log(`- ${deck.name}`);
    });
  });

  console.log("");
  console.log("Generated:");
  console.log("data/curatedDeckIds.generated.ts");
  console.log("data/curatedDeckSelectionReport.json");
}

main();
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const targetsFilePath = path.join(projectRoot, "data", "metaDeckTargets.json");
const importedDecksFilePath = path.join(
  projectRoot,
  "data",
  "importedDecks.generated.ts"
);
const manualDecksFilePath = path.join(projectRoot, "data", "decks.ts");
const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckCoverageReport.json"
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

function readTextFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function readTargets() {
  if (!fs.existsSync(targetsFilePath)) {
    console.error(`Missing target file: ${targetsFilePath}`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(targetsFilePath, "utf8"));
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

function buildCoverageReport(targetConfig, knownDecks) {
  const years = targetConfig.years.map((yearConfig) => {
    const decksForYear = knownDecks.filter(
      (deck) => deck.year === yearConfig.year
    );

    const targetReports = yearConfig.targets.map((targetName) => {
      const matchingDecks = decksForYear.filter((deck) =>
        targetMatchesDeck(targetName, deck)
      );

      return {
        targetName,
        matched: matchingDecks.length > 0,
        matchingDecks,
      };
    });

    const filledTargetCount = targetReports.filter(
      (target) => target.matched
    ).length;

    const missingTargetCount = Math.max(
      targetConfig.targetDecksPerYear - filledTargetCount,
      0
    );

    return {
      year: yearConfig.year,
      targetDecksPerYear: targetConfig.targetDecksPerYear,
      configuredTargetCount: yearConfig.targets.length,
      filledTargetCount,
      missingTargetCount,
      knownDeckCount: decksForYear.length,
      completeDeckCount: decksForYear.filter(
        (deck) => deck.status === "complete"
      ).length,
      draftDeckCount: decksForYear.filter((deck) => deck.status === "draft")
        .length,
      sampleDeckCount: decksForYear.filter((deck) => deck.status === "sample")
        .length,
      targets: targetReports,
      knownDecks: decksForYear,
    };
  });

  const totalTargetSlots =
    (targetConfig.endYear - targetConfig.startYear + 1) *
    targetConfig.targetDecksPerYear;

  const filledTargetSlots = years.reduce(
    (total, year) => total + year.filledTargetCount,
    0
  );

  return {
    generatedAt: new Date().toISOString(),
    startYear: targetConfig.startYear,
    endYear: targetConfig.endYear,
    targetDecksPerYear: targetConfig.targetDecksPerYear,
    totalYears: targetConfig.endYear - targetConfig.startYear + 1,
    totalTargetSlots,
    filledTargetSlots,
    missingTargetSlots: totalTargetSlots - filledTargetSlots,
    totalKnownDecks: knownDecks.length,
    years,
  };
}

function printReport(report) {
  console.log("");
  console.log("Deck coverage report");
  console.log("--------------------");
  console.log(`Range: ${report.startYear}–${report.endYear}`);
  console.log(`Years: ${report.totalYears}`);
  console.log(`Target decks per year: ${report.targetDecksPerYear}`);
  console.log(`Total target slots: ${report.totalTargetSlots}`);
  console.log(`Filled target slots: ${report.filledTargetSlots}`);
  console.log(`Missing target slots: ${report.missingTargetSlots}`);
  console.log(`Known decks in app data: ${report.totalKnownDecks}`);

  console.log("");
  console.log("Year coverage:");
  report.years.forEach((year) => {
    console.log(
      `${year.year}: ${year.filledTargetCount}/${year.targetDecksPerYear} targets filled, ${year.knownDeckCount} known deck(s)`
    );
  });

  console.log("");
  console.log("Full report saved at data/deckCoverageReport.json");
}

function main() {
  const targetConfig = readTargets();
  const knownDecks = getAllKnownDecks();
  const report = buildCoverageReport(targetConfig, knownDecks);

  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  printReport(report);
}

main();
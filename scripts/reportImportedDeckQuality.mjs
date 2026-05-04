import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const importReportFilePath = path.join(
  projectRoot,
  "data",
  "importedDecks.importReport.json"
);

const populationReportFilePath = path.join(
  projectRoot,
  "data",
  "deckPopulationReport.json"
);

const qualityReportOutputFilePath = path.join(
  projectRoot,
  "data",
  "importedDeckQualityReport.json"
);

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

function buildTargetLookup(populationReport) {
  const targets = [];

  (populationReport.years ?? []).forEach((yearReport) => {
    (yearReport.targets ?? []).forEach((target) => {
      targets.push({
        year: yearReport.year,
        targetName: target.targetName,
        normalizedTargetName: normalizeText(target.targetName),
      });
    });
  });

  return targets;
}

function findMatchingTarget(deck, targets) {
  const normalizedDeckName = normalizeText(deck.name);
  const normalizedDeckType = normalizeText(deck.source?.deckType ?? "");
  const normalizedSourceLabel = normalizeText(deck.source?.label ?? "");

  return targets.find((target) => {
    if (target.year !== deck.year) {
      return false;
    }

    return (
      normalizedDeckName.includes(target.normalizedTargetName) ||
      normalizedDeckType.includes(target.normalizedTargetName) ||
      normalizedSourceLabel.includes(target.normalizedTargetName) ||
      target.normalizedTargetName.includes(normalizedDeckType)
    );
  });
}

function buildDeckQualityIssues(deck, targets) {
  const issues = [];

  if (deck.warningCount > 0) {
    issues.push({
      severity: "warning",
      type: "import-warning",
      message: `${deck.warningCount} warning(s) from deck importer.`,
      details: deck.warnings,
    });
  }

  if (deck.mainDeckCount < 40 || deck.mainDeckCount > 60) {
    issues.push({
      severity: "error",
      type: "main-deck-size",
      message: `Main Deck has ${deck.mainDeckCount} cards. Expected 40 to 60.`,
    });
  }

  if (deck.extraDeckCount > 15) {
    issues.push({
      severity: "error",
      type: "extra-deck-size",
      message: `Extra Deck has ${deck.extraDeckCount} cards. Expected 15 or fewer.`,
    });
  }

  if (deck.sideDeckCount !== 0 && deck.sideDeckCount !== 15) {
    issues.push({
      severity: "warning",
      type: "side-deck-size",
      message: `Side Deck has ${deck.sideDeckCount} cards. Expected 0 or 15.`,
    });
  }

  if (!deck.source) {
    issues.push({
      severity: "warning",
      type: "missing-source",
      message: "Deck has no source metadata.",
    });
  }

  if (deck.source && !deck.source.url) {
    issues.push({
      severity: "warning",
      type: "missing-source-url",
      message: "Deck source has no URL.",
    });
  }

  if (deck.source && !deck.source.deckType) {
    issues.push({
      severity: "info",
      type: "missing-deck-type",
      message: "Deck source has no deck type.",
    });
  }

  const matchingTarget = findMatchingTarget(deck, targets);

  if (!matchingTarget) {
    issues.push({
      severity: "info",
      type: "no-target-match",
      message:
        "Could not confidently match this imported deck to a configured target for the same year.",
    });
  }

  return {
    deck,
    matchingTarget: matchingTarget ?? null,
    issueCount: issues.length,
    highestSeverity: issues.some((issue) => issue.severity === "error")
      ? "error"
      : issues.some((issue) => issue.severity === "warning")
        ? "warning"
        : issues.some((issue) => issue.severity === "info")
          ? "info"
          : "ok",
    issues,
  };
}

function buildQualityReport(importReport, populationReport) {
  const targets = buildTargetLookup(populationReport);
  const deckReports = (importReport.decks ?? []).map((deck) =>
    buildDeckQualityIssues(deck, targets)
  );

  const issueDecks = deckReports.filter((deckReport) => deckReport.issueCount > 0);
  const errorDecks = deckReports.filter(
    (deckReport) => deckReport.highestSeverity === "error"
  );
  const warningDecks = deckReports.filter(
    (deckReport) => deckReport.highestSeverity === "warning"
  );
  const infoDecks = deckReports.filter(
    (deckReport) => deckReport.highestSeverity === "info"
  );
  const cleanDecks = deckReports.filter(
    (deckReport) => deckReport.highestSeverity === "ok"
  );

  return {
    generatedAt: new Date().toISOString(),
    inputFile: importReport.inputFile,
    importedDeckCount: importReport.deckCount,
    importerWarningCount: importReport.totalWarningCount,
    cleanDeckCount: cleanDecks.length,
    issueDeckCount: issueDecks.length,
    errorDeckCount: errorDecks.length,
    warningDeckCount: warningDecks.length,
    infoDeckCount: infoDecks.length,
    issueDecks,
    cleanDecks: cleanDecks.map((deckReport) => ({
      id: deckReport.deck.id,
      name: deckReport.deck.name,
      year: deckReport.deck.year,
      source: deckReport.deck.source,
      mainDeckCount: deckReport.deck.mainDeckCount,
      extraDeckCount: deckReport.deck.extraDeckCount,
      sideDeckCount: deckReport.deck.sideDeckCount,
      matchingTarget: deckReport.matchingTarget,
    })),
  };
}

function printReport(report) {
  console.log("");
  console.log("Imported deck quality report");
  console.log("----------------------------");
  console.log(`Input file: ${report.inputFile}`);
  console.log(`Imported decks: ${report.importedDeckCount}`);
  console.log(`Importer warnings: ${report.importerWarningCount}`);
  console.log(`Clean decks: ${report.cleanDeckCount}`);
  console.log(`Decks with issues: ${report.issueDeckCount}`);
  console.log(`Errors: ${report.errorDeckCount}`);
  console.log(`Warnings: ${report.warningDeckCount}`);
  console.log(`Info-only: ${report.infoDeckCount}`);

  if (report.issueDecks.length > 0) {
    console.log("");
    console.log("Decks to review:");

    report.issueDecks.forEach((deckReport) => {
      console.log("");
      console.log(`- ${deckReport.deck.year} ${deckReport.deck.name}`);
      console.log(`  Severity: ${deckReport.highestSeverity}`);
      console.log(
        `  Counts: Main ${deckReport.deck.mainDeckCount}, Extra ${deckReport.deck.extraDeckCount}, Side ${deckReport.deck.sideDeckCount}`
      );

      deckReport.issues.forEach((issue) => {
        console.log(`  - ${issue.severity}: ${issue.message}`);
      });
    });
  }

  console.log("");
  console.log("Full report saved at data/importedDeckQualityReport.json");
}

function main() {
  const importReport = readJsonFile(importReportFilePath, null);
  const populationReport = readJsonFile(populationReportFilePath, { years: [] });

  if (!importReport) {
    console.error(`Missing import report: ${importReportFilePath}`);
    console.error("Run this first:");
    console.error("npm run decks:import");
    process.exit(1);
  }

  const qualityReport = buildQualityReport(importReport, populationReport);

  fs.writeFileSync(
    qualityReportOutputFilePath,
    JSON.stringify(qualityReport, null, 2),
    "utf8"
  );

  printReport(qualityReport);
}

main();
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const curatedReportFilePath = path.join(
  projectRoot,
  "data",
  "curatedDeckSelectionReport.json"
);

const outputFilePath = path.join(
  projectRoot,
  "data",
  "curatedYearCoverageReport.json"
);

const START_YEAR = 2005;
const END_YEAR = 2025;
const TARGET_DECKS_PER_YEAR = 5;

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function buildYearCoverage(curatedReport) {
  const curatedYearsByYear = new Map(
    (curatedReport.years ?? []).map((yearReport) => [
      yearReport.year,
      yearReport,
    ])
  );

  const years = [];

  for (let year = START_YEAR; year <= END_YEAR; year += 1) {
    const yearReport = curatedYearsByYear.get(year);
    const selectedDecks = yearReport?.selectedDecks ?? [];
    const selectedDeckCount = selectedDecks.length;
    const missingDeckCount = Math.max(
      TARGET_DECKS_PER_YEAR - selectedDeckCount,
      0
    );

    years.push({
      year,
      targetDeckCount: TARGET_DECKS_PER_YEAR,
      selectedDeckCount,
      missingDeckCount,
      status:
        selectedDeckCount >= TARGET_DECKS_PER_YEAR
          ? "complete"
          : selectedDeckCount > 0
            ? "partial"
            : "empty",
      selectedDecks: selectedDecks.map((deck) => ({
        id: deck.id,
        name: deck.name,
        deckType: deck.deckType,
        player: deck.player,
        source: deck.source,
      })),
    });
  }

  return years;
}

function main() {
  const curatedReport = readJsonFile(curatedReportFilePath, null);

  if (!curatedReport) {
    console.error(`Missing curated report: ${curatedReportFilePath}`);
    console.error("Run this first:");
    console.error("npm run decks:curate");
    process.exit(1);
  }

  const years = buildYearCoverage(curatedReport);
  const completeYears = years.filter((year) => year.status === "complete");
  const partialYears = years.filter((year) => year.status === "partial");
  const emptyYears = years.filter((year) => year.status === "empty");

  const report = {
    generatedAt: new Date().toISOString(),
    startYear: START_YEAR,
    endYear: END_YEAR,
    targetDecksPerYear: TARGET_DECKS_PER_YEAR,
    totalTargetDecks:
      (END_YEAR - START_YEAR + 1) * TARGET_DECKS_PER_YEAR,
    selectedDeckCount: years.reduce(
      (total, year) => total + year.selectedDeckCount,
      0
    ),
    missingDeckCount: years.reduce(
      (total, year) => total + year.missingDeckCount,
      0
    ),
    completeYearCount: completeYears.length,
    partialYearCount: partialYears.length,
    emptyYearCount: emptyYears.length,
    years,
  };

  fs.writeFileSync(outputFilePath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Curated year coverage report");
  console.log("----------------------------");
  console.log(`Years: ${START_YEAR}-${END_YEAR}`);
  console.log(`Target decks per year: ${TARGET_DECKS_PER_YEAR}`);
  console.log(`Selected decks: ${report.selectedDeckCount}`);
  console.log(`Missing deck slots: ${report.missingDeckCount}`);
  console.log(`Complete years: ${report.completeYearCount}`);
  console.log(`Partial years: ${report.partialYearCount}`);
  console.log(`Empty years: ${report.emptyYearCount}`);

  console.log("");
  console.log("Years needing more decks:");
  years
    .filter((year) => year.missingDeckCount > 0)
    .forEach((year) => {
      console.log(
        `- ${year.year}: ${year.selectedDeckCount}/${TARGET_DECKS_PER_YEAR}, missing ${year.missingDeckCount}`
      );
    });

  console.log("");
  console.log("Full report saved at data/curatedYearCoverageReport.json");
}

main();
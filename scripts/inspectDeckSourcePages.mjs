import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const fetchReportFilePath = path.join(
  projectRoot,
  "data",
  "deckSourcePageFetchReport.json"
);

const outputFilePath = path.join(
  projectRoot,
  "data",
  "deckSourcePageInspectionReport.json"
);

const searchTerms = [
  "Main Deck",
  "Monster",
  "Monsters",
  "Spell",
  "Spells",
  "Trap",
  "Traps",
  "Extra Deck",
  "Side Deck",
  "Decklist",
  "Deck List",
];

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readTextFile(relativeFilePath) {
  const filePath = path.join(projectRoot, relativeFilePath);

  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function normalizeText(value) {
  return value.replace(/\r/g, "");
}

function getSnippet(text, index, radius = 700) {
  const start = Math.max(index - radius, 0);
  const end = Math.min(index + radius, text.length);

  return text
    .slice(start, end)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function inspectText(text) {
  const normalizedText = normalizeText(text);
  const lowerText = normalizedText.toLowerCase();

  const matches = [];

  searchTerms.forEach((term) => {
    const lowerTerm = term.toLowerCase();
    let fromIndex = 0;

    while (matches.length < 20) {
      const index = lowerText.indexOf(lowerTerm, fromIndex);

      if (index === -1) {
        break;
      }

      matches.push({
        term,
        index,
        snippet: getSnippet(normalizedText, index),
      });

      fromIndex = index + lowerTerm.length;
    }
  });

  return matches.sort((a, b) => a.index - b.index);
}

function main() {
  const fetchReport = readJsonFile(fetchReportFilePath, null);

  if (!fetchReport) {
    console.error(`Missing fetch report: ${fetchReportFilePath}`);
    console.error("Run this first:");
    console.error("node scripts/fetchDeckSourcePages.mjs");
    process.exit(1);
  }

  const successfulResults = (fetchReport.results ?? []).filter(
    (result) => result.ok && result.textFile
  );

  const inspections = successfulResults.map((result) => {
    const text = readTextFile(result.textFile);
    const matches = inspectText(text);

    return {
      source: result.source,
      textFile: result.textFile,
      textBytes: result.textBytes,
      matchCount: matches.length,
      matches,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    inspectedFileCount: inspections.length,
    inspections,
  };

  fs.writeFileSync(outputFilePath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Deck source page inspection");
  console.log("---------------------------");
  console.log(`Inspected files: ${inspections.length}`);

  inspections.forEach((inspection, index) => {
    console.log("");
    console.log(`${index + 1}. ${inspection.source.year} ${inspection.source.target}`);
    console.log(`   Source: ${inspection.source.label}`);
    console.log(`   Text file: ${inspection.textFile}`);
    console.log(`   Matches: ${inspection.matchCount}`);

    inspection.matches.slice(0, 5).forEach((match) => {
      console.log(`   - ${match.term} at ${match.index}`);
    });
  });

  console.log("");
  console.log("Full report saved at data/deckSourcePageInspectionReport.json");
}

main();
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
  "deckSourcePagePreviewReport.json"
);

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

function normalizeWhitespace(value) {
  return value.replace(/\r/g, "").replace(/\t/g, " ").replace(/[ ]{2,}/g, " ");
}

function getPreviewLines(text, limit = 80) {
  const normalizedText = normalizeWhitespace(text);

  const normalLines = normalizedText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.length > 1);

  if (normalLines.length > 0) {
    return normalLines.slice(0, limit);
  }

  return normalizedText
    .split(/(?<=[.!?])\s+|\s{2,}|(?=[A-Z][a-z]+ Deck)|(?=\d+\s+[A-Z])/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.length > 1)
    .slice(0, limit);
}

function getRawExcerpt(text, limit = 1500) {
  return normalizeWhitespace(text).slice(0, limit);
}

function findInterestingSnippets(text) {
  const terms = [
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
    "3 ",
    "2 ",
    "1 ",
  ];

  const normalizedText = normalizeWhitespace(text);
  const lowerText = normalizedText.toLowerCase();

  return terms
    .map((term) => {
      const index = lowerText.indexOf(term.toLowerCase());

      if (index === -1) {
        return null;
      }

      const start = Math.max(index - 300, 0);
      const end = Math.min(index + 900, normalizedText.length);

      return {
        term,
        index,
        snippet: normalizedText.slice(start, end),
      };
    })
    .filter(Boolean);
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

  const previews = successfulResults.map((result) => {
    const text = readTextFile(result.textFile);
    const previewLines = getPreviewLines(text);
    const rawExcerpt = getRawExcerpt(text);
    const interestingSnippets = findInterestingSnippets(text);

    return {
      source: result.source,
      textFile: result.textFile,
      textBytes: result.textBytes,
      rawCharacterCount: text.length,
      rawExcerpt,
      previewLineCount: previewLines.length,
      previewLines,
      interestingSnippetCount: interestingSnippets.length,
      interestingSnippets,
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    previewedFileCount: previews.length,
    previews,
  };

  fs.writeFileSync(outputFilePath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Deck source page previews");
  console.log("-------------------------");
  console.log(`Previewed files: ${previews.length}`);

  previews.forEach((preview, index) => {
    console.log("");
    console.log(`${index + 1}. ${preview.source.year} ${preview.source.target}`);
    console.log(`   Source: ${preview.source.label}`);
    console.log(`   Text file: ${preview.textFile}`);
    console.log(`   Text bytes: ${preview.textBytes}`);
    console.log(`   Raw characters: ${preview.rawCharacterCount}`);
    console.log(`   Preview lines: ${preview.previewLineCount}`);
    console.log(`   Interesting snippets: ${preview.interestingSnippetCount}`);

    console.log("");
    console.log("   Raw excerpt:");
    console.log(`   ${preview.rawExcerpt.slice(0, 500)}`);

    if (preview.previewLines.length > 0) {
      console.log("");
      console.log("   First preview lines:");
      preview.previewLines.slice(0, 12).forEach((line) => {
        console.log(`   ${line}`);
      });
    }

    if (preview.interestingSnippets.length > 0) {
      console.log("");
      console.log("   First interesting snippet:");
      console.log(`   ${preview.interestingSnippets[0].snippet.slice(0, 700)}`);
    }
  });

  console.log("");
  console.log("Full report saved at data/deckSourcePagePreviewReport.json");
}

main();
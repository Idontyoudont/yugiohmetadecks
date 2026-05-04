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

function getUsefulLines(text, limit = 80) {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => line.length > 2)
    .slice(0, limit);
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
    const usefulLines = getUsefulLines(text);

    return {
      source: result.source,
      textFile: result.textFile,
      textBytes: result.textBytes,
      previewLineCount: usefulLines.length,
      previewLines: usefulLines,
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
    console.log("   First useful lines:");

    preview.previewLines.slice(0, 12).forEach((line) => {
      console.log(`   ${line}`);
    });
  });

  console.log("");
  console.log("Full report saved at data/deckSourcePagePreviewReport.json");
}

main();
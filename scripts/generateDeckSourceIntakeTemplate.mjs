import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const researchQueueFilePath = path.join(
  projectRoot,
  "data",
  "deckResearchQueue.json"
);

const intakeTemplateOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceIntakeTemplate.json"
);

const DEFAULT_LIMIT = 10;

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getLimitFromArgs() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));

  if (!limitArg) {
    return DEFAULT_LIMIT;
  }

  const parsedLimit = Number(limitArg.replace("--limit=", ""));

  if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
    return DEFAULT_LIMIT;
  }

  return parsedLimit;
}

function buildTemplateSource(queueItem) {
  return {
    year: queueItem.year,
    target: queueItem.targetName,
    status: "source-registered",
    sourceType: "deck-database",
    parseStatus: "unknown",
    label: "",
    player: null,
    deckType: queueItem.targetName,
    url: "",
    notes: "",
    researchHints: {
      primarySearchQuery: queueItem.searchQueries?.[0] ?? "",
      googleSearch: queueItem.sourceHints?.googleSearch ?? "",
      yugiohTopDecksSearch: queueItem.sourceHints?.yugiohTopDecksSearch ?? "",
      konamiCoverageSearch: queueItem.sourceHints?.konamiCoverageSearch ?? "",
      formatLibrarySearch: queueItem.sourceHints?.formatLibrarySearch ?? "",
      ygoprodeckSearch: queueItem.sourceHints?.ygoprodeckSearch ?? "",
    },
  };
}

function main() {
  const limit = getLimitFromArgs();
  const queue = readJsonFile(researchQueueFilePath, []);

  if (!Array.isArray(queue) || queue.length === 0) {
    console.error("");
    console.error("No research queue found.");
    console.error("Run this first:");
    console.error("node scripts/updateDeckReports.mjs");
    process.exit(1);
  }

  const selectedQueueItems = queue
    .filter((item) => item.populationStatus !== "imported")
    .slice(0, limit);

  const template = {
    instructions: [
      "Fill label and url for each source you want to register.",
      "Set sourceType to one of: blog, event-archive, official-event-coverage, format-reference, deck-database, video, other.",
      "Set parseStatus to parseable if the page contains visible plain decklist lines like '3 Card Name'.",
      "Set parseStatus to reference-only if the page only confirms the archetype/event but does not contain a card list.",
      "After editing, copy wanted entries into data/deckSourceIntake.json under the sources array.",
      "Then run: node scripts/mergeDeckSourceIntake.mjs",
    ],
    generatedAt: new Date().toISOString(),
    limit,
    sources: selectedQueueItems.map(buildTemplateSource),
  };

  fs.writeFileSync(
    intakeTemplateOutputFilePath,
    JSON.stringify(template, null, 2),
    "utf8"
  );

  console.log("");
  console.log("Deck source intake template");
  console.log("---------------------------");
  console.log(`Generated template sources: ${template.sources.length}`);
  console.log("");
  console.log("Generated:");
  console.log("data/deckSourceIntakeTemplate.json");

  console.log("");
  console.log("Next:");
  console.log("1. Open data/deckSourceIntakeTemplate.json");
  console.log("2. Fill label and url for useful sources");
  console.log("3. Copy completed source objects into data/deckSourceIntake.json");
  console.log("4. Run node scripts/mergeDeckSourceIntake.mjs");
}

main();
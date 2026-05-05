import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const collectionFilePath = path.join(
  projectRoot,
  "data",
  "deckImportCollection.txt"
);

const qualityReportFilePath = path.join(
  projectRoot,
  "data",
  "importedDeckQualityReport.json"
);

const rejectedSourcesFilePath = path.join(
  projectRoot,
  "data",
  "rejectedDeckSources.json"
);

const REJECT_SEVERITIES = new Set(["error", "warning"]);

function readTextFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
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

function splitDeckBlocks(text) {
  return text
    .split(/\n\s*---\s*\n/g)
    .map((block) => block.trim())
    .filter((block) => /^Deck:\s+/m.test(block));
}

function getDeckName(deckBlock) {
  return deckBlock.match(/^Deck:\s*(.+)$/m)?.[1]?.trim() ?? null;
}

function getTopDeckIdFromUrl(url) {
  return String(url ?? "").match(/yugiohtopdecks\.org\/deck\/(\d+)/i)?.[1] ?? null;
}

function getRejectedIssueDecks(qualityReport) {
  return (qualityReport.issueDecks ?? []).filter((issueDeck) =>
    REJECT_SEVERITIES.has(issueDeck.highestSeverity)
  );
}

function main() {
  const collectionText = readTextFile(collectionFilePath);
  const collectionBlocks = splitDeckBlocks(collectionText);
  const qualityReport = readJsonFile(qualityReportFilePath, null);

  if (!qualityReport) {
    console.error("");
    console.error("Missing imported deck quality report.");
    console.error("Run this first:");
    console.error("npm run decks:quality");
    process.exit(1);
  }

  const rejectedIssueDecks = getRejectedIssueDecks(qualityReport);
  const rejectedDeckNames = new Set(
    rejectedIssueDecks.map((issueDeck) => normalizeText(issueDeck.deck?.name))
  );

  const existingRejectedSources = readJsonFile(rejectedSourcesFilePath, {
    topDeckIds: [],
    deckNames: [],
    notes: [],
  });

  const rejectedTopDeckIds = new Set(existingRejectedSources.topDeckIds ?? []);
  const rejectedDeckNameList = new Set(existingRejectedSources.deckNames ?? []);
  const notes = [...(existingRejectedSources.notes ?? [])];

  rejectedIssueDecks.forEach((issueDeck) => {
    const deck = issueDeck.deck;
    const deckName = deck?.name ?? "Unknown deck";
    const topDeckId = getTopDeckIdFromUrl(deck?.source?.url);

    rejectedDeckNameList.add(deckName);

    if (topDeckId) {
      rejectedTopDeckIds.add(topDeckId);
    }

    notes.push({
      rejectedAt: new Date().toISOString(),
      deckName,
      deckId: deck?.id ?? null,
      topDeckId,
      severity: issueDeck.highestSeverity,
      mainDeckCount: deck?.mainDeckCount ?? null,
      extraDeckCount: deck?.extraDeckCount ?? null,
      sideDeckCount: deck?.sideDeckCount ?? null,
      sourceUrl: deck?.source?.url ?? null,
      issues: issueDeck.issues ?? [],
    });
  });

  const keptBlocks = [];
  const removedBlocks = [];

  collectionBlocks.forEach((deckBlock) => {
    const deckName = getDeckName(deckBlock);
    const normalizedDeckName = normalizeText(deckName);

    if (rejectedDeckNames.has(normalizedDeckName)) {
      removedBlocks.push(deckBlock);
      return;
    }

    keptBlocks.push(deckBlock);
  });

  const nextCollectionText =
    keptBlocks.length > 0 ? `${keptBlocks.join("\n\n---\n\n")}\n` : "";

  fs.writeFileSync(collectionFilePath, nextCollectionText, "utf8");

  writeJsonFile(rejectedSourcesFilePath, {
    generatedAt: new Date().toISOString(),
    topDeckIds: Array.from(rejectedTopDeckIds).sort((a, b) => Number(a) - Number(b)),
    deckNames: Array.from(rejectedDeckNameList).sort(),
    notes,
  });

  console.log("");
  console.log("Pruned rejected imported decks");
  console.log("-----------------------------");
  console.log(`Collection decks before: ${collectionBlocks.length}`);
  console.log(`Removed decks: ${removedBlocks.length}`);
  console.log(`Collection decks after: ${keptBlocks.length}`);
  console.log(`Rejected Top Deck IDs: ${rejectedTopDeckIds.size}`);
  console.log(`Rejected deck names: ${rejectedDeckNameList.size}`);

  if (removedBlocks.length > 0) {
    console.log("");
    console.log("Removed:");
    removedBlocks.forEach((deckBlock) => {
      console.log(`- ${getDeckName(deckBlock)}`);
    });
  }

  console.log("");
  console.log("Updated:");
  console.log("data/deckImportCollection.txt");
  console.log("data/rejectedDeckSources.json");
}

main();
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const candidatesFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceParsedCandidates.txt"
);

const collectionFilePath = path.join(
  projectRoot,
  "data",
  "deckImportCollection.txt"
);

const reportFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceParsedCandidatesReport.json"
);

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

function getDeckKey(deckBlock) {
  return normalizeText(getDeckName(deckBlock));
}

function getCandidateReportByDeckName(report) {
  const map = new Map();

  (report.candidates ?? []).forEach((candidate) => {
    if (candidate.skipped || candidate.candidateLineCount === 0) {
      return;
    }

    const source = candidate.source ?? {};
    const deckName =
      source.deckType && source.year
        ? `${source.deckType} ${source.year}`
        : `${source.target} Candidate ${source.year}`;

    map.set(normalizeText(deckName), candidate);
  });

  return map;
}

function isHighConfidenceCandidate(deckBlock, candidateByDeckName) {
  const deckKey = getDeckKey(deckBlock);
  const candidate = candidateByDeckName.get(deckKey);

  if (!candidate) {
    return false;
  }

  return (
    candidate.confidence === "high" &&
    candidate.totalCardCount >= 40 &&
    candidate.mainDeckCount >= 40 &&
    candidate.extraDeckCount <= 15 &&
    (candidate.sideDeckCount === 0 || candidate.sideDeckCount === 15)
  );
}

function main() {
  const candidatesText = readTextFile(candidatesFilePath);
  const collectionText = readTextFile(collectionFilePath);
  const report = readJsonFile(reportFilePath, { candidates: [] });

  const candidateBlocks = splitDeckBlocks(candidatesText);
  const collectionBlocks = splitDeckBlocks(collectionText);
  const existingKeys = new Set(collectionBlocks.map(getDeckKey));
  const candidateByDeckName = getCandidateReportByDeckName(report);

  const appendedBlocks = [];
  const skippedBlocks = [];

  candidateBlocks.forEach((candidateBlock) => {
    const deckName = getDeckName(candidateBlock);
    const deckKey = getDeckKey(candidateBlock);

    if (!deckName) {
      skippedBlocks.push({
        deckName: "Unknown",
        reason: "Missing deck name.",
      });
      return;
    }

    if (existingKeys.has(deckKey)) {
      skippedBlocks.push({
        deckName,
        reason: "Already exists in collection.",
      });
      return;
    }

    if (!isHighConfidenceCandidate(candidateBlock, candidateByDeckName)) {
      skippedBlocks.push({
        deckName,
        reason:
          "Candidate is not high-confidence or does not meet basic deck size checks.",
      });
      return;
    }

    existingKeys.add(deckKey);
    appendedBlocks.push(candidateBlock);
  });

  const nextCollectionBlocks = [...collectionBlocks, ...appendedBlocks];
  const nextCollectionText =
    nextCollectionBlocks.length > 0
      ? `${nextCollectionBlocks.join("\n\n---\n\n")}\n`
      : collectionText;

  fs.writeFileSync(collectionFilePath, nextCollectionText, "utf8");

  console.log("");
  console.log("Append parsed candidates to collection");
  console.log("--------------------------------------");
  console.log(`Candidate decks: ${candidateBlocks.length}`);
  console.log(`Existing collection decks: ${collectionBlocks.length}`);
  console.log(`Appended decks: ${appendedBlocks.length}`);
  console.log(`Skipped decks: ${skippedBlocks.length}`);

  if (appendedBlocks.length > 0) {
    console.log("");
    console.log("Appended:");
    appendedBlocks.forEach((block) => {
      console.log(`- ${getDeckName(block)}`);
    });
  }

  if (skippedBlocks.length > 0) {
    console.log("");
    console.log("Skipped:");
    skippedBlocks.forEach((skipped) => {
      console.log(`- ${skipped.deckName}: ${skipped.reason}`);
    });
  }

  console.log("");
  console.log("Updated data/deckImportCollection.txt");
}

main();
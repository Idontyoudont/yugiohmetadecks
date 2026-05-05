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

const rejectedSourcesFilePath = path.join(
  projectRoot,
  "data",
  "rejectedDeckSources.json"
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

function getTopDeckIdFromUrl(url) {
  return String(url ?? "").match(/yugiohtopdecks\.org\/deck\/(\d+)/i)?.[1] ?? null;
}

function getCandidateDeckName(candidate) {
  const source = candidate.source ?? {};

  if (source.deckType && source.year) {
    return `${source.deckType} ${source.year}`;
  }

  return `${source.target} Candidate ${source.year}`;
}

function getCandidateReportByDeckName(report) {
  const map = new Map();

  (report.candidates ?? []).forEach((candidate) => {
    if (candidate.skipped || candidate.candidateLineCount === 0) {
      return;
    }

    const deckName = getCandidateDeckName(candidate);
    map.set(normalizeText(deckName), candidate);
  });

  return map;
}

function getRejectedSources() {
  const rejectedSources = readJsonFile(rejectedSourcesFilePath, {
    topDeckIds: [],
    deckNames: [],
  });

  return {
    topDeckIds: new Set((rejectedSources.topDeckIds ?? []).map(String)),
    deckNames: new Set((rejectedSources.deckNames ?? []).map(normalizeText)),
  };
}

function getCandidateRejectionReason(candidate, deckName, rejectedSources) {
  if (!candidate) {
    return "No candidate report found for this deck.";
  }

  const candidateTopDeckId = getTopDeckIdFromUrl(candidate.source?.url);

  if (candidateTopDeckId && rejectedSources.topDeckIds.has(candidateTopDeckId)) {
    return `Top Decks source ${candidateTopDeckId} is rejected.`;
  }

  if (rejectedSources.deckNames.has(normalizeText(deckName))) {
    return "Deck name is rejected.";
  }

  if (candidate.confidence !== "high") {
    return `Candidate confidence is ${candidate.confidence}, expected high.`;
  }

  if (candidate.totalCardCount < 40) {
    return `Total card count is ${candidate.totalCardCount}, expected at least 40.`;
  }

  if (candidate.mainDeckCount < 40 || candidate.mainDeckCount > 60) {
    return `Main Deck has ${candidate.mainDeckCount} cards, expected 40 to 60.`;
  }

  if (candidate.extraDeckCount > 15) {
    return `Extra Deck has ${candidate.extraDeckCount} cards, expected 15 or fewer.`;
  }

  if (candidate.sideDeckCount !== 0 && candidate.sideDeckCount !== 15) {
    return `Side Deck has ${candidate.sideDeckCount} cards, expected 0 or 15.`;
  }

  return null;
}

function main() {
  const candidatesText = readTextFile(candidatesFilePath);
  const collectionText = readTextFile(collectionFilePath);
  const report = readJsonFile(reportFilePath, { candidates: [] });
  const rejectedSources = getRejectedSources();

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

    const candidate = candidateByDeckName.get(deckKey);
    const rejectionReason = getCandidateRejectionReason(
      candidate,
      deckName,
      rejectedSources
    );

    if (rejectionReason) {
      skippedBlocks.push({
        deckName,
        reason: rejectionReason,
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
  console.log(`Rejected Top Deck IDs: ${rejectedSources.topDeckIds.size}`);
  console.log(`Rejected deck names: ${rejectedSources.deckNames.size}`);
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
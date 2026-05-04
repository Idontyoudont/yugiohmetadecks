import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const candidatesFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceParsedCandidates.txt"
);

const deckImportRawFilePath = path.join(projectRoot, "data", "deckImportRaw.txt");

const backupFilePath = path.join(
  projectRoot,
  "data",
  "deckImportRaw.backup.txt"
);

function readTextFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function hasCandidateDecks(text) {
  return /^Deck:\s+/m.test(text);
}

function main() {
  const candidatesText = readTextFile(candidatesFilePath).trim();

  if (!candidatesText || !hasCandidateDecks(candidatesText)) {
    console.error("");
    console.error("No parsed candidate decks found.");
    console.error("Run this first:");
    console.error("node scripts/parseDeckSourceCandidates.mjs");
    process.exit(1);
  }

  const currentImportText = readTextFile(deckImportRawFilePath);

  if (currentImportText.trim()) {
    fs.writeFileSync(backupFilePath, currentImportText, "utf8");
  }

  fs.writeFileSync(deckImportRawFilePath, `${candidatesText}\n`, "utf8");

  console.log("");
  console.log("Promoted parsed candidates");
  console.log("--------------------------");
  console.log("Copied data/deckSourceParsedCandidates.txt into data/deckImportRaw.txt");

  if (currentImportText.trim()) {
    console.log("Previous data/deckImportRaw.txt saved as:");
    console.log("data/deckImportRaw.backup.txt");
  }

  console.log("");
  console.log("Next steps:");
  console.log("1. Review data/deckImportRaw.txt");
  console.log("2. If it looks good, run:");
  console.log("   node scripts/importDecklist.mjs");
}
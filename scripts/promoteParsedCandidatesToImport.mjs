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

function getDeckNameFilterFromArgs() {
  const deckArg = process.argv.find((arg) => arg.startsWith("--deck="));

  if (!deckArg) {
    return null;
  }

  return deckArg.replace("--deck=", "").replace(/^["']|["']$/g, "").trim();
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

function splitCandidateDecks(text) {
  return text
    .split(/\n\s*---\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}

function getDeckName(deckBlock) {
  return deckBlock.match(/^Deck:\s*(.+)$/m)?.[1]?.trim() ?? null;
}

function hasCandidateDecks(text) {
  return /^Deck:\s+/m.test(text);
}

function filterDeckBlocks(deckBlocks, deckNameFilter) {
  if (!deckNameFilter) {
    return deckBlocks;
  }

  const normalizedFilter = normalizeText(deckNameFilter);

  return deckBlocks.filter((deckBlock) => {
    const deckName = getDeckName(deckBlock);

    if (!deckName) {
      return false;
    }

    const normalizedDeckName = normalizeText(deckName);

    return (
      normalizedDeckName === normalizedFilter ||
      normalizedDeckName.includes(normalizedFilter) ||
      normalizedFilter.includes(normalizedDeckName)
    );
  });
}

function main() {
  const candidatesText = readTextFile(candidatesFilePath).trim();
  const deckNameFilter = getDeckNameFilterFromArgs();

  if (!candidatesText || !hasCandidateDecks(candidatesText)) {
    console.error("");
    console.error("No parsed candidate decks found.");
    console.error("Run this first:");
    console.error("npm run sources:parse");
    process.exit(1);
  }

  const allDeckBlocks = splitCandidateDecks(candidatesText);
  const selectedDeckBlocks = filterDeckBlocks(allDeckBlocks, deckNameFilter);

  if (selectedDeckBlocks.length === 0) {
    console.error("");
    console.error("No matching candidate decks found.");

    if (deckNameFilter) {
      console.error(`Requested deck filter: ${deckNameFilter}`);
    }

    console.error("");
    console.error("Available candidate decks:");
    allDeckBlocks.forEach((deckBlock) => {
      console.error(`- ${getDeckName(deckBlock) ?? "Unnamed deck"}`);
    });

    process.exit(1);
  }

  const currentImportText = readTextFile(deckImportRawFilePath);

  if (currentImportText.trim()) {
    fs.writeFileSync(backupFilePath, currentImportText, "utf8");
  }

  fs.writeFileSync(
    deckImportRawFilePath,
    `${selectedDeckBlocks.join("\n\n---\n\n")}\n`,
    "utf8"
  );

  console.log("");
  console.log("Promoted parsed candidates");
  console.log("--------------------------");

  if (deckNameFilter) {
    console.log(`Deck filter: ${deckNameFilter}`);
  }

  console.log(`Available candidate decks: ${allDeckBlocks.length}`);
  console.log(`Promoted candidate decks: ${selectedDeckBlocks.length}`);

  selectedDeckBlocks.forEach((deckBlock) => {
    console.log(`- ${getDeckName(deckBlock) ?? "Unnamed deck"}`);
  });

  console.log("");
  console.log("Copied selected candidate deck(s) into data/deckImportRaw.txt");

  if (currentImportText.trim()) {
    console.log("Previous data/deckImportRaw.txt saved as:");
    console.log("data/deckImportRaw.backup.txt");
  }

  console.log("");
  console.log("Next steps:");
  console.log("1. Review data/deckImportRaw.txt");
  console.log("2. If it looks good, run:");
  console.log("   npm run decks:import");
}

main();
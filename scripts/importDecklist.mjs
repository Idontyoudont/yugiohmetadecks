import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const inputFilePath = path.join(projectRoot, "data", "deckImportRaw.txt");

const outputFilePath = path.join(
  projectRoot,
  "data",
  "importedDecks.generated.ts"
);

const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "importedDecks.importReport.json"
);

const validStatuses = new Set(["complete", "sample", "draft"]);

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeString(value) {
  return JSON.stringify(value);
}

function normalizeLine(line) {
  return line.replace(/\r/g, "").trim();
}

function parseMetaLine(line, key) {
  const prefix = `${key}:`;

  if (!line.toLowerCase().startsWith(prefix.toLowerCase())) {
    return null;
  }

  return line.slice(prefix.length).trim();
}

function getSectionName(line) {
  const normalizedLine = line.toLowerCase();

  if (normalizedLine === "main deck" || normalizedLine === "#main") {
    return "mainDeck";
  }

  if (normalizedLine === "extra deck" || normalizedLine === "#extra") {
    return "extraDeck";
  }

  if (
    normalizedLine === "side deck" ||
    normalizedLine === "!side" ||
    normalizedLine === "#side"
  ) {
    return "sideDeck";
  }

  return null;
}

function parseCardLine(line) {
  const match = line.match(/^(\d+)\s+(.+)$/);

  if (!match) {
    return null;
  }

  const quantity = Number(match[1]);
  const name = match[2].trim();

  if (!Number.isInteger(quantity) || quantity <= 0 || !name) {
    return null;
  }

  return {
    quantity,
    name,
  };
}

function addCard(cards, cardToAdd) {
  const existingCard = cards.find(
    (card) => card.name.toLowerCase() === cardToAdd.name.toLowerCase()
  );

  if (existingCard) {
    existingCard.quantity += cardToAdd.quantity;
    return;
  }

  cards.push({
    name: cardToAdd.name,
    quantity: cardToAdd.quantity,
    tags: [],
  });
}

function splitRawTextIntoDeckBlocks(rawText) {
  return rawText
    .split(/\n\s*---\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
}

function parseDeckBlock(rawText, index) {
  const lines = rawText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  let name = `Imported Deck ${index + 1}`;
  let year = new Date().getFullYear();
  let format = "Imported Format";
  let status = "draft";

  let currentSection = null;

  const deck = {
    mainDeck: [],
    extraDeck: [],
    sideDeck: [],
  };

  lines.forEach((line) => {
    const deckName = parseMetaLine(line, "Deck");
    const deckYear = parseMetaLine(line, "Year");
    const deckFormat = parseMetaLine(line, "Format");
    const deckStatus = parseMetaLine(line, "Status");

    if (deckName) {
      name = deckName;
      return;
    }

    if (deckYear) {
      const parsedYear = Number(deckYear);

      if (Number.isInteger(parsedYear)) {
        year = parsedYear;
      }

      return;
    }

    if (deckFormat) {
      format = deckFormat;
      return;
    }

    if (deckStatus) {
      const normalizedStatus = deckStatus.toLowerCase();

      if (validStatuses.has(normalizedStatus)) {
        status = normalizedStatus;
      }

      return;
    }

    const sectionName = getSectionName(line);

    if (sectionName) {
      currentSection = sectionName;
      return;
    }

    if (!currentSection) {
      return;
    }

    const parsedCard = parseCardLine(line);

    if (!parsedCard) {
      return;
    }

    addCard(deck[currentSection], parsedCard);
  });

  return {
    id: slugify(name),
    name,
    year,
    format,
    status,
    mainDeck: deck.mainDeck,
    extraDeck: deck.extraDeck,
    sideDeck: deck.sideDeck,
  };
}

function parseDecklists(rawText) {
  return splitRawTextIntoDeckBlocks(rawText).map(parseDeckBlock);
}

function formatCard(card) {
  const tags =
    card.tags && card.tags.length > 0
      ? `,\n      tags: [${card.tags.map(escapeString).join(", ")}]`
      : "";

  return `    {
      name: ${escapeString(card.name)},
      quantity: ${card.quantity}${tags},
    }`;
}

function formatCardArray(cards) {
  if (cards.length === 0) {
    return "[]";
  }

  return `[
${cards.map(formatCard).join(",\n")}
  ]`;
}

function formatDeck(deck) {
  return `  {
    id: ${escapeString(deck.id)},
    name: ${escapeString(deck.name)},
    year: ${deck.year},
    format: ${escapeString(deck.format)},
    status: ${escapeString(deck.status)},
    mainDeck: ${formatCardArray(deck.mainDeck)},
    extraDeck: ${formatCardArray(deck.extraDeck)},
    sideDeck: ${formatCardArray(deck.sideDeck)},
  }`;
}

function generateTypeScript(decks) {
  return `import type { Deck } from "../types/deck";

export const importedDecks: Deck[] = [
${decks.map(formatDeck).join(",\n")}
];
`;
}

function countCards(cards) {
  return cards.reduce((total, card) => total + card.quantity, 0);
}

function buildReport(decks) {
  return {
    generatedAt: new Date().toISOString(),
    inputFile: "data/deckImportRaw.txt",
    outputFile: "data/importedDecks.generated.ts",
    deckCount: decks.length,
    decks: decks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      year: deck.year,
      format: deck.format,
      status: deck.status,
      mainDeckCount: countCards(deck.mainDeck),
      extraDeckCount: countCards(deck.extraDeck),
      sideDeckCount: countCards(deck.sideDeck),
      totalCount:
        countCards(deck.mainDeck) +
        countCards(deck.extraDeck) +
        countCards(deck.sideDeck),
    })),
  };
}

function printReport(report) {
  console.log("");
  console.log("Deck import report");
  console.log("------------------");
  console.log(`Imported decks: ${report.deckCount}`);

  report.decks.forEach((deck, index) => {
    console.log("");
    console.log(`${index + 1}. ${deck.name}`);
    console.log(`   ID: ${deck.id}`);
    console.log(`   Year: ${deck.year}`);
    console.log(`   Format: ${deck.format}`);
    console.log(`   Status: ${deck.status}`);
    console.log(`   Main Deck: ${deck.mainDeckCount} cards`);
    console.log(`   Extra Deck: ${deck.extraDeckCount} cards`);
    console.log(`   Side Deck: ${deck.sideDeckCount} cards`);
    console.log(`   Total: ${deck.totalCount} cards`);
  });

  console.log("");
  console.log("Generated data/importedDecks.generated.ts");
  console.log("Full report saved at data/importedDecks.importReport.json");
}

function main() {
  if (!fs.existsSync(inputFilePath)) {
    console.error(`Input file not found: ${inputFilePath}`);
    process.exit(1);
  }

  const rawText = fs.readFileSync(inputFilePath, "utf8");
  const decks = parseDecklists(rawText);
  const output = generateTypeScript(decks);
  const report = buildReport(decks);

  fs.writeFileSync(outputFilePath, output, "utf8");
  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  printReport(report);

  if (decks.length === 0) {
    console.log("");
    console.log("No decks were imported.");
    console.log("Make sure data/deckImportRaw.txt contains at least one deck block.");
  }
}

main();
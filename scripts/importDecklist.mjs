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

function normalizeTag(tag) {
  return tag.trim().toLowerCase().replace(/\s+/g, " ");
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
  const [cardPart, tagPart] = line.split("|").map((part) => part.trim());
  const match = cardPart.match(/^(\d+)\s+(.+)$/);

  if (!match) {
    return null;
  }

  const quantity = Number(match[1]);
  const name = match[2].trim();

  if (!Number.isInteger(quantity) || quantity <= 0 || !name) {
    return null;
  }

  const tags = tagPart
    ? tagPart
        .split(",")
        .map(normalizeTag)
        .filter(Boolean)
    : [];

  return {
    quantity,
    name,
    tags,
  };
}

function mergeTags(existingTags, tagsToAdd) {
  return Array.from(new Set([...(existingTags ?? []), ...tagsToAdd])).sort();
}

function addCard(cards, cardToAdd) {
  const existingCard = cards.find(
    (card) => card.name.toLowerCase() === cardToAdd.name.toLowerCase()
  );

  if (existingCard) {
    existingCard.quantity += cardToAdd.quantity;
    existingCard.tags = mergeTags(existingCard.tags, cardToAdd.tags);
    return;
  }

  cards.push({
    name: cardToAdd.name,
    quantity: cardToAdd.quantity,
    tags: cardToAdd.tags,
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

  const ignoredLines = [];

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
      } else {
        ignoredLines.push({
          line,
          reason: "Invalid year value",
        });
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
      } else {
        ignoredLines.push({
          line,
          reason: "Invalid status value. Use complete, sample, or draft.",
        });
      }

      return;
    }

    const sectionName = getSectionName(line);

    if (sectionName) {
      currentSection = sectionName;
      return;
    }

    if (!currentSection) {
      ignoredLines.push({
        line,
        reason: "Line appears before a deck section",
      });
      return;
    }

    const parsedCard = parseCardLine(line);

    if (!parsedCard) {
      ignoredLines.push({
        line,
        reason:
          "Could not parse card line. Expected format: 1 Card Name or 1 Card Name | tag, tag",
      });
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
    ignoredLines,
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

function countTaggedCards(cards) {
  return cards.filter((card) => card.tags && card.tags.length > 0).length;
}

function getAllTags(deck) {
  const tags = [
    ...deck.mainDeck,
    ...deck.extraDeck,
    ...deck.sideDeck,
  ].flatMap((card) => card.tags ?? []);

  return Array.from(new Set(tags)).sort();
}

function getDuplicateDeckIds(decks) {
  const idCounts = new Map();

  decks.forEach((deck) => {
    idCounts.set(deck.id, (idCounts.get(deck.id) ?? 0) + 1);
  });

  return Array.from(idCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
}

function buildDeckWarnings(deck, duplicateDeckIds) {
  const warnings = [];

  const mainDeckCount = countCards(deck.mainDeck);
  const extraDeckCount = countCards(deck.extraDeck);
  const sideDeckCount = countCards(deck.sideDeck);

  if (duplicateDeckIds.includes(deck.id)) {
    warnings.push({
      type: "duplicate-deck-id",
      message: `Duplicate deck ID detected: ${deck.id}`,
    });
  }

  if (deck.mainDeck.length === 0) {
    warnings.push({
      type: "empty-main-deck",
      message: "Main Deck is empty.",
    });
  }

  if (mainDeckCount < 40) {
    warnings.push({
      type: "main-deck-too-small",
      message: `Main Deck has ${mainDeckCount} cards. Standard valid range is 40 to 60.`,
    });
  }

  if (mainDeckCount > 60) {
    warnings.push({
      type: "main-deck-too-large",
      message: `Main Deck has ${mainDeckCount} cards. Standard valid range is 40 to 60.`,
    });
  }

  if (extraDeckCount > 15) {
    warnings.push({
      type: "extra-deck-too-large",
      message: `Extra Deck has ${extraDeckCount} cards. Standard maximum is 15.`,
    });
  }

  if (sideDeckCount !== 0 && sideDeckCount !== 15) {
    warnings.push({
      type: "side-deck-invalid-size",
      message: `Side Deck has ${sideDeckCount} cards. Standard valid sizes are 0 or 15.`,
    });
  }

  if (deck.ignoredLines.length > 0) {
    warnings.push({
      type: "ignored-lines",
      message: `${deck.ignoredLines.length} line(s) were ignored during import.`,
    });
  }

  return warnings;
}

function buildReport(decks) {
  const duplicateDeckIds = getDuplicateDeckIds(decks);

  const deckReports = decks.map((deck) => {
    const mainDeckCount = countCards(deck.mainDeck);
    const extraDeckCount = countCards(deck.extraDeck);
    const sideDeckCount = countCards(deck.sideDeck);
    const taggedCardCount =
      countTaggedCards(deck.mainDeck) +
      countTaggedCards(deck.extraDeck) +
      countTaggedCards(deck.sideDeck);
    const tags = getAllTags(deck);
    const warnings = buildDeckWarnings(deck, duplicateDeckIds);

    return {
      id: deck.id,
      name: deck.name,
      year: deck.year,
      format: deck.format,
      status: deck.status,
      mainDeckCount,
      extraDeckCount,
      sideDeckCount,
      totalCount: mainDeckCount + extraDeckCount + sideDeckCount,
      taggedCardCount,
      tags,
      warningCount: warnings.length,
      warnings,
      ignoredLines: deck.ignoredLines,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    inputFile: "data/deckImportRaw.txt",
    outputFile: "data/importedDecks.generated.ts",
    deckCount: decks.length,
    totalWarningCount: deckReports.reduce(
      (total, deck) => total + deck.warningCount,
      0
    ),
    duplicateDeckIds,
    decks: deckReports,
  };
}

function printReport(report) {
  console.log("");
  console.log("Deck import report");
  console.log("------------------");
  console.log(`Imported decks: ${report.deckCount}`);
  console.log(`Total warnings: ${report.totalWarningCount}`);

  if (report.duplicateDeckIds.length > 0) {
    console.log("");
    console.log("Duplicate deck IDs:");
    report.duplicateDeckIds.forEach((id) => {
      console.log(`- ${id}`);
    });
  }

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
    console.log(`   Tagged cards: ${deck.taggedCardCount}`);

    if (deck.tags.length > 0) {
      console.log(`   Tags: ${deck.tags.join(", ")}`);
    }

    if (deck.warnings.length > 0) {
      console.log("   Warnings:");
      deck.warnings.forEach((warning) => {
        console.log(`   - ${warning.message}`);
      });
    }
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
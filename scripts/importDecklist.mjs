import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const collectionInputFilePath = path.join(
  projectRoot,
  "data",
  "deckImportCollection.txt"
);

const rawInputFilePath = path.join(projectRoot, "data", "deckImportRaw.txt");

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

const cardTagRulesFilePath = path.join(projectRoot, "data", "cardTagRules.ts");

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

function normalizeCardName(name) {
  return name
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
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

function parseCardTagRulesFile() {
  if (!fs.existsSync(cardTagRulesFilePath)) {
    return new Map();
  }

  const fileContent = fs.readFileSync(cardTagRulesFilePath, "utf8");
  const rules = new Map();

  const entryPattern = /(["'])(.*?)\1\s*:\s*\[([\s\S]*?)\]/g;
  let match;

  while ((match = entryPattern.exec(fileContent)) !== null) {
    const cardName = match[2];
    const tagsBlock = match[3];

    const tags = Array.from(tagsBlock.matchAll(/(["'])(.*?)\1/g))
      .map((tagMatch) => normalizeTag(tagMatch[2]))
      .filter(Boolean);

    rules.set(normalizeCardName(cardName), tags);
  }

  return rules;
}

const automaticTagRules = parseCardTagRulesFile();

function getAutomaticTags(cardName) {
  return automaticTagRules.get(normalizeCardName(cardName)) ?? [];
}

function mergeTags(existingTags, tagsToAdd) {
  return Array.from(new Set([...(existingTags ?? []), ...tagsToAdd])).sort();
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

  const inlineTags = tagPart
    ? tagPart
        .split(",")
        .map(normalizeTag)
        .filter(Boolean)
    : [];

  const automaticTags = getAutomaticTags(name);
  const tags = mergeTags(automaticTags, inlineTags);

  return {
    quantity,
    name,
    tags,
    automaticTags,
    inlineTags,
  };
}

function addCard(cards, cardToAdd) {
  const existingCard = cards.find(
    (card) => normalizeCardName(card.name) === normalizeCardName(cardToAdd.name)
  );

  if (existingCard) {
    existingCard.quantity += cardToAdd.quantity;
    existingCard.tags = mergeTags(existingCard.tags, cardToAdd.tags);
    existingCard.automaticTags = mergeTags(
      existingCard.automaticTags,
      cardToAdd.automaticTags
    );
    existingCard.inlineTags = mergeTags(
      existingCard.inlineTags,
      cardToAdd.inlineTags
    );
    return;
  }

  cards.push({
    name: cardToAdd.name,
    quantity: cardToAdd.quantity,
    tags: cardToAdd.tags,
    automaticTags: cardToAdd.automaticTags,
    inlineTags: cardToAdd.inlineTags,
  });
}

function hasDeckBlocks(rawText) {
  return /^Deck:\s+/m.test(rawText);
}

function readImportInput() {
  const collectionText = fs.existsSync(collectionInputFilePath)
    ? fs.readFileSync(collectionInputFilePath, "utf8")
    : "";

  if (hasDeckBlocks(collectionText)) {
    return {
      inputFilePath: collectionInputFilePath,
      inputFileLabel: "data/deckImportCollection.txt",
      rawText: collectionText,
    };
  }

  const rawText = fs.existsSync(rawInputFilePath)
    ? fs.readFileSync(rawInputFilePath, "utf8")
    : "";

  return {
    inputFilePath: rawInputFilePath,
    inputFileLabel: "data/deckImportRaw.txt",
    rawText,
  };
}

function splitRawTextIntoDeckBlocks(rawText) {
  return rawText
    .split(/\n\s*---\s*\n/g)
    .map((block) => block.trim())
    .filter((block) => /^Deck:\s+/m.test(block));
}

function cleanSource(source) {
  const cleanedSource = {};

  if (source.label) {
    cleanedSource.label = source.label;
  }

  if (source.player) {
    cleanedSource.player = source.player;
  }

  if (source.deckType) {
    cleanedSource.deckType = source.deckType;
  }

  if (source.url) {
    cleanedSource.url = source.url;
  }

  if (source.notes) {
    cleanedSource.notes = source.notes;
  }

  return Object.keys(cleanedSource).length > 0 ? cleanedSource : undefined;
}

function countCards(cards) {
  return cards.reduce((total, card) => total + card.quantity, 0);
}

function hasValidDeckSizes(deck) {
  const mainDeckCount = countCards(deck.mainDeck);
  const extraDeckCount = countCards(deck.extraDeck);
  const sideDeckCount = countCards(deck.sideDeck);

  return (
    mainDeckCount >= 40 &&
    mainDeckCount <= 60 &&
    extraDeckCount <= 15 &&
    (sideDeckCount === 0 || sideDeckCount === 15)
  );
}

function getFinalDeckStatus(parsedStatus, deck) {
  if (parsedStatus === "sample") {
    return "sample";
  }

  if (hasValidDeckSizes(deck)) {
    return "complete";
  }

  return "draft";
}

function parseDeckBlock(rawText, index) {
  const lines = rawText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  let name = `Imported Deck ${index + 1}`;
  let year = new Date().getFullYear();
  let format = "Imported Format";
  let parsedStatus = "draft";

  const source = {
    label: "",
    player: "",
    deckType: "",
    url: "",
    notes: "",
  };

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
    const sourceLabel = parseMetaLine(line, "Source");
    const sourcePlayer = parseMetaLine(line, "Player");
    const sourceDeckType = parseMetaLine(line, "Deck Type");
    const sourceUrl = parseMetaLine(line, "Source URL");
    const sourceNotes = parseMetaLine(line, "Source Notes");

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
        parsedStatus = normalizedStatus;
      } else {
        ignoredLines.push({
          line,
          reason: "Invalid status value. Use complete, sample, or draft.",
        });
      }

      return;
    }

    if (sourceLabel) {
      source.label = sourceLabel;
      return;
    }

    if (sourcePlayer) {
      source.player = sourcePlayer;
      return;
    }

    if (sourceDeckType) {
      source.deckType = sourceDeckType;
      return;
    }

    if (sourceUrl) {
      source.url = sourceUrl;
      return;
    }

    if (sourceNotes) {
      source.notes = sourceNotes;
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

  const status = getFinalDeckStatus(parsedStatus, deck);

  return {
    originalId: slugify(name),
    id: slugify(name),
    name,
    year,
    format,
    status,
    source: cleanSource(source),
    mainDeck: deck.mainDeck,
    extraDeck: deck.extraDeck,
    sideDeck: deck.sideDeck,
    ignoredLines,
  };
}

function parseDecklists(rawText) {
  return splitRawTextIntoDeckBlocks(rawText).map(parseDeckBlock);
}

function assignUniqueDeckIds(decks) {
  const idCounts = new Map();

  return decks.map((deck) => {
    const baseId = deck.originalId || deck.id || "imported-deck";
    const currentCount = idCounts.get(baseId) ?? 0;
    const nextCount = currentCount + 1;

    idCounts.set(baseId, nextCount);

    if (currentCount === 0) {
      return {
        ...deck,
        id: baseId,
        generatedDuplicateId: false,
      };
    }

    return {
      ...deck,
      id: `${baseId}-${nextCount}`,
      generatedDuplicateId: true,
    };
  });
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

function formatSource(source) {
  if (!source) {
    return "";
  }

  const lines = [];

  if (source.label) {
    lines.push(`      label: ${escapeString(source.label)},`);
  }

  if (source.player) {
    lines.push(`      player: ${escapeString(source.player)},`);
  }

  if (source.deckType) {
    lines.push(`      deckType: ${escapeString(source.deckType)},`);
  }

  if (source.url) {
    lines.push(`      url: ${escapeString(source.url)},`);
  }

  if (source.notes) {
    lines.push(`      notes: ${escapeString(source.notes)},`);
  }

  return `\n    source: {\n${lines.join("\n")}\n    },`;
}

function formatDeck(deck) {
  return `  {
    id: ${escapeString(deck.id)},
    name: ${escapeString(deck.name)},
    year: ${deck.year},
    format: ${escapeString(deck.format)},
    status: ${escapeString(deck.status)},${formatSource(deck.source)}
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

function countTaggedCards(cards) {
  return cards.filter((card) => card.tags && card.tags.length > 0).length;
}

function countAutomaticTaggedCards(cards) {
  return cards.filter(
    (card) => card.automaticTags && card.automaticTags.length > 0
  ).length;
}

function countInlineTaggedCards(cards) {
  return cards.filter((card) => card.inlineTags && card.inlineTags.length > 0)
    .length;
}

function getAllTags(deck) {
  const tags = [
    ...deck.mainDeck,
    ...deck.extraDeck,
    ...deck.sideDeck,
  ].flatMap((card) => card.tags ?? []);

  return Array.from(new Set(tags)).sort();
}

function getRenamedDuplicateDecks(decks) {
  return decks
    .filter((deck) => deck.generatedDuplicateId)
    .map((deck) => ({
      name: deck.name,
      originalId: deck.originalId,
      assignedId: deck.id,
    }));
}

function buildDeckWarnings(deck) {
  const warnings = [];

  const mainDeckCount = countCards(deck.mainDeck);
  const extraDeckCount = countCards(deck.extraDeck);
  const sideDeckCount = countCards(deck.sideDeck);

  if (deck.generatedDuplicateId) {
    warnings.push({
      type: "duplicate-deck-id-renamed",
      message: `Duplicate deck ID was automatically renamed from ${deck.originalId} to ${deck.id}.`,
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

function buildReport(decks, inputInfo) {
  const renamedDuplicateDecks = getRenamedDuplicateDecks(decks);

  const deckReports = decks.map((deck) => {
    const mainDeckCount = countCards(deck.mainDeck);
    const extraDeckCount = countCards(deck.extraDeck);
    const sideDeckCount = countCards(deck.sideDeck);
    const taggedCardCount =
      countTaggedCards(deck.mainDeck) +
      countTaggedCards(deck.extraDeck) +
      countTaggedCards(deck.sideDeck);
    const automaticTaggedCardCount =
      countAutomaticTaggedCards(deck.mainDeck) +
      countAutomaticTaggedCards(deck.extraDeck) +
      countAutomaticTaggedCards(deck.sideDeck);
    const inlineTaggedCardCount =
      countInlineTaggedCards(deck.mainDeck) +
      countInlineTaggedCards(deck.extraDeck) +
      countInlineTaggedCards(deck.sideDeck);
    const tags = getAllTags(deck);
    const warnings = buildDeckWarnings(deck);

    return {
      id: deck.id,
      originalId: deck.originalId,
      name: deck.name,
      year: deck.year,
      format: deck.format,
      status: deck.status,
      source: deck.source ?? null,
      mainDeckCount,
      extraDeckCount,
      sideDeckCount,
      totalCount: mainDeckCount + extraDeckCount + sideDeckCount,
      taggedCardCount,
      automaticTaggedCardCount,
      inlineTaggedCardCount,
      tags,
      warningCount: warnings.length,
      warnings,
      ignoredLines: deck.ignoredLines,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    inputFile: inputInfo.inputFileLabel,
    fallbackInputFile: "data/deckImportRaw.txt",
    outputFile: "data/importedDecks.generated.ts",
    tagRulesFile: "data/cardTagRules.ts",
    automaticTagRuleCount: automaticTagRules.size,
    deckCount: decks.length,
    totalWarningCount: deckReports.reduce(
      (total, deck) => total + deck.warningCount,
      0
    ),
    renamedDuplicateDecks,
    decks: deckReports,
  };
}

function printReport(report) {
  console.log("");
  console.log("Deck import report");
  console.log("------------------");
  console.log(`Input file: ${report.inputFile}`);
  console.log(`Imported decks: ${report.deckCount}`);
  console.log(`Total warnings: ${report.totalWarningCount}`);
  console.log(`Automatic tag rules: ${report.automaticTagRuleCount}`);

  if (report.renamedDuplicateDecks.length > 0) {
    console.log("");
    console.log("Automatically renamed duplicate deck IDs:");
    report.renamedDuplicateDecks.forEach((deck) => {
      console.log(`- ${deck.name}: ${deck.originalId} → ${deck.assignedId}`);
    });
  }

  report.decks.forEach((deck, index) => {
    console.log("");
    console.log(`${index + 1}. ${deck.name}`);
    console.log(`   ID: ${deck.id}`);

    if (deck.originalId !== deck.id) {
      console.log(`   Original ID: ${deck.originalId}`);
    }

    console.log(`   Year: ${deck.year}`);
    console.log(`   Format: ${deck.format}`);
    console.log(`   Status: ${deck.status}`);

    if (deck.source) {
      console.log(`   Source: ${deck.source.label}`);

      if (deck.source.player) {
        console.log(`   Player: ${deck.source.player}`);
      }

      if (deck.source.deckType) {
        console.log(`   Deck Type: ${deck.source.deckType}`);
      }
    }

    console.log(`   Main Deck: ${deck.mainDeckCount} cards`);
    console.log(`   Extra Deck: ${deck.extraDeckCount} cards`);
    console.log(`   Side Deck: ${deck.sideDeckCount} cards`);
    console.log(`   Total: ${deck.totalCount} cards`);
    console.log(`   Tagged cards: ${deck.taggedCardCount}`);
    console.log(`   Automatic tagged cards: ${deck.automaticTaggedCardCount}`);
    console.log(`   Inline tagged cards: ${deck.inlineTaggedCardCount}`);

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
  const inputInfo = readImportInput();
  const parsedDecks = parseDecklists(inputInfo.rawText);
  const decks = assignUniqueDeckIds(parsedDecks);
  const output = generateTypeScript(decks);
  const report = buildReport(decks, inputInfo);

  fs.writeFileSync(outputFilePath, output, "utf8");
  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  printReport(report);

  if (decks.length === 0) {
    console.log("");
    console.log("No decks were imported.");
    console.log(
      "Make sure data/deckImportCollection.txt or data/deckImportRaw.txt contains at least one deck block."
    );
  }
}

main();
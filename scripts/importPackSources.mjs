import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const inputFilePath = path.join(
  projectRoot,
  "data",
  "legacyOfDuelistGuideRaw.txt"
);

const outputFilePath = path.join(
  projectRoot,
  "data",
  "cardGameSources.generated.ts"
);

const gameName = "Yu-Gi-Oh! Legacy of the Duelist";

const knownPackNames = [
  "Grandpa Muto",
  "Yugi Muto/Yami",
  "Joey Wheeler",
  "Seto Kaiba",
  "Mai Valentine",
  "Bakura Ryou",
  "Maximillion Pegasus",
  "Rex Raptor",
  "Weevil Underwood",
  "Mako Tsunami",
  "Espa Roba",
  "Ishizu Ishtar",
  "Odion",
  "Marik Ishtar",
  "Yami Marik",

  "Jaden Yuki",
  "Syrus Truesdale",
  "Chazz Princeton",
  "Alexis Rhodes",
  "Bastion Misawa",
  "Zane Truesdale",
  "Aster Phoenix",
  "Jesse Anderson",
  "Axel Brodie",
  "Jim Crocodile Cook",
  "Yubel",

  "Yusei Fudo",
  "Jack Atlas",
  "Akiza Izinski",
  "Leo",
  "Luna",
  "Crow Hogan",
  "Kalin Kessler",
  "Tetsu Trudge",
  "Bruno",

  "Yuma Tsukumo",
  "Reginald Kastle",
  "Kite Tenjo",
  "Tori Meadows",
  "Quattro",
  "Quinton",
  "Trey",

  "Yuya Sakaki",
  "Zuzu Boyle",
  "Gong Strong",
  "Sylvio Sawatari",
  "Declan Akaba",
  "Shay Obsidian",
  "Sora Perse",
  "Pendulum",
];

const knownCategoryNames = [
  "Normal Monsters",
  "Effect Monsters",
  "Ritual Monsters",
  "Fusion Monsters",
  "Synchro Monsters",
  "Xyz Monsters",
  "Pendulum Monsters",
  "Spirit Monsters",
  "Toon Monsters",
  "Union Monsters",
  "Gemini Monsters",
  "Tuner Monsters",
  "Flip Monsters",
  "Spell Cards",
  "Trap Cards",
];

function normalizeLine(line) {
  return line
    .replace(/\r/g, "")
    .replace(/^[•\-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCardName(name) {
  return name
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeString(value) {
  return JSON.stringify(value);
}

function isLikelyNoiseLine(line) {
  const lower = line.toLowerCase();

  if (!line) {
    return true;
  }

  if (lower.includes("steam community")) {
    return true;
  }

  if (lower.includes("sign in")) {
    return true;
  }

  if (lower.includes("created by")) {
    return true;
  }

  if (lower.includes("favorite")) {
    return true;
  }

  if (lower.includes("share")) {
    return true;
  }

  if (lower.includes("guide index")) {
    return true;
  }

  if (lower.includes("comments")) {
    return true;
  }

  if (lower.includes("rate")) {
    return true;
  }

  return false;
}

function getMatchingPackName(line) {
  return knownPackNames.find(
    (packName) => packName.toLowerCase() === line.toLowerCase()
  );
}

function getMatchingCategoryName(line) {
  return knownCategoryNames.find(
    (categoryName) => categoryName.toLowerCase() === line.toLowerCase()
  );
}

function addCardSource(cardSources, cardName, packName, cardCategory) {
  const normalizedCardName = normalizeCardName(cardName);

  if (!normalizedCardName || !packName || !cardCategory) {
    return;
  }

  const existing = cardSources.get(normalizedCardName);

  const source = {
    game: gameName,
    packName,
    characterName: packName,
    cardCategory,
    notes: `Generated from imported Legacy of the Duelist guide text. Listed in the ${packName} pack under ${cardCategory}.`,
  };

  if (!existing) {
    cardSources.set(normalizedCardName, {
      displayName: cardName,
      sources: [source],
    });
    return;
  }

  const duplicateSource = existing.sources.some(
    (item) =>
      item.packName === source.packName &&
      item.cardCategory === source.cardCategory
  );

  if (!duplicateSource) {
    existing.sources.push(source);
  }
}

function parseGuideText(rawText) {
  const cardSources = new Map();

  let currentPackName = null;
  let currentCategoryName = null;

  const lines = rawText
    .split("\n")
    .map(normalizeLine)
    .filter((line) => !isLikelyNoiseLine(line));

  lines.forEach((line) => {
    const packName = getMatchingPackName(line);

    if (packName) {
      currentPackName = packName;
      currentCategoryName = null;
      return;
    }

    const categoryName = getMatchingCategoryName(line);

    if (categoryName) {
      currentCategoryName = categoryName;
      return;
    }

    if (!currentPackName || !currentCategoryName) {
      return;
    }

    addCardSource(cardSources, line, currentPackName, currentCategoryName);
  });

  return cardSources;
}

function generateTypeScript(cardSources) {
  const sortedEntries = Array.from(cardSources.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );

  const entries = sortedEntries
    .map((entry) => {
      const sources = entry.sources
        .map(
          (source) => `      {
        game: ${escapeString(source.game)},
        packName: ${escapeString(source.packName)},
        characterName: ${escapeString(source.characterName)},
        cardCategory: ${escapeString(source.cardCategory)},
        notes: ${escapeString(source.notes)},
      }`
        )
        .join(",\n");

      return `  ${escapeString(entry.displayName)}: {
    name: ${escapeString(entry.displayName)},
    status: "available",
    sources: [
${sources}
    ],
  }`;
    })
    .join(",\n\n");

  return `import type { CardGameSourceInfo } from "../types/deck";

export const generatedCardGameSources: Record<string, CardGameSourceInfo> = {
${entries}
};
`;
}

function main() {
  if (!fs.existsSync(inputFilePath)) {
    console.error(`Input file not found: ${inputFilePath}`);
    process.exit(1);
  }

  const rawText = fs.readFileSync(inputFilePath, "utf8");
  const cardSources = parseGuideText(rawText);
  const output = generateTypeScript(cardSources);

  fs.writeFileSync(outputFilePath, output, "utf8");

  console.log(
    `Generated ${cardSources.size} card source mappings at data/cardGameSources.generated.ts`
  );

  if (cardSources.size === 0) {
    console.log("");
    console.log("No cards were generated yet.");
    console.log("Paste guide text into data/legacyOfDuelistGuideRaw.txt, then run:");
    console.log("node scripts/importPackSources.mjs");
  }
}

main();
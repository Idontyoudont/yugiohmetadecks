import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const outputFilePath = path.join(
  projectRoot,
  "data",
  "cardGameSources.generated.ts"
);

const rawOutputFilePath = path.join(
  projectRoot,
  "data",
  "legacyOfDuelistGuideRaw.txt"
);

const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "cardGameSources.importReport.json"
);

const steamGuideUrl =
  "https://steamcommunity.com/sharedfiles/filedetails/?id=814689673";

const gameName = "Yu-Gi-Oh! Legacy of the Duelist";

const knownPackNames = [
  "Grandpa Muto",
  "Mai Valentine",
  "Bakura Ryou",
  "Joey Wheeler",
  "Seto Kaiba",
  "Yugi Muto/Yami",

  "Alexis Rhodes",
  "Bastion Misawa",
  "Chazz Princeton",
  "Syrus Truesdale",
  "Jesse Anderson",
  "Jaden Yuki",

  "Officer Trudge",
  "Leo/Luna",
  "Akiza Ininski",
  "Jack Atlas",
  "Crow Hogan",
  "Yusei Fudo",

  "Cathy Katherine",
  "Quinton",
  "Kite Tenjo",
  "Reginald Kastle",
  "Yuma Tsukumo",

  "Pendulum",
  "Gong Strong",
  "Zuzu Boyle",
];

const categoryAliases = [
  {
    output: "Normal Monster Cards",
    aliases: ["Normal Monster Cards", "Normal Monsters"],
  },
  {
    output: "Effect Monster Cards",
    aliases: ["Effect Monster Cards", "Effect Monsters"],
  },
  {
    output: "Ritual Monster Cards",
    aliases: ["Ritual Monster Cards", "Ritual Monsters"],
  },
  {
    output: "Fusion Monster Cards",
    aliases: ["Fusion Monster Cards", "Fusion Monsters"],
  },
  {
    output: "Synchro Monster Cards",
    aliases: ["Synchro Monster Cards", "Synchro Monsters"],
  },
  {
    output: "Xyz Monster Cards",
    aliases: ["Xyz Monster Cards", "Xyz Monsters"],
  },
  {
    output: "Pendulum Monster Cards",
    aliases: ["Pendulum Monster Cards", "Pendulum Monsters"],
  },
  {
    output: "Spirit Monster Cards",
    aliases: ["Spirit Monster Cards", "Spirit Monsters"],
  },
  {
    output: "Toon Monster Cards",
    aliases: ["Toon Monster Cards", "Toon Monsters"],
  },
  {
    output: "Union Monster Cards",
    aliases: ["Union Monster Cards", "Union Monsters"],
  },
  {
    output: "Gemini Monster Cards",
    aliases: ["Gemini Monster Cards", "Gemini Monsters"],
  },
  {
    output: "Tuner Monster Cards",
    aliases: ["Tuner Monster Cards", "Tuner Monsters"],
  },
  {
    output: "Flip Monster Cards",
    aliases: ["Flip Monster Cards", "Flip Monsters"],
  },
  {
    output: "Spell Cards",
    aliases: ["Spell Cards"],
  },
  {
    output: "Trap Cards",
    aliases: ["Trap Cards"],
  },
];

function decodeHtmlEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function htmlToText(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/h\d>/gi, "\n")
      .replace(/<[^>]+>/g, "\n")
  );
}

function normalizeLine(line) {
  return line
    .replace(/\r/g, "")
    .replace(/^[•\-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/:\s*$/g, "")
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

  if (!line) return true;
  if (line.length <= 1) return true;

  const noisyFragments = [
    "steam community",
    "sign in",
    "install steam",
    "created by",
    "favorite",
    "favorited",
    "unfavorite",
    "share",
    "guide index",
    "comments",
    "rate",
    "award",
    "store page",
    "posted",
    "updated",
    "overview",
    "ctrl+f is your friend",
    "problems? something missing or misplaced?",
    "i can't find the card i want",
    "other guide version",
    "all rights reserved",
    "privacy policy",
    "steam subscriber agreement",
    "view desktop website",
    "change language",
  ];

  return noisyFragments.some((fragment) => lower.includes(fragment));
}

function getMatchingPackName(line) {
  return knownPackNames.find(
    (packName) => packName.toLowerCase() === line.toLowerCase()
  );
}

function getMatchingCategoryName(line) {
  const normalizedLine = line.toLowerCase();

  for (const category of categoryAliases) {
    const match = category.aliases.some(
      (alias) => alias.toLowerCase() === normalizedLine
    );

    if (match) {
      return category.output;
    }
  }

  return undefined;
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
    notes: `Generated from the Steam guide. Listed in the ${packName} pack under ${cardCategory}.`,
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

function buildImportReport(cardSources) {
  const packCounts = new Map();
  const categoryCounts = new Map();
  let multiSourceCardCount = 0;

  for (const entry of cardSources.values()) {
    if (entry.sources.length > 1) {
      multiSourceCardCount += 1;
    }

    entry.sources.forEach((source) => {
      packCounts.set(source.packName, (packCounts.get(source.packName) ?? 0) + 1);
      categoryCounts.set(
        source.cardCategory,
        (categoryCounts.get(source.cardCategory) ?? 0) + 1
      );
    });
  }

  const packs = Array.from(packCounts.entries())
    .map(([packName, count]) => ({ packName, count }))
    .sort((a, b) => b.count - a.count || a.packName.localeCompare(b.packName));

  const categories = Array.from(categoryCounts.entries())
    .map(([categoryName, count]) => ({ categoryName, count }))
    .sort(
      (a, b) => b.count - a.count || a.categoryName.localeCompare(b.categoryName)
    );

  const cardsWithMultipleSources = Array.from(cardSources.values())
    .filter((entry) => entry.sources.length > 1)
    .map((entry) => ({
      name: entry.displayName,
      sourceCount: entry.sources.length,
      sources: entry.sources.map((source) => ({
        packName: source.packName,
        cardCategory: source.cardCategory,
      })),
    }))
    .sort((a, b) => b.sourceCount - a.sourceCount || a.name.localeCompare(b.name));

  return {
    generatedAt: new Date().toISOString(),
    sourceUrl: steamGuideUrl,
    totalUniqueCards: cardSources.size,
    detectedPackCount: packs.length,
    detectedCategoryCount: categories.length,
    cardsWithMultipleSourcesCount: multiSourceCardCount,
    packs,
    categories,
    cardsWithMultipleSources,
  };
}

function printImportReport(report) {
  console.log("");
  console.log("Import report");
  console.log("-------------");
  console.log(`Generated unique cards: ${report.totalUniqueCards}`);
  console.log(`Detected packs: ${report.detectedPackCount}`);
  console.log(`Detected categories: ${report.detectedCategoryCount}`);
  console.log(
    `Cards with multiple sources: ${report.cardsWithMultipleSourcesCount}`
  );

  console.log("");
  console.log("Top packs:");
  report.packs.slice(0, 10).forEach((pack, index) => {
    console.log(`${index + 1}. ${pack.packName}: ${pack.count} cards`);
  });

  console.log("");
  console.log("Top categories:");
  report.categories.slice(0, 10).forEach((category, index) => {
    console.log(`${index + 1}. ${category.categoryName}: ${category.count} cards`);
  });

  console.log("");
  console.log(
    "Full report saved at data/cardGameSources.importReport.json"
  );
}

async function fetchSteamGuideText() {
  console.log(`Fetching Steam guide: ${steamGuideUrl}`);

  const response = await fetch(steamGuideUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; YuGiOhMetaDecksImporter/1.0; +https://vercel.app)",
    },
  });

  if (!response.ok) {
    throw new Error(`Steam request failed with status ${response.status}`);
  }

  const html = await response.text();
  const text = htmlToText(html);

  fs.writeFileSync(rawOutputFilePath, text, "utf8");

  return text;
}

async function main() {
  const rawText = await fetchSteamGuideText();
  const cardSources = parseGuideText(rawText);
  const output = generateTypeScript(cardSources);
  const report = buildImportReport(cardSources);

  fs.writeFileSync(outputFilePath, output, "utf8");
  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  console.log(
    `Generated ${cardSources.size} card source mappings at data/cardGameSources.generated.ts`
  );

  console.log(
    `Saved fetched guide text at data/legacyOfDuelistGuideRaw.txt for debugging`
  );

  printImportReport(report);

  if (cardSources.size === 0) {
    console.log("");
    console.log("No cards were generated.");
    console.log("Steam may have changed the page format or blocked the request.");
  }
}

main().catch((error) => {
  console.error("Import failed.");
  console.error(error);
  process.exit(1);
});
import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const targetDate = "2021-03-15";
const displayDate = "03-15-2021";
const listName = "March 2021 TCG Forbidden & Limited List";

const sourceUrl = `https://www.db.yugioh-card.com/yugiohdb/forbidden_limited.action?forbiddenLimitedDate=${targetDate}&request_locale=en`;

const outputFilePath = path.join(projectRoot, "data", "banlist.generated.ts");
const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "banlist.importReport.json"
);

const sections = [
  {
    id: "list_forbidden",
    status: "forbidden",
    label: "Forbidden",
    allowedCopies: 0,
  },
  {
    id: "list_limited",
    status: "limited",
    label: "Limited",
    allowedCopies: 1,
  },
  {
    id: "list_semi_limited",
    status: "semi-limited",
    label: "Semi-Limited",
    allowedCopies: 2,
  },
];

function escapeString(value) {
  return JSON.stringify(value);
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtml(String(value ?? "").replace(/<[^>]+>/g, " "));
}

function normalizeCardName(name) {
  return String(name ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLookupName(name) {
  return normalizeCardName(name)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”"]/g, "")
    .replace(/[–—]/g, "-")
    .trim();
}

function isLikelyCardName(name) {
  if (!name) {
    return false;
  }

  if (name.length < 2 || name.length > 120) {
    return false;
  }

  const excluded = new Set([
    "forbidden",
    "limited",
    "semi-limited",
    "semi limited",
    "unlimited",
    "monster",
    "spell",
    "trap",
    "monster cards",
    "spell cards",
    "trap cards",
  ]);

  return !excluded.has(name.toLowerCase());
}

async function fetchHtml() {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; YuGiOhMetaDecksBanlistImporter/1.0)",
      "Accept-Language": "en-US,en;q=0.9",
      Accept: "text/html,application/xhtml+xml,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${sourceUrl}: ${response.status}`);
  }

  return response.text();
}

function getSelectedDateFromHtml(html) {
  return (
    html.match(/<option value="([^"]+)" selected/i)?.[1] ??
    html.match(/<option selected[^>]*value="([^"]+)"/i)?.[1] ??
    null
  );
}

function getSectionHtml(html, sectionId) {
  const startPattern = new RegExp(
    `<div\\s+id="${sectionId}"[\\s\\S]*?>`,
    "i"
  );

  const startMatch = startPattern.exec(html);

  if (!startMatch) {
    throw new Error(`Could not find section id: ${sectionId}`);
  }

  const startIndex = startMatch.index;

  const nextSectionIndexes = sections
    .filter((section) => section.id !== sectionId)
    .map((section) => html.indexOf(`id="${section.id}"`, startIndex + 1))
    .filter((index) => index > startIndex);

  const releaseIndex = html.indexOf('id="list_release_of_restricted"', startIndex + 1);
  const footerIndex = html.indexOf("<footer", startIndex + 1);

  const endCandidates = [
    ...nextSectionIndexes,
    releaseIndex > startIndex ? releaseIndex : null,
    footerIndex > startIndex ? footerIndex : null,
    html.length,
  ].filter((index) => index !== null);

  const endIndex = Math.min(...endCandidates);

  return html.slice(startIndex, endIndex);
}

function extractCardNames(sectionHtml) {
  const names = [];

  const rowPattern =
    /<div[^>]*class="[^"]*\bt_row\b[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*\bt_row\b|<\/div>\s*<\/div>\s*<\/div>|$)/gi;

  let rowMatch;

  while ((rowMatch = rowPattern.exec(sectionHtml)) !== null) {
    const rowHtml = rowMatch[1];

    const nameMatch = rowHtml.match(
      /<span[^>]*class="[^"]*\bname\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i
    );

    if (!nameMatch) {
      continue;
    }

    const name = normalizeCardName(stripHtml(nameMatch[1]));

    if (isLikelyCardName(name)) {
      names.push(name);
    }
  }

  if (names.length > 0) {
    return names;
  }

  const fallbackPattern =
    /<span[^>]*class="[^"]*\bname\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi;

  let fallbackMatch;

  while ((fallbackMatch = fallbackPattern.exec(sectionHtml)) !== null) {
    const name = normalizeCardName(stripHtml(fallbackMatch[1]));

    if (isLikelyCardName(name)) {
      names.push(name);
    }
  }

  return names;
}

function uniqueEntries(entries) {
  const entriesByName = new Map();

  entries.forEach((entry) => {
    const key = normalizeLookupName(entry.name);

    if (!entriesByName.has(key)) {
      entriesByName.set(key, entry);
    }
  });

  return Array.from(entriesByName.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

function buildEntries(html) {
  const entries = [];

  sections.forEach((section) => {
    const sectionHtml = getSectionHtml(html, section.id);
    const names = extractCardNames(sectionHtml);

    names.forEach((name) => {
      entries.push({
        name,
        status: section.status,
        label: section.label,
        allowedCopies: section.allowedCopies,
      });
    });
  });

  return uniqueEntries(entries);
}

function formatEntry(entry) {
  return `  ${escapeString(entry.name)}: {
    name: ${escapeString(entry.name)},
    status: ${escapeString(entry.status)},
    label: ${escapeString(entry.label)},
    allowedCopies: ${entry.allowedCopies},
    listName: ${escapeString(listName)},
    effectiveDate: ${escapeString(targetDate)},
    sourceUrl: ${escapeString(sourceUrl)},
  }`;
}

function generateTypeScript(entries) {
  return `import type { BanlistInfo } from "../types/deck";

export const generatedBanlist: Record<string, BanlistInfo> = {
${entries.map(formatEntry).join(",\n\n")}
};
`;
}

function buildReport({ html, entries }) {
  const counts = entries.reduce((totals, entry) => {
    totals[entry.status] = (totals[entry.status] ?? 0) + 1;
    return totals;
  }, {});

  const importantCardNames = [
    "Pot of Greed",
    "Snatch Steal",
    "Graceful Charity",
    "Cyber Angel Benten",
    "Union Carrier",
    "True King of All Calamities",
    "Number S0: Utopic ZEXAL",
    "Called by the Grave",
    "Firewall Dragon",
  ];

  const importantCards = importantCardNames.map((cardName) => {
    const entry = entries.find(
      (item) => normalizeLookupName(item.name) === normalizeLookupName(cardName)
    );

    return {
      name: cardName,
      found: Boolean(entry),
      status: entry?.status ?? null,
      allowedCopies: entry?.allowedCopies ?? null,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    sourceUrl,
    listName,
    effectiveDate: targetDate,
    displayDate,
    selectedDateInHtml: getSelectedDateFromHtml(html),
    totalCards: entries.length,
    counts,
    importantCards,
    cards: entries,
  };
}

async function main() {
  console.log("");
  console.log("Importing Konami Yu-Gi-Oh banlist");
  console.log("---------------------------------");
  console.log(`Source: ${sourceUrl}`);

  const html = await fetchHtml();
  const entries = buildEntries(html);

  if (entries.length === 0) {
    throw new Error("No banlist entries were extracted.");
  }

  const report = buildReport({ html, entries });
  const output = generateTypeScript(entries);

  fs.writeFileSync(outputFilePath, output, "utf8");
  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Generated banlist data");
  console.log("----------------------");
  console.log(`Cards generated: ${report.totalCards}`);
  console.log(`Forbidden: ${report.counts.forbidden ?? 0}`);
  console.log(`Limited: ${report.counts.limited ?? 0}`);
  console.log(`Semi-limited: ${report.counts["semi-limited"] ?? 0}`);
  console.log("");
  console.log("Important card checks:");
  report.importantCards.forEach((card) => {
    console.log(
      `- ${card.name}: ${
        card.found ? `${card.status}, ${card.allowedCopies} allowed` : "not found"
      }`
    );
  });
  console.log("");
  console.log("Generated:");
  console.log("data/banlist.generated.ts");
  console.log("data/banlist.importReport.json");
}

main().catch((error) => {
  console.error("Banlist import failed.");
  console.error(error);
  process.exit(1);
});

import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const populationReportFilePath = path.join(
  projectRoot,
  "data",
  "deckPopulationReport.json"
);

const jsonOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckResearchQueue.json"
);

const csvOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckResearchQueue.csv"
);

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getPriority(status) {
  if (status === "missing-source-and-deck") {
    return 1;
  }

  if (status === "source-registered") {
    return 2;
  }

  if (status === "deck-without-registered-source") {
    return 3;
  }

  return 4;
}

function buildSearchQueries(year, targetName) {
  return [
    `${year} ${targetName} yugioh decklist`,
    `${year} ${targetName} YCS deck profile`,
    `${year} ${targetName} yugioh top deck`,
    `${targetName} ${year} format decklist`,
  ];
}

function buildSourceHints(year, targetName) {
  const encodedQuery = encodeURIComponent(`${year} ${targetName} yugioh decklist`);

  return {
    googleSearch: `https://www.google.com/search?q=${encodedQuery}`,
    yugiohTopDecksSearch: `https://www.google.com/search?q=${encodeURIComponent(
      `${year} ${targetName} site:yugiohtopdecks.org`
    )}`,
    konamiCoverageSearch: `https://www.google.com/search?q=${encodeURIComponent(
      `${year} ${targetName} site:yugiohblog.konami.com`
    )}`,
    formatLibrarySearch: `https://www.google.com/search?q=${encodeURIComponent(
      `${year} ${targetName} site:formatlibrary.com`
    )}`,
    ygoprodeckSearch: `https://ygoprodeck.com/?s=${encodeURIComponent(
      `${year} ${targetName}`
    )}`,
  };
}

function buildQueue(populationReport) {
  const items = [];

  populationReport.years.forEach((yearReport) => {
    yearReport.targets.forEach((target) => {
      if (target.status === "imported") {
        return;
      }

      items.push({
        id: `${yearReport.year}-${slugify(target.targetName)}`,
        year: yearReport.year,
        targetName: target.targetName,
        populationStatus: target.status,
        priority: getPriority(target.status),
        sourceCount: target.sourceCount,
        deckCount: target.deckCount,
        searchQueries: buildSearchQueries(yearReport.year, target.targetName),
        sourceHints: buildSourceHints(yearReport.year, target.targetName),
      });
    });
  });

  return items.sort(
    (a, b) =>
      a.priority - b.priority ||
      a.year - b.year ||
      a.targetName.localeCompare(b.targetName)
  );
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function buildCsv(queue) {
  const rows = [
    [
      "id",
      "year",
      "targetName",
      "populationStatus",
      "priority",
      "sourceCount",
      "deckCount",
      "primarySearchQuery",
      "googleSearch",
      "yugiohTopDecksSearch",
      "konamiCoverageSearch",
      "formatLibrarySearch",
      "ygoprodeckSearch",
    ],
  ];

  queue.forEach((item) => {
    rows.push([
      item.id,
      item.year,
      item.targetName,
      item.populationStatus,
      item.priority,
      item.sourceCount,
      item.deckCount,
      item.searchQueries[0],
      item.sourceHints.googleSearch,
      item.sourceHints.yugiohTopDecksSearch,
      item.sourceHints.konamiCoverageSearch,
      item.sourceHints.formatLibrarySearch,
      item.sourceHints.ygoprodeckSearch,
    ]);
  });

  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function printReport(queue) {
  const byYear = new Map();

  queue.forEach((item) => {
    byYear.set(item.year, (byYear.get(item.year) ?? 0) + 1);
  });

  console.log("");
  console.log("Deck research queue");
  console.log("-------------------");
  console.log(`Queue items: ${queue.length}`);

  console.log("");
  console.log("Items by year:");
  Array.from(byYear.entries())
    .sort(([yearA], [yearB]) => yearA - yearB)
    .forEach(([year, count]) => {
      console.log(`${year}: ${count}`);
    });

  console.log("");
  console.log("First 10 queue items:");
  queue.slice(0, 10).forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.year} ${item.targetName} (${item.populationStatus})`
    );
  });

  console.log("");
  console.log("Generated:");
  console.log("data/deckResearchQueue.json");
  console.log("data/deckResearchQueue.csv");
}

function main() {
  const populationReport = readJsonFile(populationReportFilePath);
  const queue = buildQueue(populationReport);

  fs.writeFileSync(jsonOutputFilePath, JSON.stringify(queue, null, 2), "utf8");
  fs.writeFileSync(csvOutputFilePath, buildCsv(queue), "utf8");

  printReport(queue);
}

main();
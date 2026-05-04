import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const registryFilePath = path.join(projectRoot, "data", "deckSourceRegistry.json");

const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceParseStatusReport.json"
);

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function groupByParseStatus(sources) {
  return sources.reduce((groups, source) => {
    const parseStatus = source.parseStatus ?? "unknown";

    if (!groups[parseStatus]) {
      groups[parseStatus] = [];
    }

    groups[parseStatus].push(source);
    return groups;
  }, {});
}

function buildReport(sources) {
  const groupedSources = groupByParseStatus(sources);

  const statusCounts = Object.fromEntries(
    Object.entries(groupedSources).map(([status, grouped]) => [
      status,
      grouped.length,
    ])
  );

  return {
    generatedAt: new Date().toISOString(),
    totalSources: sources.length,
    statusCounts,
    statuses: groupedSources,
  };
}

function printReport(report) {
  console.log("");
  console.log("Deck source parse status report");
  console.log("-------------------------------");
  console.log(`Total sources: ${report.totalSources}`);

  console.log("");
  console.log("Parse statuses:");
  Object.entries(report.statusCounts)
    .sort(([statusA], [statusB]) => statusA.localeCompare(statusB))
    .forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });

  console.log("");
  console.log("Parseable sources:");
  (report.statuses.parseable ?? []).forEach((source) => {
    console.log(`- ${source.year} ${source.target}: ${source.label}`);
  });

  console.log("");
  console.log("Needs fallback:");
  ["blocked-or-empty", "fetch-failed", "reference-only", "unknown"].forEach(
    (status) => {
      const sources = report.statuses[status] ?? [];

      if (sources.length === 0) {
        return;
      }

      console.log("");
      console.log(`${status}:`);
      sources.forEach((source) => {
        console.log(`- ${source.year} ${source.target}: ${source.label}`);
      });
    }
  );

  console.log("");
  console.log("Full report saved at data/deckSourceParseStatusReport.json");
}

function main() {
  const registry = readJsonFile(registryFilePath, { sources: [] });
  const sources = registry.sources ?? [];
  const report = buildReport(sources);

  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  printReport(report);
}

main();
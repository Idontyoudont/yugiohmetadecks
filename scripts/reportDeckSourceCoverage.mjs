import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const targetsFilePath = path.join(projectRoot, "data", "metaDeckTargets.json");
const sourceRegistryFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceRegistry.json"
);
const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceCoverageReport.json"
);

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sourceMatchesTarget(source, year, target) {
  return (
    source.year === year &&
    normalizeText(source.target) === normalizeText(target)
  );
}

function buildReport(targetConfig, sourceRegistry) {
  const sources = sourceRegistry.sources ?? [];

  const years = targetConfig.years.map((yearConfig) => {
    const targetReports = yearConfig.targets.map((targetName) => {
      const matchingSources = sources.filter((source) =>
        sourceMatchesTarget(source, yearConfig.year, targetName)
      );

      return {
        targetName,
        hasSource: matchingSources.length > 0,
        sources: matchingSources,
      };
    });

    const sourcedTargetCount = targetReports.filter(
      (target) => target.hasSource
    ).length;

    const missingSourceCount = Math.max(
      targetConfig.targetDecksPerYear - sourcedTargetCount,
      0
    );

    return {
      year: yearConfig.year,
      targetDecksPerYear: targetConfig.targetDecksPerYear,
      configuredTargetCount: yearConfig.targets.length,
      sourcedTargetCount,
      missingSourceCount,
      targets: targetReports,
    };
  });

  const totalTargetSlots =
    (targetConfig.endYear - targetConfig.startYear + 1) *
    targetConfig.targetDecksPerYear;

  const sourcedTargetSlots = years.reduce(
    (total, year) => total + year.sourcedTargetCount,
    0
  );

  const sourceStatusCounts = sources.reduce((counts, source) => {
    const status = source.status ?? "unknown";
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});

  const sourceTypeCounts = sources.reduce((counts, source) => {
    const sourceType = source.sourceType ?? "unknown";
    counts[sourceType] = (counts[sourceType] ?? 0) + 1;
    return counts;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    startYear: targetConfig.startYear,
    endYear: targetConfig.endYear,
    targetDecksPerYear: targetConfig.targetDecksPerYear,
    totalYears: targetConfig.endYear - targetConfig.startYear + 1,
    totalTargetSlots,
    sourcedTargetSlots,
    missingSourceSlots: totalTargetSlots - sourcedTargetSlots,
    registeredSourceCount: sources.length,
    sourceStatusCounts,
    sourceTypeCounts,
    years,
  };
}

function printReport(report) {
  console.log("");
  console.log("Deck source coverage report");
  console.log("---------------------------");
  console.log(`Range: ${report.startYear}–${report.endYear}`);
  console.log(`Years: ${report.totalYears}`);
  console.log(`Target decks per year: ${report.targetDecksPerYear}`);
  console.log(`Total target slots: ${report.totalTargetSlots}`);
  console.log(`Registered sources: ${report.registeredSourceCount}`);
  console.log(`Sourced target slots: ${report.sourcedTargetSlots}`);
  console.log(`Missing source slots: ${report.missingSourceSlots}`);

  console.log("");
  console.log("Source statuses:");
  Object.entries(report.sourceStatusCounts).forEach(([status, count]) => {
    console.log(`${status}: ${count}`);
  });

  console.log("");
  console.log("Source types:");
  Object.entries(report.sourceTypeCounts).forEach(([sourceType, count]) => {
    console.log(`${sourceType}: ${count}`);
  });

  console.log("");
  console.log("Year source coverage:");
  report.years.forEach((year) => {
    console.log(
      `${year.year}: ${year.sourcedTargetCount}/${year.targetDecksPerYear} targets have registered sources`
    );
  });

  console.log("");
  console.log("Full report saved at data/deckSourceCoverageReport.json");
}

function main() {
  const targetConfig = readJsonFile(targetsFilePath, null);
  const sourceRegistry = readJsonFile(sourceRegistryFilePath, { sources: [] });

  if (!targetConfig) {
    console.error(`Missing target file: ${targetsFilePath}`);
    process.exit(1);
  }

  const report = buildReport(targetConfig, sourceRegistry);

  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  printReport(report);
}

main();
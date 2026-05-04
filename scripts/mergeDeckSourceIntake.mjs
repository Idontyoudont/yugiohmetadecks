import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const intakeFilePath = path.join(projectRoot, "data", "deckSourceIntake.json");
const registryFilePath = path.join(projectRoot, "data", "deckSourceRegistry.json");

const validStatuses = new Set([
  "manual-existing",
  "source-registered",
  "imported",
  "needs-review",
]);

const validSourceTypes = new Set([
  "manual",
  "blog",
  "event-archive",
  "official-event-coverage",
  "format-reference",
  "deck-database",
  "video",
  "other",
]);

const validParseStatuses = new Set([
  "parseable",
  "reference-only",
  "blocked-or-empty",
  "fetch-failed",
  "unknown",
]);

function normalizeText(value) {
  return String(value ?? "")
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

function getSourceKey(source) {
  return [
    source.year,
    normalizeText(source.target),
    normalizeText(source.label),
    normalizeText(source.player),
    normalizeText(source.url),
  ].join("|");
}

function validateSource(source, index) {
  const errors = [];

  if (!source.year || !Number.isInteger(source.year)) {
    errors.push(`Source ${index + 1}: year must be a number.`);
  }

  if (!source.target) {
    errors.push(`Source ${index + 1}: target is required.`);
  }

  if (!source.status) {
    errors.push(`Source ${index + 1}: status is required.`);
  }

  if (source.status && !validStatuses.has(source.status)) {
    errors.push(
      `Source ${index + 1}: status must be one of ${Array.from(validStatuses).join(", ")}.`
    );
  }

  if (!source.sourceType) {
    errors.push(`Source ${index + 1}: sourceType is required.`);
  }

  if (source.sourceType && !validSourceTypes.has(source.sourceType)) {
    errors.push(
      `Source ${index + 1}: sourceType must be one of ${Array.from(validSourceTypes).join(", ")}.`
    );
  }

  if (!source.parseStatus) {
    errors.push(`Source ${index + 1}: parseStatus is required.`);
  }

  if (source.parseStatus && !validParseStatuses.has(source.parseStatus)) {
    errors.push(
      `Source ${index + 1}: parseStatus must be one of ${Array.from(validParseStatuses).join(", ")}.`
    );
  }

  if (!source.label) {
    errors.push(`Source ${index + 1}: label is required.`);
  }

  if (source.sourceType !== "manual" && !source.url) {
    errors.push(`Source ${index + 1}: url is required unless sourceType is manual.`);
  }

  return errors;
}

function sortSources(sources) {
  return sources.sort(
    (a, b) =>
      a.year - b.year ||
      String(a.target).localeCompare(String(b.target)) ||
      String(a.label).localeCompare(String(b.label))
  );
}

function main() {
  const registry = readJsonFile(registryFilePath, { sources: [] });
  const intake = readJsonFile(intakeFilePath, { sources: [] });

  const intakeSources = intake.sources ?? [];
  const validationErrors = intakeSources.flatMap(validateSource);

  if (validationErrors.length > 0) {
    console.error("");
    console.error("Deck source intake validation failed:");
    validationErrors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
  }

  const existingKeys = new Set((registry.sources ?? []).map(getSourceKey));
  const newSources = [];
  const skippedSources = [];

  intakeSources.forEach((source) => {
    const key = getSourceKey(source);

    if (existingKeys.has(key)) {
      skippedSources.push(source);
      return;
    }

    existingKeys.add(key);
    newSources.push(source);
  });

  const mergedRegistry = {
    sources: sortSources([...(registry.sources ?? []), ...newSources]),
  };

  fs.writeFileSync(registryFilePath, JSON.stringify(mergedRegistry, null, 2), "utf8");
  fs.writeFileSync(intakeFilePath, JSON.stringify({ sources: [] }, null, 2), "utf8");

  console.log("");
  console.log("Deck source intake merge");
  console.log("------------------------");
  console.log(`Intake sources: ${intakeSources.length}`);
  console.log(`Added sources: ${newSources.length}`);
  console.log(`Skipped duplicate sources: ${skippedSources.length}`);

  if (newSources.length > 0) {
    console.log("");
    console.log("Added:");
    newSources.forEach((source) => {
      console.log(
        `- ${source.year} ${source.target}: ${source.label} (${source.parseStatus})`
      );
    });
  }

  console.log("");
  console.log("Updated data/deckSourceRegistry.json");
  console.log("Reset data/deckSourceIntake.json");
}

main();
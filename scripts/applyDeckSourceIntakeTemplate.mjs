import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const templateFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceIntakeTemplate.json"
);

const intakeFilePath = path.join(projectRoot, "data", "deckSourceIntake.json");

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function cleanSource(templateSource) {
  return {
    year: templateSource.year,
    target: templateSource.target,
    status: templateSource.status,
    sourceType: templateSource.sourceType,
    parseStatus: templateSource.parseStatus,
    label: templateSource.label,
    player: templateSource.player ?? null,
    deckType: templateSource.deckType,
    url: templateSource.url,
    notes: templateSource.notes ?? "",
  };
}

function isCompletedSource(templateSource) {
  return Boolean(
    templateSource.year &&
      templateSource.target &&
      templateSource.status &&
      templateSource.sourceType &&
      templateSource.parseStatus &&
      templateSource.label &&
      templateSource.url
  );
}

function main() {
  const template = readJsonFile(templateFilePath, null);

  if (!template) {
    console.error("");
    console.error("Missing deck source intake template.");
    console.error("Run this first:");
    console.error("node scripts/generateDeckSourceIntakeTemplate.mjs");
    process.exit(1);
  }

  const templateSources = template.sources ?? [];
  const completedSources = templateSources
    .filter(isCompletedSource)
    .map(cleanSource);

  const incompleteSources = templateSources.filter(
    (source) => !isCompletedSource(source)
  );

  const intake = readJsonFile(intakeFilePath, { sources: [] });

  const updatedIntake = {
    sources: [...(intake.sources ?? []), ...completedSources],
  };

  const updatedTemplate = {
    ...template,
    sources: incompleteSources,
  };

  fs.writeFileSync(intakeFilePath, JSON.stringify(updatedIntake, null, 2), "utf8");
  fs.writeFileSync(
    templateFilePath,
    JSON.stringify(updatedTemplate, null, 2),
    "utf8"
  );

  console.log("");
  console.log("Applied deck source intake template");
  console.log("-----------------------------------");
  console.log(`Template sources: ${templateSources.length}`);
  console.log(`Completed sources moved to intake: ${completedSources.length}`);
  console.log(`Incomplete sources left in template: ${incompleteSources.length}`);

  if (completedSources.length > 0) {
    console.log("");
    console.log("Moved:");
    completedSources.forEach((source) => {
      console.log(`- ${source.year} ${source.target}: ${source.label}`);
    });
  }

  console.log("");
  console.log("Updated:");
  console.log("data/deckSourceIntake.json");
  console.log("data/deckSourceIntakeTemplate.json");

  if (completedSources.length > 0) {
    console.log("");
    console.log("Next:");
    console.log("node scripts/mergeDeckSourceIntake.mjs");
  }
}

main();
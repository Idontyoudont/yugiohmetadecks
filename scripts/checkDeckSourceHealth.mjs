import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const registryFilePath = path.join(projectRoot, "data", "deckSourceRegistry.json");

const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceHealthReport.json"
);

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

async function checkUrl(source) {
  if (!source.url) {
    return {
      ...source,
      health: {
        checked: false,
        ok: false,
        status: null,
        statusText: null,
        error: "No URL registered",
      },
    };
  }

  try {
    const response = await fetch(source.url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; YuGiOhMetaDecksSourceChecker/1.0)",
      },
    });

    return {
      ...source,
      health: {
        checked: true,
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        error: null,
      },
    };
  } catch (error) {
    return {
      ...source,
      health: {
        checked: true,
        ok: false,
        status: null,
        statusText: null,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

async function main() {
  const registry = readJsonFile(registryFilePath, { sources: [] });
  const sources = registry.sources ?? [];

  console.log("");
  console.log("Checking deck source URLs");
  console.log("-------------------------");
  console.log(`Registered sources: ${sources.length}`);

  const checkedSources = [];

  for (const source of sources) {
    const checkedSource = await checkUrl(source);
    checkedSources.push(checkedSource);

    const statusLabel = checkedSource.health.ok
      ? "OK"
      : checkedSource.health.checked
        ? "FAILED"
        : "SKIPPED";

    console.log(
      `${statusLabel}: ${source.year} ${source.target} - ${source.label}`
    );
  }

  const okCount = checkedSources.filter((source) => source.health.ok).length;
  const failedCount = checkedSources.filter(
    (source) => source.health.checked && !source.health.ok
  ).length;
  const skippedCount = checkedSources.filter(
    (source) => !source.health.checked
  ).length;

  const report = {
    generatedAt: new Date().toISOString(),
    sourceCount: checkedSources.length,
    okCount,
    failedCount,
    skippedCount,
    sources: checkedSources,
  };

  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Deck source health report");
  console.log("-------------------------");
  console.log(`OK: ${okCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log("");
  console.log("Full report saved at data/deckSourceHealthReport.json");
}

main().catch((error) => {
  console.error("Source health check failed.");
  console.error(error);
  process.exit(1);
});
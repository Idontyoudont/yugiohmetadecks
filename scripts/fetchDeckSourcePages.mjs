import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const registryFilePath = path.join(projectRoot, "data", "deckSourceRegistry.json");

const cacheDirectoryPath = path.join(projectRoot, "data", "deckSourcePages");

const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckSourcePageFetchReport.json"
);

function slugify(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[’‘]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureCacheDirectory() {
  fs.mkdirSync(cacheDirectoryPath, { recursive: true });

  const gitkeepPath = path.join(cacheDirectoryPath, ".gitkeep");

  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, "", "utf8");
  }
}

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
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

function getCacheBaseName(source, index) {
  const parts = [
    String(source.year ?? "unknown"),
    slugify(source.target ?? "unknown-target"),
    slugify(source.player ?? source.label ?? `source-${index + 1}`),
  ].filter(Boolean);

  return parts.join("-");
}

async function fetchSource(source, index) {
  if (!source.url) {
    return {
      source,
      fetched: false,
      ok: false,
      status: null,
      statusText: null,
      htmlFile: null,
      textFile: null,
      htmlBytes: 0,
      textBytes: 0,
      error: "No URL registered",
    };
  }

  const baseName = getCacheBaseName(source, index);
  const htmlFilePath = path.join(cacheDirectoryPath, `${baseName}.html`);
  const textFilePath = path.join(cacheDirectoryPath, `${baseName}.txt`);

  try {
    const response = await fetch(source.url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; YuGiOhMetaDecksSourceFetcher/1.0)",
      },
    });

    const html = await response.text();
    const text = htmlToText(html);

    fs.writeFileSync(htmlFilePath, html, "utf8");
    fs.writeFileSync(textFilePath, text, "utf8");

    return {
      source,
      fetched: true,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      htmlFile: path.relative(projectRoot, htmlFilePath),
      textFile: path.relative(projectRoot, textFilePath),
      htmlBytes: Buffer.byteLength(html, "utf8"),
      textBytes: Buffer.byteLength(text, "utf8"),
      error: null,
    };
  } catch (error) {
    return {
      source,
      fetched: true,
      ok: false,
      status: null,
      statusText: null,
      htmlFile: null,
      textFile: null,
      htmlBytes: 0,
      textBytes: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  ensureCacheDirectory();

  const registry = readJsonFile(registryFilePath, { sources: [] });
  const sources = registry.sources ?? [];

  console.log("");
  console.log("Fetching deck source pages");
  console.log("--------------------------");
  console.log(`Registered sources: ${sources.length}`);

  const results = [];

  for (const [index, source] of sources.entries()) {
    const result = await fetchSource(source, index);
    results.push(result);

    const statusLabel = result.ok ? "OK" : result.fetched ? "FAILED" : "SKIPPED";

    console.log(
      `${statusLabel}: ${source.year} ${source.target} - ${source.label}`
    );
  }

  const okCount = results.filter((result) => result.ok).length;
  const failedCount = results.filter(
    (result) => result.fetched && !result.ok
  ).length;
  const skippedCount = results.filter((result) => !result.fetched).length;

  const report = {
    generatedAt: new Date().toISOString(),
    sourceCount: sources.length,
    okCount,
    failedCount,
    skippedCount,
    results,
  };

  fs.writeFileSync(reportOutputFilePath, JSON.stringify(report, null, 2), "utf8");

  console.log("");
  console.log("Deck source page fetch report");
  console.log("-----------------------------");
  console.log(`OK: ${okCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Skipped: ${skippedCount}`);
  console.log("");
  console.log("Cached pages saved locally in data/deckSourcePages/");
  console.log("Full report saved at data/deckSourcePageFetchReport.json");
}

main().catch((error) => {
  console.error("Deck source page fetch failed.");
  console.error(error);
  process.exit(1);
});
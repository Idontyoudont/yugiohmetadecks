import fs from "fs";
import path from "path";

const projectRoot = process.cwd();

const fetchReportFilePath = path.join(
  projectRoot,
  "data",
  "deckSourcePageFetchReport.json"
);

const outputFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceParsedCandidates.txt"
);

const reportOutputFilePath = path.join(
  projectRoot,
  "data",
  "deckSourceParsedCandidatesReport.json"
);

const parseableStatuses = new Set(["parseable", "unknown"]);

const stopLinePatterns = [
  /^this is the deck/i,
  /^more$/i,
  /^page on/i,
  /^powered by/i,
  /^comments?$/i,
  /^posted by/i,
  /^labels?:/i,
];

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readTextFile(relativeFilePath) {
  const filePath = path.join(projectRoot, relativeFilePath);

  if (!fs.existsSync(filePath)) {
    return "";
  }

  return fs.readFileSync(filePath, "utf8");
}

function normalizeLine(line) {
  return line.replace(/\r/g, "").replace(/\s+/g, " ").trim();
}

function isCardQuantityLine(line) {
  return /^[1-3]\s+["'A-Za-z0-9À-ÿ.:'’!,\-&/()]+/.test(line);
}

function isLikelyStopLine(line) {
  return stopLinePatterns.some((pattern) => pattern.test(line));
}

function shouldAttemptParse(source) {
  const parseStatus = source.parseStatus ?? "unknown";
  return parseableStatuses.has(parseStatus);
}

function normalizeCardNameForImport(cardName) {
  return cardName
    .replace(/\bXYZ\b/g, "Xyz")
    .replace(/\bDecree\b/g, "Royal Decree")
    .replace(
      /\bReturn from Different Dimension\b/g,
      "Return from the Different Dimension"
    )
    .trim();
}

function parseQuantityLine(line) {
  const match = line.match(/^([1-3])\s+(.+)$/);

  if (!match) {
    return null;
  }

  const quantity = Number(match[1]);
  const cardName = normalizeCardNameForImport(match[2]);

  if (!cardName) {
    return null;
  }

  return {
    quantity,
    cardName,
    originalLine: line,
  };
}

function extractCandidateLines(text) {
  const lines = text
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);

  const firstCardLineIndex = lines.findIndex(isCardQuantityLine);

  if (firstCardLineIndex === -1) {
    return [];
  }

  const candidateLines = [];

  for (let index = firstCardLineIndex; index < lines.length; index += 1) {
    const line = lines[index];

    if (isLikelyStopLine(line)) {
      break;
    }

    if (!isCardQuantityLine(line)) {
      continue;
    }

    const parsedLine = parseQuantityLine(line);

    if (parsedLine) {
      candidateLines.push(parsedLine);
    }
  }

  return candidateLines;
}

function countCards(cards) {
  return cards.reduce((total, card) => total + card.quantity, 0);
}

function takeCardsFromEndByCount(candidateLines, targetCount) {
  const selectedLines = [];
  let runningTotal = 0;

  for (let index = candidateLines.length - 1; index >= 0; index -= 1) {
    const line = candidateLines[index];
    const nextTotal = runningTotal + line.quantity;

    if (nextTotal > targetCount) {
      break;
    }

    selectedLines.unshift(line);
    runningTotal = nextTotal;

    if (runningTotal === targetCount) {
      break;
    }
  }

  return {
    selectedLines,
    selectedCount: runningTotal,
    remainingLines: candidateLines.slice(
      0,
      candidateLines.length - selectedLines.length
    ),
  };
}

function inferSections(candidateLines) {
  const totalCards = countCards(candidateLines);

  if (totalCards < 40) {
    return {
      mainDeck: candidateLines,
      extraDeck: [],
      sideDeck: [],
      confidence: "low",
      notes:
        "Fewer than 40 total cards were found, so all parsed lines were placed in Main Deck.",
    };
  }

  if (totalCards >= 70) {
    const sideSplit = takeCardsFromEndByCount(candidateLines, 15);
    const extraSplit = takeCardsFromEndByCount(sideSplit.remainingLines, 15);

    return {
      mainDeck: extraSplit.remainingLines,
      extraDeck: extraSplit.selectedLines,
      sideDeck: sideSplit.selectedLines,
      confidence:
        sideSplit.selectedCount === 15 && extraSplit.selectedCount === 15
          ? "high"
          : "medium",
      notes:
        "Sections were inferred from the end of a full tournament list: last 15 cards as Side Deck, previous 15 cards as Extra Deck, remaining cards as Main Deck.",
    };
  }

  if (totalCards >= 55) {
    const extraSplit = takeCardsFromEndByCount(candidateLines, 15);

    return {
      mainDeck: extraSplit.remainingLines,
      extraDeck: extraSplit.selectedLines,
      sideDeck: [],
      confidence: extraSplit.selectedCount === 15 ? "medium" : "low",
      notes:
        "Sections were inferred as a Main Deck plus 15-card Extra Deck. No Side Deck was inferred.",
    };
  }

  return {
    mainDeck: candidateLines,
    extraDeck: [],
    sideDeck: [],
    confidence: "medium",
    notes:
      "Only enough cards for a Main Deck were found, so all parsed lines were placed in Main Deck.",
  };
}

function formatDeckName(source) {
  if (source.player && source.label) {
    return `${source.deckType ?? source.target} ${source.label.replace(/^Top \d+\s+/i, "")}`;
  }

  return `${source.target} Candidate ${source.year}`;
}

function formatDeckStatus(source) {
  if (source.status === "imported") {
    return "complete";
  }

  return "draft";
}

function formatDeckBlock(source, sections) {
  const lines = [
    `Deck: ${formatDeckName(source)}`,
    `Year: ${source.year}`,
    "Format: Imported Format",
    `Status: ${formatDeckStatus(source)}`,
  ];

  if (source.label) {
    lines.push(`Source: ${source.label}`);
  }

  if (source.player) {
    lines.push(`Player: ${source.player}`);
  }

  if (source.deckType) {
    lines.push(`Deck Type: ${source.deckType}`);
  }

  if (source.url) {
    lines.push(`Source URL: ${source.url}`);
  }

  lines.push("");
  lines.push("Main Deck");
  sections.mainDeck.forEach((card) => {
    lines.push(`${card.quantity} ${card.cardName}`);
  });

  lines.push("");
  lines.push("Extra Deck");
  sections.extraDeck.forEach((card) => {
    lines.push(`${card.quantity} ${card.cardName}`);
  });

  lines.push("");
  lines.push("Side Deck");
  sections.sideDeck.forEach((card) => {
    lines.push(`${card.quantity} ${card.cardName}`);
  });

  return lines.join("\n");
}

function main() {
  const fetchReport = readJsonFile(fetchReportFilePath, null);

  if (!fetchReport) {
    console.error(`Missing fetch report: ${fetchReportFilePath}`);
    console.error("Run this first:");
    console.error("node scripts/fetchDeckSourcePages.mjs");
    process.exit(1);
  }

  const successfulResults = (fetchReport.results ?? []).filter(
    (result) => result.ok && result.textFile
  );

  const candidateReports = [];
  const deckBlocks = [];

  successfulResults.forEach((result) => {
    const parseStatus = result.source.parseStatus ?? "unknown";

    if (!shouldAttemptParse(result.source)) {
      candidateReports.push({
        source: result.source,
        textFile: result.textFile,
        parseStatus,
        skipped: true,
        skipReason: `Source parseStatus is ${parseStatus}. Parser only attempts parseable or unknown sources.`,
        candidateLineCount: 0,
        totalCardCount: 0,
        mainDeckCount: 0,
        extraDeckCount: 0,
        sideDeckCount: 0,
        confidence: "skipped",
        notes: "Source skipped before parsing.",
        candidateLines: [],
      });

      return;
    }

    const text = readTextFile(result.textFile);
    const candidateLines = extractCandidateLines(text);
    const sections = inferSections(candidateLines);

    if (candidateLines.length > 0) {
      deckBlocks.push(formatDeckBlock(result.source, sections));
    }

    candidateReports.push({
      source: result.source,
      textFile: result.textFile,
      parseStatus,
      skipped: false,
      skipReason: null,
      candidateLineCount: candidateLines.length,
      totalCardCount: countCards(candidateLines),
      mainDeckCount: countCards(sections.mainDeck),
      extraDeckCount: countCards(sections.extraDeck),
      sideDeckCount: countCards(sections.sideDeck),
      confidence: sections.confidence,
      notes: sections.notes,
      candidateLines,
    });
  });

  const output = deckBlocks.join("\n\n---\n\n");

  fs.writeFileSync(outputFilePath, output, "utf8");
  fs.writeFileSync(
    reportOutputFilePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        parsedSourceCount: candidateReports.length,
        attemptedSourceCount: candidateReports.filter(
          (candidate) => !candidate.skipped
        ).length,
        skippedSourceCount: candidateReports.filter(
          (candidate) => candidate.skipped
        ).length,
        candidateDeckCount: deckBlocks.length,
        candidates: candidateReports,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log("");
  console.log("Deck source candidate parser");
  console.log("----------------------------");
  console.log(`Parsed sources: ${candidateReports.length}`);
  console.log(
    `Attempted sources: ${candidateReports.filter((candidate) => !candidate.skipped).length}`
  );
  console.log(
    `Skipped sources: ${candidateReports.filter((candidate) => candidate.skipped).length}`
  );
  console.log(`Candidate decks found: ${deckBlocks.length}`);

  candidateReports.forEach((candidate, index) => {
    console.log("");
    console.log(`${index + 1}. ${candidate.source.year} ${candidate.source.target}`);
    console.log(`   Source: ${candidate.source.label}`);
    console.log(`   Parse status: ${candidate.parseStatus}`);

    if (candidate.skipped) {
      console.log(`   Skipped: ${candidate.skipReason}`);
      return;
    }

    console.log(`   Candidate lines: ${candidate.candidateLineCount}`);
    console.log(`   Total cards: ${candidate.totalCardCount}`);
    console.log(`   Main Deck: ${candidate.mainDeckCount}`);
    console.log(`   Extra Deck: ${candidate.extraDeckCount}`);
    console.log(`   Side Deck: ${candidate.sideDeckCount}`);
    console.log(`   Confidence: ${candidate.confidence}`);
  });

  console.log("");
  console.log("Generated:");
  console.log("data/deckSourceParsedCandidates.txt");
  console.log("data/deckSourceParsedCandidatesReport.json");
}

main();
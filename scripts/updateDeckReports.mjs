import { spawnSync } from "child_process";

const reportCommands = [
  {
    label: "Deck coverage report",
    command: "node",
    args: ["scripts/reportDeckCoverage.mjs"],
  },
  {
    label: "Deck source coverage report",
    command: "node",
    args: ["scripts/reportDeckSourceCoverage.mjs"],
  },
  {
    label: "Deck source parse status report",
    command: "node",
    args: ["scripts/reportDeckSourceParseStatus.mjs"],
  },
  {
    label: "Deck source health report",
    command: "node",
    args: ["scripts/checkDeckSourceHealth.mjs"],
  },
  {
    label: "Deck source page fetch report",
    command: "node",
    args: ["scripts/fetchDeckSourcePages.mjs"],
  },
  {
    label: "Deck population report",
    command: "node",
    args: ["scripts/reportDeckPopulation.mjs"],
  },
  {
    label: "Deck research queue",
    command: "node",
    args: ["scripts/generateDeckResearchQueue.mjs"],
  },
];

function runCommand({ label, command, args }) {
  console.log("");
  console.log(`Running: ${label}`);
  console.log("=".repeat(`Running: ${label}`.length));

  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    console.error("");
    console.error(`Failed: ${label}`);
    process.exit(result.status ?? 1);
  }
}

function main() {
  console.log("");
  console.log("Updating deck reports");
  console.log("---------------------");

  reportCommands.forEach(runCommand);

  console.log("");
  console.log("All deck reports updated successfully.");
  console.log("");
  console.log("Updated files:");
  console.log("- data/deckCoverageReport.json");
  console.log("- data/deckSourceCoverageReport.json");
  console.log("- data/deckSourceParseStatusReport.json");
  console.log("- data/deckSourceHealthReport.json");
  console.log("- data/deckSourcePageFetchReport.json");
  console.log("- data/deckPopulationReport.json");
  console.log("- data/deckPopulationReport.csv");
  console.log("- data/deckResearchQueue.json");
  console.log("- data/deckResearchQueue.csv");
}

main();
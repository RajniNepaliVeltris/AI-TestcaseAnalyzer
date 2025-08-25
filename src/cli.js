#!/usr/bin/env node

const { execSync } = require("child_process");
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log("Usage: qa-analyzer <command>");
  console.log("Commands:");
  console.log("  run      Run all tests");
  console.log("  analyze  Analyze test failures");
  console.log("  report   Generate AI failure analysis report");
  process.exit(1);
}

const command = args[0];

try {
  switch (command) {
    case "run":
      execSync("node src/run-all.js", { stdio: "inherit" });
      break;
    case "analyze":
      execSync("node src/ai-failure-analyzer.js", { stdio: "inherit" });
      break;
    case "report":
      execSync("node src/report-generator.js", { stdio: "inherit" });
      break;
    default:
      console.log(`Unknown command ${command}`);
      console.log("Available commands: run, analyze, report");
      process.exit(1);
  }
} catch (error) {
  console.error(`Error executing command: ${command}`);
  console.error(error.message);
  process.exit(1);
}
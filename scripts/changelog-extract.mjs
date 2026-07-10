#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extractSection, summarizeSection } from "./lib/changelog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const changelogPath = join(root, "CHANGELOG.md");

function main() {
  const args = process.argv.slice(2);
  const version = args.find((arg) => !arg.startsWith("-"));
  const summary = args.includes("--summary");
  const outIndex = args.findIndex((arg) => arg === "-o" || arg === "--out");
  const outputPath = outIndex === -1 ? undefined : args[outIndex + 1];

  if (!version) {
    console.error("usage: changelog-extract.mjs <version> [--summary] [-o <file>]");
    process.exit(2);
  }

  const body = extractSection(readFileSync(changelogPath, "utf8"), version);
  if (!body?.trim()) {
    console.error(`No CHANGELOG section for version "${version}".`);
    process.exit(1);
  }

  const notes = `${summary ? summarizeSection(body) : body}\n`;
  if (outputPath) writeFileSync(outputPath, notes, "utf8");
  else process.stdout.write(notes);
}

main();

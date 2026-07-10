#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  promoteUnreleased,
  unreleasedHasEntries,
} from "./lib/changelog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const changelogPath = join(root, "CHANGELOG.md");
const cliArgs = process.argv.slice(2);
const checkOnly = cliArgs.includes("--check");
const version = cliArgs.find((arg) => !arg.startsWith("-")) ?? process.env.npm_package_version;
const dateArg = cliArgs.find((arg) => arg.startsWith("--date="));
const date = dateArg?.slice("--date=".length) ?? new Date().toISOString().slice(0, 10);

if (!checkOnly && !version) {
  console.error("usage: changelog-release.mjs <version> [--date=YYYY-MM-DD]");
  process.exit(2);
}

try {
  const current = readFileSync(changelogPath, "utf8");
  if (checkOnly) {
    if (!unreleasedHasEntries(current)) throw new Error("Unreleased has no entries.");
    console.log("Unreleased has entries — ready to release.");
  } else {
    writeFileSync(changelogPath, promoteUnreleased(current, version, date), "utf8");
    console.log(`Promoted Unreleased to ${version} (${date}).`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const VERSION_HEADING = /^## \[([^\]]+)\]/;

export function parseSections(text) {
  const sections = [];
  let current;
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(VERSION_HEADING);
    if (match) {
      if (current) sections.push(finalize(current));
      current = { label: match[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(finalize(current));
  return sections;
}

function finalize(section) {
  return {
    label: section.label,
    body: section.lines.join("\n").replace(/^\n+/, "").replace(/\s+$/, ""),
  };
}

export function normalizeVersion(version) {
  return String(version).trim().replace(/^v/i, "");
}

export function extractSection(text, version) {
  const wanted = normalizeVersion(version);
  return (
    parseSections(text).find(
      (section) => normalizeVersion(section.label) === wanted,
    )?.body ?? null
  );
}

export function unreleasedHasEntries(text) {
  const body = extractSection(text, "Unreleased");
  return body !== null && /^\s*[-*]\s/m.test(body);
}

export function promoteUnreleased(text, version, date) {
  if (extractSection(text, "Unreleased") === null) {
    throw new Error("No `## [Unreleased]` section found.");
  }
  if (!unreleasedHasEntries(text)) {
    throw new Error("`## [Unreleased]` has no entries to release.");
  }
  if (extractSection(text, version) !== null) {
    throw new Error(`CHANGELOG already has a section for ${version}.`);
  }

  const empty = [
    "## [Unreleased]",
    "",
    "### Added",
    "",
    "### Changed",
    "",
    "### Fixed",
    "",
  ].join("\n");
  const result = text.replace(
    /^## \[Unreleased\][^\n]*$/m,
    `${empty}\n## [${version}] - ${date}`,
  );
  if (result === text) throw new Error("Failed to locate Unreleased heading.");
  return result;
}

export function summarizeSection(body) {
  const lines = [];
  for (const line of body.split(/\r?\n/)) {
    if (/^###\s+/.test(line) || /^-\s+/.test(line)) lines.push(line);
  }
  return lines.join("\n").trim();
}

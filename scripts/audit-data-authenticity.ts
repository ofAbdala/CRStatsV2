import fs from "fs";
import path from "path";

type FindingType =
  | "MOCK"
  | "PLACEHOLDER_NUMERIC"
  | "PLACEHOLDER_TEXT"
  | "RANDOM"
  | "TODO";

type Finding = {
  type: FindingType;
  file: string;
  line: number;
  match: string;
  ignored?: boolean;
  ignoreReason?: string;
};

const REPO_ROOT = process.cwd();

const SCAN_ROOTS = ["client/src/pages", "client/src/components", "client/src/lib", "server"].map(
  (p) => path.join(REPO_ROOT, p),
);

const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".json"]);

const IGNORE: Array<{ fileEndsWith: string; contains: string; reason: string }> = [
  // UI skeleton randomness is fine and not a user-facing "stat".
  {
    fileEndsWith: path.normalize("client/src/components/ui/sidebar.tsx"),
    contains: "Math.random",
    reason: "UI skeleton width randomness (not a product statistic).",
  },
];

function shouldIgnore(file: string, lineText: string): { ignored: boolean; reason?: string } {
  const normalized = path.normalize(file);
  for (const rule of IGNORE) {
    if (normalized.endsWith(rule.fileEndsWith) && lineText.includes(rule.contains)) {
      return { ignored: true, reason: rule.reason };
    }
  }
  return { ignored: false };
}

function* walkFiles(dir: string): Generator<string> {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      yield* walkFiles(fullPath);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    yield fullPath;
  }
}

function findInFile(file: string): Finding[] {
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  const results: Finding[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const line = lines[i];

    const ignore = shouldIgnore(file, line);

    const add = (type: FindingType, match: string) => {
      results.push({
        type,
        file: path.relative(REPO_ROOT, file),
        line: lineNo,
        match,
        ignored: ignore.ignored || undefined,
        ignoreReason: ignore.reason,
      });
    };

    // MOCK
    if (line.includes("from \"@/lib/mockData\"") || line.includes("from '@/lib/mockData'")) {
      add("MOCK", "@/lib/mockData import");
      continue;
    }
    if (line.includes("mockPlayer") || line.includes("mockBattles") || line.includes("mockGoals")) {
      add("MOCK", "mock* symbol usage");
      continue;
    }

    // RANDOM
    if (line.includes("Math.random(")) {
      add("RANDOM", "Math.random(");
      continue;
    }

    // PLACEHOLDER numeric
    if (/progress=\{\s*\d+\s*\}/.test(line)) {
      add("PLACEHOLDER_NUMERIC", line.trim());
      continue;
    }
    if (line.includes("player@example.com") || line.includes("+150") || line.includes("85%")) {
      add("PLACEHOLDER_NUMERIC", line.trim());
      continue;
    }

    // PLACEHOLDER text
    if (line.toLowerCase().includes("coming soon") || line.toLowerCase().includes("em breve")) {
      add("PLACEHOLDER_TEXT", line.trim());
      continue;
    }
    if (line.includes("PRO Feature Placeholder")) {
      add("PLACEHOLDER_TEXT", "PRO Feature Placeholder");
      continue;
    }

    // TODO/FIXME
    if (line.includes("TODO") || line.includes("FIXME")) {
      add("TODO", line.trim());
      continue;
    }
  }

  return results;
}

function groupBy<T extends string>(findings: Finding[], key: (f: Finding) => T) {
  const map = new Map<T, Finding[]>();
  for (const f of findings) {
    const k = key(f);
    const arr = map.get(k);
    if (arr) arr.push(f);
    else map.set(k, [f]);
  }
  return map;
}

function main() {
  const strict = process.argv.includes("--strict");
  const findings: Finding[] = [];

  for (const root of SCAN_ROOTS) {
    for (const file of walkFiles(root)) {
      findings.push(...findInFile(file));
    }
  }

  // Stable output order for diffs.
  findings.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line - b.line;
  });

  const byType = groupBy(findings, (f) => f.type);

  // Print as Markdown for easy pasting into docs/issues.
  console.log("# Data authenticity scan");
  console.log();
  console.log(`- roots: ${SCAN_ROOTS.map((p) => path.relative(REPO_ROOT, p)).join(", ")}`);
  console.log(`- findings: ${findings.length}`);
  console.log();

  for (const [type, items] of [...byType.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(`## ${type} (${items.length})`);
    console.log();
    for (const f of items) {
      const ignoreSuffix = f.ignored ? ` (ignored: ${f.ignoreReason})` : "";
      console.log(`- \`${f.file}:${f.line}\` - ${f.match}${ignoreSuffix}`);
    }
    console.log();
  }

  const actionable = findings.filter((f) => !f.ignored);
  const hasMockOrPlaceholder = actionable.some(
    (f) => f.type === "MOCK" || f.type.startsWith("PLACEHOLDER") || f.type === "RANDOM",
  );

  if (strict && hasMockOrPlaceholder) {
    // Non-zero exit so this can be used in CI / predeploy if desired.
    process.exitCode = 2;
  }
}

main();

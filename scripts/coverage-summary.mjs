import { readFile } from "node:fs/promises";

const file = "coverage/coverage-summary.json";
const summary = JSON.parse(await readFile(file, "utf8"));
const total = summary.total;
const rows = [
  ["Statements", total.statements],
  ["Branches", total.branches],
  ["Functions", total.functions],
  ["Lines", total.lines],
];
const markdown = [
  "## Coverage",
  "",
  "| Metric | Covered | Total | Percent |",
  "| --- | ---: | ---: | ---: |",
  ...rows.map(([name, metric]) => `| ${name} | ${metric.covered} | ${metric.total} | ${metric.pct}% |`),
  "",
  "Coverage artifact: `askflow-coverage-report` (7 days).",
].join("\n");

console.log(markdown);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
}

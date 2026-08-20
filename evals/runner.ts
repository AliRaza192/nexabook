#!/usr/bin/env node
/**
 * NexaBook Eval Runner
 *
 * Runs all evaluation suites and generates reports.
 *
 * Usage:
 *   npx tsx evals/runner.ts                    # Run all evals
 *   npx tsx evals/runner.ts --suite=nexabot     # Run specific suite
 *   npx tsx evals/runner.ts --report            # Generate report only
 */

import { runEval, generateReport, EvalCase } from "./framework/runner";
import { intentDetectionCases } from "./nexabot/intent-detection.eval";
import { ocrExtractionCases } from "./invoice-ocr/extraction-accuracy.eval";
import {
  duplicateDetectionCases,
  pricingSuggestionCases,
  anomalyDetectionCases,
} from "./smart-invoicing/suggestions.eval";
import * as fs from "fs";
import * as path from "path";

// Parse CLI args
const args = process.argv.slice(2);
const suiteArg = args.find((a) => a.startsWith("--suite="));
const suite = suiteArg ? suiteArg.split("=")[1] : null;
const reportOnly = args.includes("--report");

// Mock handler for demonstration (replace with real AI feature calls)
async function mockHandler(input: unknown): Promise<unknown> {
  // Simulate AI processing delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return input;
}

// Define eval suites
const suites: Array<{
  name: string;
  cases: EvalCase[];
  handler: (input: unknown) => Promise<unknown>;
}> = [
  {
    name: "nexabot/intent-detection",
    cases: intentDetectionCases,
    handler: mockHandler,
  },
  {
    name: "invoice-ocr/extraction-accuracy",
    cases: ocrExtractionCases,
    handler: mockHandler,
  },
  {
    name: "smart-invoicing/duplicate-detection",
    cases: duplicateDetectionCases,
    handler: mockHandler,
  },
  {
    name: "smart-invoicing/pricing-suggestions",
    cases: pricingSuggestionCases,
    handler: mockHandler,
  },
  {
    name: "smart-invoicing/anomaly-detection",
    cases: anomalyDetectionCases,
    handler: mockHandler,
  },
];

async function main() {
  console.log("🔍 NexaBook AI Eval Runner\n");

  const results = [];

  for (const s of suites) {
    if (suite && !s.name.includes(suite)) {
      continue;
    }

    console.log(`Running: ${s.name} (${s.cases.length} cases)...`);
    const report = await runEval(s.name, s.cases, s.handler);
    results.push(report);

    console.log(
      `  ✅ ${report.passed}/${report.totalCases} passed (${(
        report.averageScore * 100
      ).toFixed(1)}% avg score, ${report.averageLatency.toFixed(0)}ms avg latency)\n`
    );
  }

  // Generate combined report
  const totalCases = results.reduce((sum, r) => sum + r.totalCases, 0);
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0);
  const avgScore =
    results.reduce((sum, r) => sum + r.averageScore, 0) / results.length;

  console.log("📊 Overall Results:");
  console.log(`   Total Cases: ${totalCases}`);
  console.log(`   Passed: ${totalPassed}`);
  console.log(`   Pass Rate: ${((totalPassed / totalCases) * 100).toFixed(1)}%`);
  console.log(`   Avg Score: ${(avgScore * 100).toFixed(1)}%\n`);

  // Save individual reports
  const reportsDir = path.join(__dirname, "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  for (const report of results) {
    const reportPath = path.join(
      reportsDir,
      `${report.evalName.replace(/\//g, "-")}-report.md`
    );
    fs.writeFileSync(reportPath, generateReport(report));
    console.log(`📄 Report saved: ${reportPath}`);
  }

  // Save combined report
  const combinedReport = [
    "# NexaBook AI Eval Combined Report",
    "",
    `**Date:** ${new Date().toISOString()}`,
    "",
    "## Summary",
    "",
    `| Suite | Cases | Passed | Pass Rate | Avg Score |`,
    `|-------|-------|--------|-----------|-----------|`,
    ...results.map(
      (r) =>
        `| ${r.evalName} | ${r.totalCases} | ${r.passed} | ${(
          (r.passed / r.totalCases) *
          100
        ).toFixed(1)}% | ${(r.averageScore * 100).toFixed(1)}% |`
    ),
    "",
    `| **Total** | **${totalCases}** | **${totalPassed}** | **${(
      (totalPassed / totalCases) *
      100
    ).toFixed(1)}%** | **${(avgScore * 100).toFixed(1)}%** |`,
  ].join("\n");

  const combinedPath = path.join(reportsDir, "combined-report.md");
  fs.writeFileSync(combinedPath, combinedReport);
  console.log(`\n📄 Combined report saved: ${combinedPath}`);
}

main().catch(console.error);

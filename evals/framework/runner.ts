/**
 * Eval Framework for NexaBook AI Features
 *
 * Provides tools for running evaluation suites, scoring results,
 * and generating reports for AI feature quality measurement.
 */

export interface EvalCase {
  id: string;
  input: unknown;
  expected: unknown;
  tags: string[];
  description?: string;
}

export interface EvalResult {
  caseId: string;
  input: unknown;
  expected: unknown;
  actual: unknown;
  passed: boolean;
  score: number; // 0-1
  latency: number; // ms
  error?: string;
}

export interface EvalReport {
  evalName: string;
  totalCases: number;
  passed: number;
  failed: number;
  averageScore: number;
  averageLatency: number;
  results: EvalResult[];
  timestamp: string;
}

/**
 * Calculate similarity score between expected and actual values
 */
export function calculateScore(expected: unknown, actual: unknown): number {
  if (expected === actual) return 1;

  if (typeof expected === "string" && typeof actual === "string") {
    return stringSimilarity(expected, actual);
  }

  if (typeof expected === "number" && typeof actual === "number") {
    return numberSimilarity(expected, actual);
  }

  if (typeof expected === "object" && typeof actual === "object" && expected !== null && actual !== null) {
    return objectSimilarity(expected as Record<string, unknown>, actual as Record<string, unknown>);
  }

  return 0;
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function stringSimilarity(a: string, b: string): number {
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();

  if (aLower === bLower) return 1;

  const lenA = aLower.length;
  const lenB = bLower.length;
  const maxLen = Math.max(lenA, lenB);

  if (maxLen === 0) return 1;

  // Simple containment check
  if (aLower.includes(bLower) || bLower.includes(aLower)) {
    return 0.8;
  }

  // Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= lenA; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= lenB; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = aLower[i - 1] === bLower[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[lenA][lenB];
  return 1 - distance / maxLen;
}

/**
 * Calculate number similarity (percentage difference)
 */
function numberSimilarity(a: number, b: number): number {
  if (a === b) return 1;
  const max = Math.max(Math.abs(a), Math.abs(b));
  if (max === 0) return 1;
  const diff = Math.abs(a - b);
  return 1 - diff / max;
}

/**
 * Calculate object similarity (percentage of matching keys)
 */
function objectSimilarity(a: Record<string, unknown>, b: Record<string, unknown>): number {
  if (!a || !b) return 0;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  const allKeys = new Set([...keysA, ...keysB]);

  if (allKeys.size === 0) return 1;

  let matches = 0;
  for (const key of allKeys) {
    if (key in a && key in b) {
      const score = calculateScore(a[key], b[key]);
      if (score > 0.8) matches++;
    }
  }

  return matches / allKeys.size;
}

/**
 * Run an evaluation suite
 */
export async function runEval(
  evalName: string,
  testCases: EvalCase[],
  handler: (input: unknown) => Promise<unknown>
): Promise<EvalReport> {
  const results: EvalResult[] = [];

  for (const testCase of testCases) {
    const start = Date.now();
    let actual: unknown;
    let error: string | undefined;

    try {
      actual = await handler(testCase.input);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
      actual = null;
    }

    const latency = Date.now() - start;
    const score = error ? 0 : calculateScore(testCase.expected, actual);

    results.push({
      caseId: testCase.id,
      input: testCase.input,
      expected: testCase.expected,
      actual,
      passed: score >= 0.8,
      score,
      latency,
      error,
    });
  }

  const passed = results.filter((r) => r.passed).length;
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalLatency = results.reduce((sum, r) => sum + r.latency, 0);

  return {
    evalName,
    totalCases: results.length,
    passed,
    failed: results.length - passed,
    averageScore: results.length > 0 ? totalScore / results.length : 0,
    averageLatency: results.length > 0 ? totalLatency / results.length : 0,
    results,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generate a markdown report from eval results
 */
export function generateReport(report: EvalReport): string {
  const lines: string[] = [
    `# Eval Report: ${report.evalName}`,
    "",
    `**Date:** ${report.timestamp}`,
    "",
    "## Summary",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Total Cases | ${report.totalCases} |`,
    `| Passed | ${report.passed} |`,
    `| Failed | ${report.failed} |`,
    `| Pass Rate | ${((report.passed / report.totalCases) * 100).toFixed(1)}% |`,
    `| Average Score | ${(report.averageScore * 100).toFixed(1)}% |`,
    `| Average Latency | ${report.averageLatency.toFixed(0)}ms |`,
    "",
    "## Failed Cases",
    "",
  ];

  const failed = report.results.filter((r) => !r.passed);
  if (failed.length === 0) {
    lines.push("No failed cases!");
  } else {
    for (const r of failed) {
      lines.push(`### ${r.caseId}`);
      lines.push(`- Input: ${JSON.stringify(r.input)}`);
      lines.push(`- Expected: ${JSON.stringify(r.expected)}`);
      lines.push(`- Actual: ${JSON.stringify(r.actual)}`);
      lines.push(`- Score: ${(r.score * 100).toFixed(1)}%`);
      if (r.error) lines.push(`- Error: ${r.error}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function calculateKeywordOverlap(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const words2 = text2.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return 0;
  const overlap = words1.filter((w) => words2.includes(w)).length;
  return overlap / Math.max(words1.length, words2.length);
}

export function matchWithPatterns(
  bankDescription: string,
  patterns: Array<{ bankPattern: string; bookPattern: string; confidence: number }>
): { matched: boolean; bookPattern: string; confidence: number } | null {
  const bankWords = bankDescription
    .toLowerCase()
    .replace(/\d+/g, "")
    .replace(/[-/.,]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .sort()
    .join(" ");

  for (const pattern of patterns) {
    const similarity = calculateKeywordOverlap(bankWords, pattern.bankPattern);
    if (similarity > 0.6) {
      return {
        matched: true,
        bookPattern: pattern.bookPattern,
        confidence: Math.min(Math.round(similarity * pattern.confidence), 100),
      };
    }
  }

  return null;
}
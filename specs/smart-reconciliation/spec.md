# Smart Reconciliation — Feature Specification

## Goal
Make bank reconciliation smarter with AI-powered matching, confidence scoring, and pattern learning. Improve match rate beyond simple amount+date matching.

---

## User Scenarios

### Scenario 1: Fuzzy Description Matching
Bank statement says "HBL TRANSFER AHMED ALI". Book says "Payment from Ahmed Ali". Current system: no match (different descriptions). Smart system: Gemini analyzes both, finds "AHMED ALI" match, suggests pairing with 85% confidence.

### Scenario 2: Confidence Scoring
Each match shows a confidence score:
- 95%: Exact amount + exact date + similar description
- 75%: Exact amount + date within 2 days + partial description match
- 50%: Amount within 5% + date within 5 days
User can filter by confidence to review low-confidence matches first.

### Scenario 3: Pattern Learning
User manually matches "HBL FEE" with "Bank Service Charge". Next time, system auto-matches similar patterns. Learns that "HBL" = bank name, "FEE" = service charge.

### Scenario 4: Smart Suggestions
Unmatched bank items show AI suggestions: "This looks like a payment from Customer X (Rs. 50,000) based on similar past transactions."

---

## Functional Requirements

### FR-1: AI-Powered Description Matching
Use AI to analyze description similarity:
- **Input**: Bank description + Book description
- **Output**: Match score (0-100) + reasoning
- **Batch**: Process 10 items at a time (rate limit)
- **Fallback**: If AI fails, use keyword overlap scoring

### FR-2: Confidence Scoring
Assign confidence to each match:
- **Factors**: Amount match, date proximity, description similarity, past patterns
- **Range**: 0-100%
- **Thresholds**: Auto-match (>90%), Suggest (70-90%), Manual (<70%)
- **Display**: Color-coded badges (green/yellow/red)

### FR-3: Pattern Learning
Learn from manual matches:
- **Storage**: Save matched pairs (bank description pattern → book description pattern)
- **Matching**: Use past patterns to improve future matching
- **Persistence**: Store in database for long-term learning

### FR-4: Smart Suggestions for Unmatched Items
Suggest matches for unmatched bank items:
- **Algorithm**: Find book transactions with similar amount + description keywords
- **Ranking**: Sort by confidence score
- **Limit**: Top 3 suggestions per unmatched item

---

## Edge Cases

- **AI rate limit**: Queue items, process in batches
- **Ambiguous matches**: Show multiple suggestions, let user choose
- **No past patterns**: Fall back to amount+date matching
- **Very long descriptions**: Truncate to 200 chars for Gemini
- **Multiple currencies**: Only match same currency

---

## Out of Scope

- Real-time bank feed integration
- Automatic reconciliation (always requires user confirmation)
- Multi-bank reconciliation in single session
- Export reconciliation report

---

## Acceptance Criteria

- [ ] AI description matching improves match rate by 20%+
- [ ] Confidence scores are accurate (validated against manual matches)
- [ ] Pattern learning stores and retrieves past matches
- [ ] Smart suggestions show relevant matches for unmatched items
- [ ] All existing reconciliation functionality continues to work
- [ ] Gemini API calls are batched (10 at a time)

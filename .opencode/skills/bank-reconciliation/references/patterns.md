# Reconciliation Pattern Learning

## Pattern Record Structure
```
{
  id: uuid,
  orgId: string,
  bankPattern: string,    // extracted from bank description
  bookPattern: string,    // extracted from book entry
  matchType: string,      // MANUAL | AUTO
  confidence: number,     // 0-100
  matchCount: number,     // times this pattern matched
  lastUsed: timestamp,
  createdAt: timestamp
}
```

## Pattern Extraction
From bank description:
- Remove dates and numbers
- Keep keywords (transfer, payment, fee, etc.)
- Normalize case

From book entry:
- Extract transaction type
- Extract reference info
- Normalize format

## Pattern Matching
1. Exact match: bankPattern === bookPattern
2. Keyword match: shared keywords > 50%
3. Similarity: Levenshtein distance < 30%

## Learning Rules
- Only save patterns from confirmed matches
- Increment matchCount on each use
- Increase confidence with successful matches
- Decrease confidence on manual overrides
- Delete patterns with confidence < 30

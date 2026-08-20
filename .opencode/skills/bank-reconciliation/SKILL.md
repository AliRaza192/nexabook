---
name: bank-reconciliation
description: >
  Matches bank statement entries with book records, learns patterns, and finalizes reconciliation.
  Use when: "reconcile bank", "bank matching", "statement match", "bank reconciliation",
  "bank statement match karo", "reconciliation karo", "bank entries match".
  Do NOT use for: creating bank transfers, recording deposits, or bank account setup.
---

# Bank Reconciliation Skill

## Goal

Match bank statement entries (from CSV import or bank feed) with book records (journal entries, payments, deposits) to ensure accuracy and identify discrepancies. Learn patterns for future auto-matching.

## When to Use

- User wants to reconcile a bank account
- User imports a bank statement CSV
- User says "bank reconcile karo" or "statement match karo"
- User wants to see unmatched transactions

## Instructions

### Step 1: Import Bank Statement

If CSV import:
1. Parse CSV columns: Date, Description, Debit, Credit, Balance
2. Validate date format (DD/MM/YYYY or YYYY-MM-DD)
3. Validate amounts (numeric, positive)
4. Store in `bankStatements` table with status UNMATCHED
5. Link to `bankAccounts` table

If bank feed (Plaid/SaltEdge):
1. Fetch latest transactions
2. Auto-categorize using provider's categories
3. Store in `bankStatements` table

### Step 2: Auto-Match Transactions

Run matching algorithm:

**Exact Match (Confidence >90%):**
- Same amount AND same date (±1 day)
- Mark as MATCHED

**Fuzzy Match (Confidence 70-90%):**
- Same amount, date within 3 days
- Description contains matching keywords
- Mark as SUGGESTED (need user confirmation)

**Pattern Match (Confidence 60-80%):**
- Check `reconciliationPatterns` table
- Match against learned patterns
- Mark as PATTERN_MATCHED

**Unmatched:**
- No match found
- Mark as UNMATCHED
- Provide smart suggestions

### Step 3: Confidence Scoring

For each potential match, calculate:

```
Amount Score: 40%
- Exact match: 40 points
- Within 1%: 35 points
- Within 5%: 25 points
- Within 10%: 15 points

Date Score: 30%
- Same day: 30 points
- ±1 day: 25 points
- ±2 days: 18 points
- ±3 days: 10 points

Description Score: 30%
- Exact match: 30 points
- >80% similarity: 25 points
- >60% similarity: 18 points
- >40% similarity: 10 points
- Keywords match: 15 points
```

Total confidence = Amount Score + Date Score + Description Score

### Step 4: Smart Suggestions

For unmatched bank entries, suggest matches:
1. Find all book entries with same amount in ±7 days
2. Rank by confidence score
3. Show top 3 suggestions per unmatched entry
4. Include match reason (amount, date, description similarity)

### Step 5: Pattern Learning

When user confirms a match:
1. Extract pattern: description keywords, amount range, date pattern
2. Save to `reconciliationPatterns` table
3. Increase match count for existing patterns
4. Future matches use learned patterns

Pattern record:
```
- bankPattern: extracted from bank description
- bookPattern: extracted from book entry
- matchType: MANUAL | AUTO
- confidence: learned confidence
- matchCount: times this pattern matched
```

### Step 6: User Review

Present matches to user in three categories:
1. **Auto-Matched** — High confidence, review and confirm
2. **Suggested** — Medium confidence, select correct match
3. **Unmatched** — No match, create journal entry or mark as reconciled

### Step 7: Finalize Reconciliation

When all entries are matched or explained:
1. Verify: `bankBalance - bookBalance = 0` (after all matches)
2. Create reconciliation summary
3. Lock reconciled period (prevent changes)
4. Update `bankStatements` status to RECONCILED
5. Create audit log entry

### Step 8: Undo Reconciliation

If user needs to undo:
1. Check if period is locked
2. If locked, request admin approval
3. Revert all matches in the period
4. Set entries back to UNMATCHED
5. Log the undo action

## Edge Cases

- **Bank fees not in books:** Create journal entry for bank charges
- **Interest earned:** Create journal entry for interest income
- **Duplicate entries:** Flag and allow user to mark as DUPLICATE
- **Foreign currency:** Convert using exchange rate on transaction date
- **Opening balance mismatch:** Alert user, suggest opening balance correction
- **Partial matches:** Allow split matching (one bank entry → multiple book entries)

## References

- [Match Algorithms](references/match-algorithms.md)
- [Pattern Learning](references/patterns.md)

# Bank Reconciliation Match Algorithms

## Exact Match (Confidence: 90-100%)
- Amount matches exactly
- Date within ±1 day
- Auto-confirmed

## Fuzzy Match (Confidence: 70-89%)
- Amount within 1% OR exact
- Date within 3 days
- Description similarity >60%
- Needs user confirmation

## Pattern Match (Confidence: 60-79%)
- Learned from previous matches
- Matches known patterns
- Needs user confirmation

## Amount-Only Match (Confidence: 40-59%)
- Amount matches but date differs by >3 days
- Multiple candidates possible
- Needs user selection

## Confidence Calculation
```
Amount Score: 40 points max
- Exact: 40
- Within 1%: 35
- Within 5%: 25
- Within 10%: 15

Date Score: 30 points max
- Same day: 30
- ±1 day: 25
- ±2 days: 18
- ±3 days: 10

Description Score: 30 points max
- Exact: 30
- >80% similar: 25
- >60% similar: 18
- >40% similar: 10
```

## Thresholds
- Auto-match: ≥90
- Suggest: 70-89
- Manual: <70

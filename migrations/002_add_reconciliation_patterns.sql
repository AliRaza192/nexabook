-- Migration: Add reconciliation_patterns table for Smart Reconciliation pattern learning
-- Date: July 4, 2026

CREATE TABLE IF NOT EXISTS reconciliation_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  bank_pattern VARCHAR(500) NOT NULL,
  book_pattern VARCHAR(500) NOT NULL,
  match_count INTEGER NOT NULL DEFAULT 1,
  confidence DECIMAL(5,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for org-scoped queries
CREATE INDEX IF NOT EXISTS idx_reconciliation_patterns_org_id ON reconciliation_patterns(org_id);

-- Index for pattern matching
CREATE INDEX IF NOT EXISTS idx_reconciliation_patterns_bank ON reconciliation_patterns(org_id, bank_pattern);

-- Step 2d follow-up: Replace AFTER STATEMENT triggers with DEFERRABLE row-level trigger.
-- The immediate statement-level triggers required all callers to batch journal_entry_lines
-- inserts into a single .values([...]) call. 20 out of 27 call sites did NOT batch (one-by-one
-- in loops or sequential inserts), which caused false-positive trigger fires mid-transaction.
--
-- A DEFERRABLE INITIALLY DEFERRED row-level trigger validates balance at COMMIT time.
-- For each row INSERT/UPDATE/DELETE, it queries the table to check if the affected
-- journal_entry_id has balanced debits = credits. Because it is deferred, intermediate
-- unbalanced state within a transaction is allowed — only the final state at COMMIT matters.
--
-- The two CHECK constraints (chk_jel_no_both_zero, chk_jel_no_both_nonzero) remain
-- as immediate row-level constraints — those correctly reject individual bad rows.

-- 1. Drop the 3 immediate statement-level triggers and their functions
DROP TRIGGER IF EXISTS trg_check_journal_balance_insert ON journal_entry_lines;
DROP TRIGGER IF EXISTS trg_check_journal_balance_delete ON journal_entry_lines;
DROP TRIGGER IF EXISTS trg_check_journal_balance_update ON journal_entry_lines;

DROP FUNCTION IF EXISTS fn_check_journal_balance_insert();
DROP FUNCTION IF EXISTS fn_check_journal_balance_delete();
DROP FUNCTION IF EXISTS fn_check_journal_balance_update();

-- 2. Create deferred trigger function.
--    Uses NEW.journal_entry_id / OLD.journal_entry_id to find the affected JE,
--    then queries journal_entry_lines to check balance. At COMMIT time, all rows
--    from the transaction are visible, so this sees the final state.
CREATE OR REPLACE FUNCTION fn_check_journal_balance_deferred()
RETURNS TRIGGER AS $$
DECLARE
  target_je_id UUID;
  total_debit  NUMERIC;
  total_credit NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    target_je_id := NEW.journal_entry_id;
  ELSE
    target_je_id := OLD.journal_entry_id;
  END IF;

  SELECT
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO total_debit, total_credit
  FROM journal_entry_lines
  WHERE journal_entry_id = target_je_id;

  IF total_debit <> total_credit THEN
    RAISE EXCEPTION 'Journal entry % has unbalanced debits/credits: debit=% credit=%',
      target_je_id, total_debit, total_credit;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Create deferred row-level triggers (one per operation)
CREATE CONSTRAINT TRIGGER trg_check_journal_balance_deferred_insert
  AFTER INSERT ON journal_entry_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_journal_balance_deferred();

CREATE CONSTRAINT TRIGGER trg_check_journal_balance_deferred_delete
  AFTER DELETE ON journal_entry_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_journal_balance_deferred();

CREATE CONSTRAINT TRIGGER trg_check_journal_balance_deferred_update
  AFTER UPDATE ON journal_entry_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_journal_balance_deferred();

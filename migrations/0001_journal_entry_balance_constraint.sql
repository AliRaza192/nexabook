-- ACC-03 / Step 2d: DB-level enforcement of double-entry balancing
-- 1. No line may be both-zero or both-non-zero (debit and credit mutually exclusive)
-- 2. For each journal_entry_id: SUM(debit) = SUM(credit)
-- Table is empty at deployment time per runbook, so no data cleanup needed.

-- Guard: prevent both-zero lines (a line must have either a debit or a credit, not neither)
ALTER TABLE journal_entry_lines
  ADD CONSTRAINT chk_jel_no_both_zero
  CHECK (
    NOT (debit_amount = 0 AND credit_amount = 0)
  );

-- Guard: prevent both-non-zero lines (a line cannot have both debit and credit)
ALTER TABLE journal_entry_lines
  ADD CONSTRAINT chk_jel_no_both_nonzero
  CHECK (
    NOT (debit_amount > 0 AND credit_amount > 0)
  );

-- Statement-level balance check using transition tables.
-- FOR EACH ROW + AFTER fires per-row: on a multi-row INSERT the first
-- row already sees an unbalanced JE and throws, so we MUST use
-- FOR EACH STATEMENT with REFERENCING NEW TABLE to get all affected
-- journal_entry_ids in one shot.
--
-- Three separate triggers are needed because PostgreSQL transition
-- tables can only reference NEW TABLE (INSERT), OLD TABLE (DELETE),
-- or both (UPDATE).

CREATE OR REPLACE FUNCTION fn_check_journal_balance_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        jl.journal_entry_id,
        COALESCE(SUM(jl.debit_amount), 0)  AS total_debit,
        COALESCE(SUM(jl.credit_amount), 0) AS total_credit
      FROM journal_entry_lines jl
      INNER JOIN (SELECT DISTINCT journal_entry_id FROM new_tab) affected
        ON jl.journal_entry_id = affected.journal_entry_id
      GROUP BY jl.journal_entry_id
      HAVING COALESCE(SUM(jl.debit_amount), 0) <> COALESCE(SUM(jl.credit_amount), 0)
    ) unbalanced
  ) THEN
    RAISE EXCEPTION 'Journal entry has unbalanced debits/credits after INSERT';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_check_journal_balance_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        jl.journal_entry_id,
        COALESCE(SUM(jl.debit_amount), 0)  AS total_debit,
        COALESCE(SUM(jl.credit_amount), 0) AS total_credit
      FROM journal_entry_lines jl
      INNER JOIN (SELECT DISTINCT journal_entry_id FROM old_tab) affected
        ON jl.journal_entry_id = affected.journal_entry_id
      GROUP BY jl.journal_entry_id
      HAVING COALESCE(SUM(jl.debit_amount), 0) <> COALESCE(SUM(jl.credit_amount), 0)
    ) unbalanced
  ) THEN
    RAISE EXCEPTION 'Journal entry has unbalanced debits/credits after DELETE';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_check_journal_balance_update()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        jl.journal_entry_id,
        COALESCE(SUM(jl.debit_amount), 0)  AS total_debit,
        COALESCE(SUM(jl.credit_amount), 0) AS total_credit
      FROM journal_entry_lines jl
      INNER JOIN (
        SELECT DISTINCT journal_entry_id FROM old_tab
        UNION
        SELECT DISTINCT journal_entry_id FROM new_tab
      ) affected ON jl.journal_entry_id = affected.journal_entry_id
      GROUP BY jl.journal_entry_id
      HAVING COALESCE(SUM(jl.debit_amount), 0) <> COALESCE(SUM(jl.credit_amount), 0)
    ) unbalanced
  ) THEN
    RAISE EXCEPTION 'Journal entry has unbalanced debits/credits after UPDATE';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_journal_balance_insert
  AFTER INSERT ON journal_entry_lines
  REFERENCING NEW TABLE AS new_tab
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_check_journal_balance_insert();

CREATE TRIGGER trg_check_journal_balance_delete
  AFTER DELETE ON journal_entry_lines
  REFERENCING OLD TABLE AS old_tab
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_check_journal_balance_delete();

CREATE TRIGGER trg_check_journal_balance_update
  AFTER UPDATE ON journal_entry_lines
  REFERENCING OLD TABLE AS old_tab NEW TABLE AS new_tab
  FOR EACH STATEMENT
  EXECUTE FUNCTION fn_check_journal_balance_update();

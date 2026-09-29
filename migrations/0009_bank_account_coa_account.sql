-- W5.2: Bank-to-bank transfer wash entry fix.
-- Each bank account gets its own GL (chart_of_accounts) row so transfers
-- debit/credit distinct accounts instead of the shared "bank" account.

ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS coa_account_id uuid REFERENCES chart_of_accounts(id);

-- Backfill: create a dedicated asset account per existing bank account.
-- The account id is derived deterministically from the bank account id so
-- the subsequent UPDATE can link without a join key.
INSERT INTO chart_of_accounts (id, org_id, code, name, type, sub_type, is_system_account, description, is_active, balance)
SELECT
  (
    substr(md5(ba.id::text), 1, 8) || '-' ||
    substr(md5(ba.id::text), 9, 4) || '-4' ||
    substr(md5(ba.id::text), 13, 3) || '-a' ||
    substr(md5(ba.id::text), 17, 3) || '-' ||
    substr(md5(ba.id::text), 21, 12)
  )::uuid,
  ba.org_id,
  'BANK' || upper(substr(md5(ba.id::text), 1, 6)),
  'Bank - ' || ba.account_name,
  'asset',
  NULL,
  false,
  'Sub-ledger GL account for bank account ' || ba.account_number,
  true,
  '0'
FROM bank_accounts ba
WHERE ba.coa_account_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM chart_of_accounts c
    WHERE c.id = (
      (
        substr(md5(ba.id::text), 1, 8) || '-' ||
        substr(md5(ba.id::text), 9, 4) || '-4' ||
        substr(md5(ba.id::text), 13, 3) || '-a' ||
        substr(md5(ba.id::text), 17, 3) || '-' ||
        substr(md5(ba.id::text), 21, 12)
      )::uuid
    )
  );

UPDATE bank_accounts ba
SET coa_account_id = (
  (
    substr(md5(ba.id::text), 1, 8) || '-' ||
    substr(md5(ba.id::text), 9, 4) || '-4' ||
    substr(md5(ba.id::text), 13, 3) || '-a' ||
    substr(md5(ba.id::text), 17, 3) || '-' ||
    substr(md5(ba.id::text), 21, 12)
  )::uuid
)
WHERE ba.coa_account_id IS NULL;

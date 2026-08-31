-- Multi-currency support for journal entries (ACC-17/18)
-- Records the original currency and exchange rate at the time of posting.

ALTER TABLE journal_entries
  ADD COLUMN currency varchar(10) DEFAULT 'PKR',
  ADD COLUMN exchange_rate decimal(10,4) DEFAULT '1';

ALTER TABLE journal_entry_lines
  ADD COLUMN original_amount decimal(14,2),
  ADD COLUMN original_currency varchar(10);

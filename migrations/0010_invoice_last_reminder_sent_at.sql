-- Payment reminders were re-sent every day for the whole reminder window
-- (e.g. 3 days before + 7 days after due = 11 identical WhatsApp messages).
-- Tracks the last send so the cron can deduplicate per invoice.
ALTER TABLE invoices ADD COLUMN last_reminder_sent_at timestamp;

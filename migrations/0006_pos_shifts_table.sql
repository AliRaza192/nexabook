CREATE TYPE pos_shift_status AS ENUM ('open', 'closed');

CREATE TABLE pos_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  opening_amount decimal(12,2) NOT NULL DEFAULT '0',
  closing_amount decimal(12,2),
  opening_time timestamp NOT NULL DEFAULT now(),
  closing_time timestamp,
  expected_cash decimal(12,2),
  actual_cash decimal(12,2),
  variance decimal(12,2),
  status pos_shift_status NOT NULL DEFAULT 'open',
  opening_journal_entry_id uuid REFERENCES journal_entries(id),
  closing_journal_entry_id uuid REFERENCES journal_entries(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_shifts_org_profile_status ON pos_shifts(org_id, profile_id, status);
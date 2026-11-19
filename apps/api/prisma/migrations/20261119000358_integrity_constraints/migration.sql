-- Balance can never go negative, even if application code has a bug.
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_balance_non_negative" CHECK (balance >= 0);

-- Money movements always have a positive amount.
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_amount_positive" CHECK (amount > 0);
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_amount_positive" CHECK (amount > 0);

-- Each transaction type defines which sides exist:
-- DEPOSIT -> target only, WITHDRAWAL -> source only, TRANSFER -> both, distinct.
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accounts_by_type" CHECK (
  (type = 'DEPOSIT'    AND source_account_id IS NULL     AND target_account_id IS NOT NULL) OR
  (type = 'WITHDRAWAL' AND source_account_id IS NOT NULL AND target_account_id IS NULL) OR
  (type = 'TRANSFER'   AND source_account_id IS NOT NULL AND target_account_id IS NOT NULL
                       AND source_account_id <> target_account_id)
);

-- Ledger is append-only: history cannot be updated or deleted.
CREATE FUNCTION prevent_ledger_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_append_only
  BEFORE UPDATE OR DELETE ON "ledger_entries"
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

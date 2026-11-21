## Account history performance

- Database: PostgreSQL 17
- Dataset: 100,000 transactions and 100,000 ledger entries for one account
- Index: `ledger_entries_account_id_created_at_idx`
- Page 1 (`LIMIT 20 OFFSET 0`):
  - Plan: Index Scan
  - Execution time: 0.125 ms
  - Shared buffers hit: 4
- Page 4000 (`LIMIT 20 OFFSET 79980`):
  - Plan: Index Scan
  - Execution time: 21.901 ms
  - Rows scanned before returning the page: 80,000
  - Shared buffers hit: 1,699

In this run, deep offset pagination took about 175 times longer than the first
page. Offset pagination scans past earlier rows; keyset pagination can continue
from the last returned `(created_at, id)` cursor instead. Timings depend on
database cache and environment.

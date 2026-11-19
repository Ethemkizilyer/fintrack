CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS
$func$
  SELECT public.unaccent('public.unaccent', $1)
$func$;

CREATE INDEX "customers_name_trgm_idx" ON "customers"
  USING gin ((immutable_unaccent(lower(first_name || ' ' || last_name))) gin_trgm_ops);

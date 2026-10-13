-- READ-ONLY operator entry point; run from an existing protected psql session.
-- The same canonical SQL is exercised by disposable CI without a copied query.
\set ON_ERROR_STOP on
\ir ../../supabase/tests/support/participant-age-retention-pre-apply.psql

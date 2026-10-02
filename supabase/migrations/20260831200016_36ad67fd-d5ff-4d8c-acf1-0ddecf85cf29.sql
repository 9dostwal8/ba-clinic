DROP FUNCTION IF EXISTS public.__install_exec(text);
CREATE SCHEMA IF NOT EXISTS installer;
REVOKE ALL ON SCHEMA installer FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION installer.exec(sql_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_text;
END;
$$;
REVOKE EXECUTE ON FUNCTION installer.exec(text) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA installer TO sandbox_exec;
GRANT EXECUTE ON FUNCTION installer.exec(text) TO sandbox_exec;
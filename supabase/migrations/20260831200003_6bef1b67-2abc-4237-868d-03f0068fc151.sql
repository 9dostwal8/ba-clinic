CREATE OR REPLACE FUNCTION public.__install_exec(sql_text text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  EXECUTE sql_text;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.__install_exec(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.__install_exec(text) TO sandbox_exec;
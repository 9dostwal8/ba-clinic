ALTER TABLE public.language_settings
  ADD COLUMN IF NOT EXISTS language_code text,
  ADD COLUMN IF NOT EXISTS language_name text,
  ADD COLUMN IF NOT EXISTS is_rtl boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

DELETE FROM public.language_settings WHERE language_code IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS language_settings_code_uidx ON public.language_settings(language_code);

INSERT INTO public.language_settings (language_code, language_name, is_rtl, is_enabled, display_order) VALUES
  ('en', 'English', false, true, 1),
  ('ar', 'العربية', true, true, 2),
  ('ckb', 'کوردی', true, true, 3)
ON CONFLICT (language_code) DO NOTHING;

GRANT SELECT ON public.language_settings TO anon;
DROP POLICY IF EXISTS "Super admins manage language settings" ON public.language_settings;
CREATE POLICY "Super admins manage language settings" ON public.language_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
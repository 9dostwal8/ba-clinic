-- Commission rule extra fields used by imported files
ALTER TABLE public.commission_rules
  ADD COLUMN IF NOT EXISTS rule_name text,
  ADD COLUMN IF NOT EXISTS effective_from timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS effective_until timestamptz,
  ADD COLUMN IF NOT EXISTS included_treatment_types uuid[],
  ADD COLUMN IF NOT EXISTS excluded_treatment_types uuid[];

-- translation_keys: accept inline translation text columns
ALTER TABLE public.translation_keys
  ADD COLUMN IF NOT EXISTS en text,
  ADD COLUMN IF NOT EXISTS ar text,
  ADD COLUMN IF NOT EXISTS ku text,
  ADD COLUMN IF NOT EXISTS en_translation text,
  ADD COLUMN IF NOT EXISTS ar_translation text,
  ADD COLUMN IF NOT EXISTS ku_translation text;

CREATE OR REPLACE FUNCTION public.expand_translation_key_texts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pairs text[][] := ARRAY[
    ARRAY['en', COALESCE(NEW.en, NEW.en_translation)],
    ARRAY['ar', COALESCE(NEW.ar, NEW.ar_translation)],
    ARRAY['ku', COALESCE(NEW.ku, NEW.ku_translation)]
  ];
  i int;
BEGIN
  FOR i IN 1..array_length(pairs, 1) LOOP
    IF pairs[i][2] IS NOT NULL AND pairs[i][2] <> '' THEN
      INSERT INTO public.translations (key_id, language_code, translated_text)
      VALUES (NEW.id, pairs[i][1], pairs[i][2])
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.expand_translation_key_texts() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS expand_translation_key_texts ON public.translation_keys;
CREATE TRIGGER expand_translation_key_texts
  AFTER INSERT OR UPDATE ON public.translation_keys
  FOR EACH ROW EXECUTE FUNCTION public.expand_translation_key_texts();

-- translations: accept flat (key, translation) shape
ALTER TABLE public.translations
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS translation text;
ALTER TABLE public.translations ALTER COLUMN key_id DROP NOT NULL;
ALTER TABLE public.translations ALTER COLUMN translated_text DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.resolve_translation_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k uuid;
BEGIN
  IF NEW.translated_text IS NULL AND NEW.translation IS NOT NULL THEN
    NEW.translated_text := NEW.translation;
  ELSIF NEW.translation IS NULL THEN
    NEW.translation := NEW.translated_text;
  END IF;

  IF NEW.key_id IS NULL AND NEW.key IS NOT NULL THEN
    SELECT id INTO k FROM public.translation_keys WHERE key_name = NEW.key OR key = NEW.key LIMIT 1;
    IF k IS NULL THEN
      INSERT INTO public.translation_keys (key_name, key, category)
      VALUES (NEW.key, NEW.key, 'general')
      RETURNING id INTO k;
    END IF;
    NEW.key_id := k;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_translation_key() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS resolve_translation_key ON public.translations;
CREATE TRIGGER resolve_translation_key
  BEFORE INSERT OR UPDATE ON public.translations
  FOR EACH ROW EXECUTE FUNCTION public.resolve_translation_key();

CREATE UNIQUE INDEX IF NOT EXISTS translations_key_lang_uidx
  ON public.translations(key_id, language_code);

-- Drop outdated report functions so imported versions can be recreated
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('get_dentist_analytics','get_clinic_dentists_summary',
                        'get_doctor_commission_details','get_doctor_commission_summary',
                        'get_doctor_commission_rate')
  LOOP
    EXECUTE 'DROP FUNCTION ' || r.sig || ' CASCADE';
  END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_plans_name_uidx ON public.subscription_plans(name);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_features_plan_key_uidx ON public.subscription_features(plan_id, feature_key);
CREATE UNIQUE INDEX IF NOT EXISTS translation_keys_key_name_uidx ON public.translation_keys(key_name);

ALTER TABLE public.translations ADD COLUMN IF NOT EXISTS language text;
CREATE UNIQUE INDEX IF NOT EXISTS translations_keytext_lang_uidx ON public.translations(key, language_code);

CREATE OR REPLACE FUNCTION public.resolve_translation_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k uuid;
BEGIN
  IF NEW.language_code IS NULL AND NEW.language IS NOT NULL THEN
    NEW.language_code := NEW.language;
  ELSIF NEW.language IS NULL THEN
    NEW.language := NEW.language_code;
  END IF;

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
  ELSIF NEW.key IS NULL AND NEW.key_id IS NOT NULL THEN
    SELECT key_name INTO NEW.key FROM public.translation_keys WHERE id = NEW.key_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_translation_key() FROM PUBLIC, anon, authenticated;

UPDATE public.translations t
SET key = k.key_name, language = t.language_code
FROM public.translation_keys k
WHERE t.key_id = k.id AND t.key IS NULL;

ALTER TABLE public.translations ALTER COLUMN language_code DROP NOT NULL;
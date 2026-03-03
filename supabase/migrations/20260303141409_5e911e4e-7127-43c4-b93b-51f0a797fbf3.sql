
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS industry_vertical TEXT DEFAULT 'general';

-- Add check via trigger (not CHECK constraint to avoid immutability issues)
CREATE OR REPLACE FUNCTION public.validate_industry_vertical()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.industry_vertical NOT IN ('general', 'real_estate', 'health') THEN
    RAISE EXCEPTION 'Invalid industry_vertical: %. Must be one of: general, real_estate, health', NEW.industry_vertical;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_industry_vertical_trigger
BEFORE INSERT OR UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.validate_industry_vertical();

CREATE INDEX IF NOT EXISTS idx_organizations_vertical ON public.organizations(industry_vertical);

COMMENT ON COLUMN public.organizations.industry_vertical IS 'Vertical de negocio: general (StarterCRM), real_estate (BitanAI), health (Openmedic)';

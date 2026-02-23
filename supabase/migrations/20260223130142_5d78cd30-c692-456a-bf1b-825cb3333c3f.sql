
-- Add new columns to real_estate_unit_types
ALTER TABLE public.real_estate_unit_types
  ADD COLUMN IF NOT EXISTS property_type TEXT,
  ADD COLUMN IF NOT EXISTS nomenclature TEXT,
  ADD COLUMN IF NOT EXISTS floor_number INTEGER,
  ADD COLUMN IF NOT EXISTS typology TEXT,
  ADD COLUMN IF NOT EXISTS commercial_status TEXT NOT NULL DEFAULT 'Disponible',
  ADD COLUMN IF NOT EXISTS buyer_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS separation_date DATE,
  ADD COLUMN IF NOT EXISTS sale_date DATE,
  ADD COLUMN IF NOT EXISTS separation_value NUMERIC,
  ADD COLUMN IF NOT EXISTS sale_balance NUMERIC,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Add validation trigger for property_type
CREATE OR REPLACE FUNCTION public.validate_real_estate_unit_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.property_type IS NOT NULL AND NEW.property_type NOT IN ('APTO', 'CASA', 'LOCAL COMERCIAL', 'BURBUJA', 'CUARTO UTIL', 'PARQUEADERO') THEN
    RAISE EXCEPTION 'Invalid property_type: %', NEW.property_type;
  END IF;
  IF NEW.commercial_status NOT IN ('Disponible', 'Separado', 'Vendido', 'No Disponible') THEN
    RAISE EXCEPTION 'Invalid commercial_status: %', NEW.commercial_status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER validate_real_estate_unit_type_trigger
  BEFORE INSERT OR UPDATE ON public.real_estate_unit_types
  FOR EACH ROW EXECUTE FUNCTION public.validate_real_estate_unit_type();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_unit_types_nomenclature ON public.real_estate_unit_types(nomenclature);
CREATE INDEX IF NOT EXISTS idx_unit_types_commercial_status ON public.real_estate_unit_types(commercial_status);
CREATE INDEX IF NOT EXISTS idx_unit_types_buyer_contact_id ON public.real_estate_unit_types(buyer_contact_id);

-- Unique index for nomenclature within project (only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_unit_types_project_nomenclature 
  ON public.real_estate_unit_types(project_id, nomenclature) 
  WHERE nomenclature IS NOT NULL;

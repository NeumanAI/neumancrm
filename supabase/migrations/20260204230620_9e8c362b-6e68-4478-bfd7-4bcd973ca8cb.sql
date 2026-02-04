-- Add organization_type column to distinguish between direct clients and white-label resellers
ALTER TABLE public.organizations 
ADD COLUMN organization_type TEXT NOT NULL DEFAULT 'direct' 
CHECK (organization_type IN ('direct', 'whitelabel'));

-- Add comment for documentation
COMMENT ON COLUMN public.organizations.organization_type IS 
  'direct = cliente final bajo marca NeumanCRM, whitelabel = reseller con su propia marca';
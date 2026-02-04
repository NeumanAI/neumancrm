-- 1. Agregar columna pending_admin_email a organizations
ALTER TABLE public.organizations
ADD COLUMN pending_admin_email TEXT;

-- 2. Crear índice para búsqueda eficiente
CREATE INDEX idx_organizations_pending_admin_email 
ON public.organizations(pending_admin_email) 
WHERE pending_admin_email IS NOT NULL;

-- 3. Modificar el trigger para vincular usuarios a orgs pre-creadas
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_org_id UUID;
  new_org_id UUID;
BEGIN
  -- Buscar organización pre-creada con este email pendiente
  SELECT id INTO existing_org_id
  FROM public.organizations
  WHERE pending_admin_email = LOWER(NEW.email)
  LIMIT 1;

  IF existing_org_id IS NOT NULL THEN
    -- Vincular usuario a la organización existente
    INSERT INTO public.team_members (
      user_id, organization_id, role, email, full_name, avatar_url
    )
    VALUES (
      NEW.id,
      existing_org_id,
      'admin',
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'avatar_url'
    );

    -- Limpiar el email pendiente
    UPDATE public.organizations
    SET pending_admin_email = NULL
    WHERE id = existing_org_id;
  ELSE
    -- Crear nueva organización (flujo normal)
    INSERT INTO public.organizations (name, slug, is_approved)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Team',
      NEW.id::text,
      false
    )
    RETURNING id INTO new_org_id;

    INSERT INTO public.team_members (
      user_id, organization_id, role, email, full_name, avatar_url
    )
    VALUES (
      NEW.id,
      new_org_id,
      'admin',
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'avatar_url'
    );
  END IF;

  RETURN NEW;
END;
$$;
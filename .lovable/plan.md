
# Plan: Vincular Usuarios a Organizaciones Pre-creadas

## El Problema Actual

Cuando creas una marca blanca (o cliente directo) desde el panel de Super Admin:

1. Se crea la organización con el email del admin como información
2. El usuario se registra con ese email
3. El trigger `handle_new_user_organization()` **SIEMPRE** crea una nueva organización separada
4. El usuario queda en su propia organización en lugar de la marca blanca

```text
┌────────────────────────────────────────────────────────────────┐
│  FLUJO ACTUAL (Incorrecto)                                     │
├────────────────────────────────────────────────────────────────┤
│  1. Super Admin crea "BitanAI" (whitelabel)                    │
│     └─ admin_email: bitanaillc@gmail.com (solo informativo)    │
│                                                                 │
│  2. Usuario se registra con bitanaillc@gmail.com               │
│     └─ Trigger crea "bitanaillc's Team" (NUEVA org)            │
│                                                                 │
│  Resultado: 2 organizaciones, usuario en la incorrecta         │
└────────────────────────────────────────────────────────────────┘
```

## Solución Propuesta

Modificar el trigger para buscar si existe una organización pre-creada con ese email como admin:

```text
┌────────────────────────────────────────────────────────────────┐
│  FLUJO CORREGIDO                                               │
├────────────────────────────────────────────────────────────────┤
│  1. Super Admin crea "BitanAI" (whitelabel)                    │
│     └─ Guarda pending_admin_email = bitanaillc@gmail.com       │
│                                                                 │
│  2. Usuario se registra con bitanaillc@gmail.com               │
│     └─ Trigger busca org con ese pending_admin_email           │
│     └─ SI existe: vincula usuario a "BitanAI"                  │
│     └─ SI NO existe: crea nueva organización                   │
│                                                                 │
│  Resultado: Usuario correctamente en "BitanAI"                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Cambios Técnicos

### 1. Agregar columna `pending_admin_email` a organizations

```sql
ALTER TABLE public.organizations
ADD COLUMN pending_admin_email TEXT;
```

Esta columna guardará temporalmente el email del admin esperado cuando un Super Admin crea la organización. Se limpiará cuando el usuario se registre.

### 2. Modificar el trigger `handle_new_user_organization()`

```sql
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
```

### 3. Modificar `useSuperAdmin.ts` para guardar el email pendiente

```typescript
// En createOrganization mutation
const { data: org, error: orgError } = await supabase
  .from('organizations')
  .insert({
    name: data.name,
    slug: data.name.toLowerCase().replace(/\s+/g, '-'),
    pending_admin_email: data.admin_email.toLowerCase(), // <-- NUEVO
    is_approved: data.is_approved ?? true,
    // ... resto de campos
  })
  .select()
  .single();
```

### 4. Actualizar tipos de TypeScript

```typescript
// En src/integrations/supabase/types.ts (se actualiza automáticamente)
// Y en useTeam.ts si se usa Organization type
```

### 5. (Opcional) Corregir datos existentes

Vincular manualmente el usuario `bitanaillc@gmail.com` a la organización "BitanAI":

```sql
-- Mover el team_member a la org correcta
UPDATE public.team_members
SET organization_id = '35e9abf9-aad1-4b02-b2c8-90c1a3dc0825'  -- BitanAI
WHERE email = 'bitanaillc@gmail.com';

-- Eliminar la org huérfana
DELETE FROM public.organizations
WHERE id = '2241ade1-5f0c-42b3-a218-8af800dc02b8';  -- bitanaillc's Team
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | Agregar columna y modificar trigger |
| `src/hooks/useSuperAdmin.ts` | Guardar `pending_admin_email` al crear org |
| `src/components/admin/CreateOrganizationDialog.tsx` | Sin cambios (ya captura el email) |
| `src/integrations/supabase/types.ts` | Se actualiza automáticamente |

---

## Resumen del Nuevo Flujo

1. **Super Admin crea marca blanca "BitanAI"**
   - Se guarda `pending_admin_email = 'bitanaillc@gmail.com'`
   - Estado: `is_approved = true`, sin team_members aún

2. **Usuario se registra con bitanaillc@gmail.com**
   - Trigger busca org con `pending_admin_email = 'bitanaillc@gmail.com'`
   - Encuentra "BitanAI"
   - Crea team_member con role='admin' en esa org
   - Limpia `pending_admin_email`

3. **Resultado**
   - Usuario es admin de "BitanAI" (la marca blanca)
   - Puede acceder al panel de reseller
   - Hereda branding (logo, colores)

---

## Beneficios

1. Los usuarios se vinculan automáticamente a organizaciones pre-creadas
2. Funciona tanto para marcas blancas como clientes directos
3. Si no hay org pendiente, sigue creando una nueva (flujo normal)
4. El Super Admin puede ver qué orgs aún esperan registro (tienen `pending_admin_email`)

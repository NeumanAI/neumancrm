

# Plan: Corregir Página de Equipo para Usuarios Existentes

## Problema Identificado

Las tablas `organizations` y `team_members` están vacías porque el usuario actual fue creado ANTES del trigger que auto-crea la organización para nuevos usuarios.

---

## Solución en 2 Partes

### Parte 1: Migración SQL - Crear Datos para Usuarios Existentes

Ejecutar una migración que:
1. Cree una organización para cada usuario que no tiene una
2. Agregue a cada usuario como admin de su nueva organización

```text
Para cada usuario en auth.users que NO tenga registro en team_members:
  1. Crear organizacion con nombre "[nombre/email]'s Team"
  2. Insertar en team_members con role = 'admin'
```

### Parte 2: Mejorar Hook useTeam.ts

Modificar el hook para manejar graciosamente el caso cuando no existe organización:
- Cambiar `.single()` por una consulta que maneje 0 resultados
- Mostrar estado "sin organización" en lugar de error
- Agregar opción para crear organización manualmente si no existe

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migración SQL | Crear org/team_member para usuarios existentes |
| `src/hooks/useTeam.ts` | Manejar caso sin organización sin lanzar error |

---

## Cambios Detallados

### 1. Migración SQL

```sql
-- Crear organizaciones para usuarios existentes que no tienen una
INSERT INTO public.organizations (id, name, slug)
SELECT 
  gen_random_uuid(),
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) || '''s Team',
  u.id::text
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm 
  WHERE tm.user_id = u.id
);

-- Agregar usuarios como admin de sus organizaciones
INSERT INTO public.team_members (user_id, organization_id, role, email, full_name, is_active)
SELECT 
  u.id,
  o.id,
  'admin',
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  true
FROM auth.users u
JOIN public.organizations o ON o.slug = u.id::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm 
  WHERE tm.user_id = u.id
);
```

### 2. Modificar useTeam.ts

Cambiar la consulta de organización para que no falle si no hay resultados:

```typescript
// ANTES (falla con error 406 si no hay filas)
const { data, error } = await supabase
  .from('organizations')
  .select('*')
  .single();

// DESPUÉS (maneja caso vacío)
const { data, error } = await supabase
  .from('organizations')
  .select('*')
  .maybeSingle(); // No lanza error si no hay resultados

if (error) throw error;
return data as Organization | null;
```

También agregar un estado visual en Team.tsx para cuando no hay organización:
- Mostrar mensaje: "No tienes una organización configurada"
- Botón: "Crear Mi Organización" (llama a una función que crea org + team_member)

---

## Resultado Esperado

1. Usuarios existentes tendrán su organización creada automáticamente
2. La página /team cargará correctamente mostrando al usuario como Admin
3. Si por alguna razón no hay organización, se mostrará un mensaje útil en lugar de quedar en loading infinito

---

## Secuencia de Implementación

1. Ejecutar migración SQL para crear datos faltantes
2. Modificar `useTeam.ts` para usar `.maybeSingle()` 
3. Agregar estado de "sin organización" en `Team.tsx` (opcional pero recomendado)



# Acceso White-Label por Subpath (`/auth/:slug`)

## Resumen

Agregar una ruta `/auth/:slug` que cargue el branding de la organizacion correspondiente al slug, funcionando en paralelo con la deteccion por dominio existente. Por ejemplo, `/auth/bitanai` mostrara el login con la marca de BitanAI.

## Como funciona

1. El usuario accede a `/auth/bitanai`
2. El sistema busca la organizacion con `slug = 'bitanai'`
3. Aplica el branding (logo, colores, nombre) en la pagina de login
4. El acceso por dominio personalizado sigue funcionando igual

## Detalles Tecnicos

### 1. Nueva funcion RPC en la base de datos

Crear `get_organization_by_slug(slug_name text)` que retorna los mismos campos de branding que `get_organization_by_domain`, pero buscando por el campo `slug` de la tabla `organizations`. Funcion `SECURITY DEFINER` sin requerir autenticacion (igual que la de dominio).

### 2. Modificar `useBranding.ts`

- Aceptar un parametro opcional `slug`
- Si se pasa un slug, buscar branding por slug usando la nueva RPC (en lugar de por dominio)
- Si no hay slug, mantener el flujo actual por dominio

### 3. Modificar `BrandingContext.tsx`

- Aceptar una prop opcional `slugOverride` en `BrandingProvider`
- Pasar el slug al hook `useBranding`

### 4. Crear componente wrapper `BrandedAuth.tsx`

- Pequeno componente que lee el parametro `:slug` de la URL
- Envuelve `Auth` con un `BrandingProvider` que pasa el slug como override
- Si el slug no existe en la base de datos, muestra el branding por defecto (Neuman CRM)

### 5. Agregar ruta en `App.tsx`

- Agregar `/auth/:slug` apuntando al wrapper `BrandedAuth`
- La ruta existente `/auth` sigue funcionando igual (branding por dominio)

### Archivos a crear
1. `src/pages/BrandedAuth.tsx` - Wrapper que lee slug y aplica branding

### Archivos a modificar
1. Migracion SQL - Crear funcion `get_organization_by_slug`
2. `src/hooks/useBranding.ts` - Agregar soporte para buscar por slug
3. `src/contexts/BrandingContext.tsx` - Aceptar slug override como prop
4. `src/App.tsx` - Agregar ruta `/auth/:slug`

### Resultado

- `/auth` - Login con branding por defecto o por dominio
- `/auth/bitanai` - Login con branding de BitanAI
- Dominio personalizado - Sigue funcionando cuando se configure

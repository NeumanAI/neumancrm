

# Actualizar logo de Neuman CRM en toda la aplicacion

## Resumen

Copiar el logo subido (`Logo_Neuman_f48634.png`) al proyecto y usarlo como logo predeterminado y favicon en todas las ubicaciones donde aparece el icono generico (Sparkles).

## Ubicaciones a actualizar

1. **Favicon y titulo** (`index.html`) - Cambiar favicon y titulo a "Neuman CRM"
2. **Sidebar** (`src/components/layout/Sidebar.tsx`) - Reemplazar icono Sparkles por el logo cuando no hay branding white-label
3. **Login** (`src/pages/Auth.tsx`) - Logo en panel izquierdo y version movil
4. **Onboarding** (`src/pages/Onboarding.tsx`) - Logo en header del onboarding
5. **Branding por defecto** (`src/hooks/useBranding.ts`) - Cambiar nombre default de "CRM AI" a "Neuman CRM"

## Detalles tecnicos

### Archivos nuevos
- Copiar `user-uploads://Logo_Neuman_f48634.png` a `public/neuman-logo.png` (para favicon y referencia directa)

### Archivos a modificar

1. **`index.html`**
   - Agregar `<link rel="icon" href="/neuman-logo.png" type="image/png">`
   - Cambiar `<title>` a "Neuman CRM"
   - Actualizar og:title

2. **`src/hooks/useBranding.ts`**
   - Cambiar `name: 'CRM AI'` a `name: 'Neuman CRM'`

3. **`src/components/layout/Sidebar.tsx`**
   - En el fallback (cuando no hay `branding.logo_url`), mostrar `<img src="/neuman-logo.png">` en lugar del icono Sparkles

4. **`src/pages/Auth.tsx`**
   - Reemplazar ambos fallbacks de Sparkles (desktop y movil) por `<img src="/neuman-logo.png">`

5. **`src/pages/Onboarding.tsx`**
   - Reemplazar fallback de Sparkles por `<img src="/neuman-logo.png">`




# Hacer Firma Digital, AgenticRAG y Labs accesibles para todos los usuarios

## Cambios necesarios

### 1. Rutas (App.tsx)
- Mover las 3 rutas de `/admin/firma-digital`, `/admin/agentic-rag` y `/admin/labs` fuera del guard `RequireSuperAdmin`
- Cambiar las rutas a `/firma-digital`, `/agentic-rag` y `/labs` (sin prefijo `/admin/`)
- Envolverlas con `AppLayout` como las demas rutas protegidas

### 2. Paginas (FirmaDigital.tsx, AgenticRAG.tsx, Labs.tsx)
- Eliminar el guard interno de `useSuperAdmin` y el redirect a `/dashboard` en cada pagina
- Eliminar el header con boton "volver" ya que ahora estaran dentro del AppLayout con sidebar
- Simplificar cada pagina para que solo muestre su contenido principal

### 3. Sidebar (Sidebar.tsx)
- Sacar `platformAINavItems` de la condicion `isSuperAdmin`
- Actualizar las rutas a `/firma-digital`, `/agentic-rag`, `/labs`
- Renderizar estas 3 items en una seccion separada al fondo del sidebar, justo encima del perfil de usuario, con un label "Plataforma IA"
- Mantener el estilo violeta distintivo

## Detalle tecnico

**Sidebar.tsx** -- La nav actual es un solo bloque scrollable. Se dividira en:
1. `<nav>` principal (scrollable) con los items regulares + admin/reseller
2. Seccion fija "Plataforma IA" entre la nav y el perfil de usuario, con separador visual

**App.tsx** -- 3 rutas cambian de:
```
<Route path="/admin/firma-digital" element={<RequireSuperAdmin><FirmaDigital /></RequireSuperAdmin>} />
```
a:
```
<Route path="/firma-digital" element={<AppLayout><FirmaDigital /></AppLayout>} />
```

**Paginas** -- Cada una se simplifica eliminando ~20 lineas de guard + header, dejando solo el contenido (iframe para Firma Digital, placeholder para las otras dos).


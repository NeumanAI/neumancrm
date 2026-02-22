

# 9 Fixes Criticos para NeumanCRM

## Resumen

Aplicar 9 correcciones de seguridad, rendimiento y calidad de codigo en el orden especificado. Son cambios quirurgicos en archivos existentes mas 1 archivo nuevo.

---

## Fix 1 -- Eliminar gate de aprobacion manual (AppLayout)

**Archivo:** `src/components/layout/AppLayout.tsx`

- Reemplazar el `useEffect` que redirige a `/pending-approval` cuando `!organization.is_approved` por uno que solo bloquea organizaciones explicitamente bloqueadas (`organization.is_blocked === true`) redirigiendo a `/blocked`
- Eliminar el bloque `if (organization && !organization.is_approved && !isSuperAdmin) return null` en linea 107-109

**Impacto:** Los usuarios nuevos ya no seran bloqueados al registrarse.

---

## Fix 2 -- Proteger rutas admin con guards

**Archivo:** `src/App.tsx`

- Crear dos componentes inline `RequireSuperAdmin` y `RequireResellerAdmin` antes de `queryClient`
- Agregar imports de `useSuperAdmin`, `useResellerAdmin`, `useAuth` y `Navigate`
- Envolver rutas `/admin/*` con `RequireSuperAdmin` y `/reseller-admin` con `RequireResellerAdmin`

**Impacto:** Las rutas admin ya no seran accesibles sin autenticacion.

---

## Fix 3 -- ErrorBoundary global

- **Crear:** `src/components/ErrorBoundary.tsx` -- Componente class de React que captura errores y muestra pantalla de recovery
- **Modificar:** `src/main.tsx` -- Envolver `<App />` con `<ErrorBoundary>`

**Impacto:** Errores no manejados ya no dejaran pantalla blanca.

---

## Fix 4 -- Configurar QueryClient con defaultOptions

**Archivo:** `src/App.tsx`

- Reemplazar `new QueryClient()` por una instancia con `staleTime: 30s`, `gcTime: 5min`, `retry: 2`, `refetchOnWindowFocus: false`

**Impacto:** Menos llamadas redundantes a la API, mejor rendimiento.

---

## Fix 5 -- Activar Dark Mode

**Archivos:** `src/App.tsx` y `src/components/layout/Header.tsx`

- Envolver toda la app con `<ThemeProvider>` de next-themes
- Agregar boton de toggle dark/light en el Header (junto a NotificationBell)

**Impacto:** Los usuarios podran cambiar entre modo claro y oscuro.

---

## Fix 6 -- Silenciar console.logs en produccion (18 sub-archivos)

Envolver todos los `console.error` y `console.warn` en archivos `src/` con `if (import.meta.env.DEV)`:

- `src/contexts/ChatContext.tsx` (2 ocurrencias)
- `src/components/ai/AIAssistant.tsx` (1)
- `src/components/ai/CommandBar.tsx` (1)
- `src/components/ai/ConversationalForm.tsx` (1)
- `src/components/ai/AICoWorker.tsx` (1)
- `src/components/documents/AIDocumentSearch.tsx` (1)
- `src/hooks/useCompanyDocuments.ts` (3)
- `src/hooks/useOrgDocuments.ts` (3)
- `src/hooks/useContactDocuments.ts` (3)
- `src/hooks/useOnboarding.ts` (2)
- `src/hooks/useBranding.ts` (2)
- `src/hooks/useActionTracking.ts` (2)
- `src/hooks/useSuperAdmin.ts` (1)
- `src/hooks/useResellerAdmin.ts` (1)
- `src/hooks/useAuth.tsx` (2 console.warn)
- `src/pages/SharedDocument.tsx` (2)
- `src/pages/NotFound.tsx` (1)
- `src/pages/CRMDocumentation.tsx` (1)

---

## Fix 7 -- Eliminar console.logs en Edge Function chat

**Archivo:** `supabase/functions/chat/index.ts`

Eliminar 3 lineas de `console.log`:
- Linea 3183: `console.log("Executing tool:...")`
- Linea 3442: `console.log("Chat request - user:...")`
- Linea 3464: `console.log("Tool calls:...")`

Los `console.error` y `console.warn` se mantienen.

---

## Fix 8 -- Optimizar triple AI call a doble

**Archivo:** `supabase/functions/chat/index.ts`

Reemplazar el bloque final de la funcion serve (lineas 3442-3496) para:
- Mantener la llamada no-streaming para detectar tool calls
- Cuando NO hay tool calls, reusar la respuesta de texto como un ReadableStream simulado en vez de hacer una tercera llamada streaming
- Mantener el fallback de llamada streaming solo si la respuesta no tiene contenido

**Impacto:** Reduce de 3 a 2 llamadas al gateway AI cuando no hay tools, ahorrando costos y latencia.

---

## Fix 9 -- Retry automatico en ChatContext

**Archivo:** `src/contexts/ChatContext.tsx`

- Agregar constante `MAX_CHAT_RETRIES = 2`
- Envolver la llamada fetch en `streamChat` con un loop de retry con backoff exponencial
- Reintentar solo errores 5xx y errores de red, no errores 429
- Simplificar el parser de stream dentro del bloque de retry

**Impacto:** La IA se recupera automaticamente de errores transitorios de red.

---

## Detalles tecnicos

### Orden de implementacion
1. Fix 1 (AppLayout) + Fix 2 (Guards) + Fix 3 (ErrorBoundary) + Fix 4 (QueryClient) -- se pueden hacer en paralelo
2. Fix 5 (Dark Mode) -- depende de Fix 4 por compartir App.tsx
3. Fix 6 (console.logs src/) -- todos independientes, en paralelo
4. Fix 7 + Fix 8 (Edge Function) -- secuenciales en el mismo archivo
5. Fix 9 (ChatContext retry) -- independiente

### Archivos totales a modificar: ~22 archivos src/ + 1 edge function
### Archivos nuevos: 1 (`ErrorBoundary.tsx`)
### No se requieren migraciones de base de datos


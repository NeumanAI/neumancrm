
## Objetivo
Eliminar el “cargando” infinito del Dashboard (pantalla blanca con loader) y garantizar que el layout + dashboard siempre rendericen rápido, aun si alguna consulta falla (auth, equipo, insights IA, etc.).

---

## Hallazgos (con lo que ya se ve en logs/red)
1. **El loader que ves coincide con el loader de `AppLayout`** (pantalla centrada con `Loader2`). Eso significa que `isLoading = authLoading || teamLoading` se queda en `true` demasiado tiempo o en bucle.
2. **`useTeam()` hoy hace una consulta de organización potencialmente problemática**:
   - `organizations.select('*').maybeSingle()`
   - En tu backend hay **múltiples organizaciones** (se observa respuesta con varias filas), por lo que una lectura “single/maybeSingle” puede provocar error/reintentos (y mantener `teamLoading` en true durante los retries o refetches).
3. Se observan **peticiones repetidas** a `organizations` y `generate-insights` con **404**. Aunque lo de Insights no debería bloquear, sí añade ruido y latencia en el arranque.
4. Falta “fail-safe”: si auth o team se quedan atorados, hoy **no hay salida** (no hay UI de error/reintento/cerrar sesión), por eso se percibe como “NO carga”.

---

## Estrategia de solución (en orden de impacto)

### 1) Hacer que `useTeam()` sea determinístico y rápido (fix raíz)
**Cambiar el flujo de obtención de organización actual:**
- En vez de leer `organizations` “a ciegas”, primero obtener la **membresía** del usuario en `team_members` y de ahí el `organization_id`.
- Luego traer la organización por `id` con `.single()` (ahora sí, 1 fila real).
- Luego cargar `teamMembers` filtrando por `organization_id` (evita traer basura y evita depender de RLS implícita).

**Cambios concretos propuestos en `src/hooks/useTeam.ts`:**
- Nuevo query `current_member`:
  - `team_members.select('organization_id, role, ...').eq('user_id', user.id).eq('is_active', true).maybeSingle()`
- Query de `organization`:
  - `organizations.select('*').eq('id', organizationId).single()`
- Query de `team_members` del equipo:
  - `team_members.select('*').eq('organization_id', organizationId).order('created_at')`
- Ajustes de performance/estabilidad:
  - `staleTime: 5 * 60 * 1000` (roles/organización no cambian cada segundo)
  - `refetchOnWindowFocus: false`
  - `retry: 1` o `retry: false` (para no “congelar” el layout con reintentos largos)
- Exponer también `error` y `isError` de los queries para que el layout pueda reaccionar.

**Resultado esperado:** `teamLoading` deja de depender de una consulta ambigua que puede fallar por “múltiples filas”.

---

### 2) Evitar “loader infinito” en `AppLayout` con estados de error + timeout (hardening)
**Objetivo:** si algo se rompe (auth/team), el usuario ve una pantalla de recuperación y no queda atrapado.

**Cambios en `src/components/layout/AppLayout.tsx`:**
- Consumir `error/isError` desde `useTeam()`.
- Agregar un “boot timeout” (ej. 8–12 segundos) para pasar de loader a pantalla de “No pudimos cargar tu cuenta” con:
  - Botón **Reintentar** (refetch de queries)
  - Botón **Cerrar sesión** (signOut)
- Mostrar error UI si `useTeam` falla (en vez de spinner eterno).

**Criterio de aceptación:** nunca más un spinner “eterno”; siempre hay fallback.

---

### 3) Reducir carga inicial del Dashboard (ya optimizado, pero completar lo que falta)
Ahora el Dashboard limita contactos/oportunidades/actividades, pero **companies** sigue trayéndose completo.

**Cambios propuestos:**
- `src/hooks/useCompanies.ts`:
  - agregar `limit?: number` y/o modo `countOnly?: boolean`
  - o crear hook específico `useCompaniesCount()` usando `select('*', { count: 'exact', head: true })` (rápido, sin payload)
- `src/pages/Dashboard.tsx`:
  - usar `countOnly` o `limit` para el card “Empresas”
  - mostrar skeletons locales cuando hooks estén cargando (sin bloquear el render general).

---

### 4) Corregir o aislar `generate-insights` (404) para que no afecte experiencia
Se observa `POST /functions/v1/generate-insights` con **404**; eso indica que el endpoint no está disponible en este entorno o el nombre no coincide con lo desplegado.

**Cambios propuestos:**
- `src/hooks/useAIInsights.ts`:
  - Si el error es 404, tratarlo como “feature no disponible” y **no** reintentar automáticamente (ya hay `retry:false`, pero asegurar que no haya re-mount loop).
- `src/components/dashboard/AIInsightsCard.tsx`:
  - Mostrar mensaje claro tipo “Insights IA no disponibles por el momento” (ya muestra error genérico, pero conviene distinguir 404).

*(En paralelo, en implementación revisaremos el backend function name/estado para restaurar Insights, pero el Dashboard no debe depender de eso.)*

---

## Archivos a modificar (implementación)
1. `src/hooks/useTeam.ts`
   - Reescritura de queries: `currentMember -> organization -> teamMembers`.
   - Añadir opciones de cache y retry.
   - Exponer `error` para UI.
2. `src/components/layout/AppLayout.tsx`
   - Manejo de error/timeout y UI de recuperación (retry/sign out).
3. `src/hooks/useCompanies.ts`
   - Soporte de `limit` o `countOnly` (para Dashboard).
4. `src/pages/Dashboard.tsx`
   - Usar conteo/limit para empresas y skeletons locales.
5. (Opcional pero recomendado) `src/hooks/useAIInsights.ts` + `src/components/dashboard/AIInsightsCard.tsx`
   - Manejo específico de 404 (no disponible) para reducir ruido.

---

## Pruebas (end-to-end) que haremos al implementar
1. Abrir `/` (redirige a `/dashboard`) y verificar:
   - Render de Sidebar + Header en < 1s–2s (sin spinner eterno).
2. Simular fallo de `useTeam` (forzando error temporal) y comprobar:
   - Aparece pantalla de recuperación con “Reintentar” y “Cerrar sesión”.
3. Verificar que el card de “Empresas” no dispare una descarga masiva.
4. Verificar que aunque `generate-insights` esté caído (404), el Dashboard carga igual.

---

## Impacto esperado
- Eliminación del bloqueo en el arranque causado por carga/errores de “organización actual”.
- Dashboard siempre visible con degradación elegante si algo externo falla.
- Menor volumen de datos inicial (especialmente companies) y mejor percepción de velocidad.

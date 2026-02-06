
# Plan: Optimización del Rendimiento del Dashboard

## Diagnóstico del Problema

El Dashboard está mostrando un spinner indefinido debido a una combinación de factores:

| Problema | Impacto | Ubicación |
|----------|---------|-----------|
| Cadena de carga bloqueante | **Crítico** - El AppLayout espera 4 hooks antes de renderizar | `AppLayout.tsx` |
| Llamadas RPC secuenciales | **Alto** - `is_super_admin` y `is_reseller_admin` bloquean render | `useSuperAdmin.ts`, `useResellerAdmin.ts` |
| Edge Function timeout | **Medio** - `generate-insights` falla repetidamente | `AIInsightsCard.tsx` |
| Queries sin límite | **Medio** - Consultas traen todos los registros | Hooks de datos |

## Solución Propuesta

### 1. Desbloquear el render del AppLayout

Cambiar la lógica de carga para que solo `authLoading` y `teamLoading` sean bloqueantes. Los checks de admin pueden ejecutarse en paralelo sin bloquear.

```text
// ANTES (bloqueante)
const isLoading = authLoading || teamLoading || adminLoading || resellerLoading;

// DESPUÉS (solo bloquea lo esencial)
const isLoading = authLoading || teamLoading;
```

### 2. Limitar queries del Dashboard

Agregar límites a las consultas que se usan en el Dashboard:
- Contactos: solo últimos 10 para "Actividad Reciente"
- Oportunidades: solo abiertas, máximo 10
- Actividades: solo pendientes de hoy, máximo 10

### 3. Lazy load del AIInsightsCard

Envolver el componente AIInsightsCard en Suspense o cargar de forma diferida para que no bloquee el render inicial.

### 4. Agregar staleTime a queries de permisos

Los hooks de admin deben cachear sus resultados por más tiempo ya que los roles no cambian frecuentemente.

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/layout/AppLayout.tsx` | Remover admin/reseller loading del bloqueo principal |
| `src/pages/Dashboard.tsx` | Lazy load del AIInsightsCard, limitar datos mostrados |
| `src/hooks/useSuperAdmin.ts` | Agregar staleTime de 5 minutos |
| `src/hooks/useResellerAdmin.ts` | Agregar staleTime de 5 minutos |
| `src/hooks/useContacts.ts` | Agregar hook separado para dashboard con límite |
| `src/hooks/useOpportunities.ts` | Agregar opción de límite |
| `src/hooks/useActivities.ts` | Agregar opción de límite |

---

## Sección Tecnica

### AppLayout Optimizado

```typescript
export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const { organization, isLoading: teamLoading } = useTeam();
  const { isSuperAdmin } = useSuperAdmin(); // No usar isLoading
  const { isResellerAdmin } = useResellerAdmin(); // No usar isLoading
  
  // Solo bloquear en auth y team - criticos para el flujo
  const isLoading = authLoading || teamLoading;
  
  // El resto del componente...
}
```

### Dashboard con Lazy Loading

```typescript
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load el componente de AI que es pesado
const AIInsightsCard = lazy(() => import('@/components/dashboard/AIInsightsCard')
  .then(module => ({ default: module.AIInsightsCard })));

export default function Dashboard() {
  // Usar versiones limitadas de los hooks
  const { contacts, isLoading: contactsLoading } = useContacts({ limit: 10 });
  const { opportunities, isLoading: oppsLoading } = useOpportunities({ limit: 10, status: 'open' });
  const { activities } = useActivities({ limit: 10, onlyPending: true });
  
  return (
    <motion.div>
      {/* Lazy AI Insights */}
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AIInsightsCard />
      </Suspense>
      
      {/* Resto del dashboard */}
    </motion.div>
  );
}
```

### Hooks con staleTime extendido

```typescript
// useSuperAdmin.ts
const { data: isSuperAdmin = false, isLoading: checkingAdmin } = useQuery({
  queryKey: ['is_super_admin', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase.rpc('is_super_admin');
    if (error) return false;
    return data as boolean;
  },
  enabled: !!user,
  staleTime: 5 * 60 * 1000, // 5 minutos - roles no cambian frecuentemente
  refetchOnWindowFocus: false,
});
```

### Hook de Contactos con opciones

```typescript
interface UseContactsOptions {
  limit?: number;
  enabled?: boolean;
}

export function useContacts(options: UseContactsOptions = {}) {
  const { limit, enabled = true } = options;
  
  const { data: contacts, isLoading } = useQuery({
    queryKey: ['contacts', { limit }],
    queryFn: async () => {
      let query = supabase
        .from('contacts')
        .select('*, companies(id, name, logo_url)')
        .order('created_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Contact[];
    },
    enabled,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
  
  // ...resto del hook
}
```

---

## Resultado Esperado

| Metrica | Antes | Despues |
|---------|-------|---------|
| Tiempo hasta primer render | 5-10s+ (bloqueado) | <1s |
| Queries iniciales | 6+ sin limite | 4 con limite de 10 |
| AI Insights | Bloquea render | Carga async |
| Cache de permisos | Sin cache | 5 min staleTime |

El Dashboard se mostrara inmediatamente con los datos esenciales, mientras los componentes secundarios (AI Insights) cargan de forma asincrona sin bloquear la experiencia del usuario.

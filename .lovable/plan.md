

# Plan: Sistema Multi-Tenant con Branding por Dominio

## Resumen Ejecutivo

Implementar un sistema de marca blanca donde cada organización puede tener su propio dominio/subdominio personalizado, con branding independiente (logo, colores, nombre), pero todo funcionando desde una única base de código y base de datos.

## Arquitectura Actual vs Propuesta

```text
ACTUAL:
+------------------+     +------------------+
|     branding     |     |  organizations   |
+------------------+     +------------------+
| user_id (FK)     |     | id               |
| logo_url         |     | name             |
| primary_color    |     | slug             |
| secondary_color  |     | is_approved      |
| company_name     |     | ...              |
+------------------+     +------------------+
(branding por usuario)   (sin branding)

PROPUESTA:
+------------------+     +----------------------+
|  organizations   |     |   organization       |
+------------------+     |   _domains           |
| id               |     +----------------------+
| name             |<----| organization_id (FK) |
| slug             |     | domain               |
| logo_url    NEW  |     | is_primary           |
| primary_color    |     | is_verified          |
| secondary_color  |     | verified_at          |
| favicon_url NEW  |     +----------------------+
| ...              |
+------------------+
(branding por org)
```

## Cambios en Base de Datos

### 1. Migrar branding a organizations

Agregar columnas a la tabla `organizations`:
- `logo_url` (text, nullable) - URL del logo de la organización
- `favicon_url` (text, nullable) - URL del favicon
- `primary_color` (text, default '#3B82F6')
- `secondary_color` (text, default '#8B5CF6')
- `custom_domain` (text, nullable, unique) - Dominio personalizado (ej: crm.miempresa.com)

### 2. Crear tabla organization_domains (opcional para múltiples dominios)

Para soportar múltiples dominios por organización en el futuro:

```sql
CREATE TABLE organization_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL UNIQUE,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Flujo de Detección de Branding

```text
Usuario accede a: crm.clienteX.com
                      |
                      v
+---------------------------------------------+
|  App detecta hostname en window.location   |
+---------------------------------------------+
                      |
                      v
+---------------------------------------------+
|  Buscar en organization_domains o          |
|  organizations.custom_domain               |
+---------------------------------------------+
                      |
         +------------+------------+
         |                         |
   Dominio encontrado       Dominio NO encontrado
         |                         |
         v                         v
+------------------+    +------------------------+
| Cargar branding  |    | Usar branding default  |
| de esa org       |    | (neumancrm.lovable.app)|
+------------------+    +------------------------+
         |
         v
+------------------+
| Aplicar CSS vars |
| logo, colores    |
+------------------+
```

## Archivos a Crear/Modificar

### Nuevos Archivos

| Archivo | Propósito |
|---------|-----------|
| `src/hooks/useBranding.ts` | Hook para detectar dominio y cargar branding de la organización |
| `src/contexts/BrandingContext.tsx` | Contexto global para branding (logo, colores, nombre) |
| `src/components/layout/BrandingProvider.tsx` | Componente que aplica el branding dinámicamente |

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/main.tsx` | Envolver App con BrandingProvider |
| `src/pages/Auth.tsx` | Mostrar logo/nombre dinámico según dominio |
| `src/components/layout/Sidebar.tsx` | Mostrar logo de organización en lugar de hardcoded |
| `src/pages/Settings.tsx` | Mover configuración de branding a nivel de organización (solo admins) |
| `src/hooks/useTeam.ts` | Agregar campos de branding a Organization interface |

## Detalles Técnicos

### Hook useBranding

```typescript
// Pseudocódigo del hook
function useBranding() {
  const hostname = window.location.hostname;
  
  // Query para buscar organización por dominio
  const { data: orgBranding } = useQuery({
    queryKey: ['branding', hostname],
    queryFn: async () => {
      // Buscar primero en organization_domains
      // Si no encuentra, buscar en organizations.custom_domain
      // Si aún no encuentra, retornar branding default
    },
    staleTime: Infinity, // El branding no cambia frecuentemente
  });
  
  return {
    logo: orgBranding?.logo_url || defaultLogo,
    companyName: orgBranding?.name || 'CRM AI',
    primaryColor: orgBranding?.primary_color || '#3B82F6',
    secondaryColor: orgBranding?.secondary_color || '#8B5CF6',
    isWhiteLabel: !!orgBranding?.custom_domain,
  };
}
```

### Aplicación Dinámica de Colores

El `BrandingProvider` aplicará los colores via CSS variables al montar:

```typescript
useEffect(() => {
  if (branding) {
    document.documentElement.style.setProperty('--primary', hexToHsl(branding.primaryColor));
    document.documentElement.style.setProperty('--secondary', hexToHsl(branding.secondaryColor));
  }
}, [branding]);
```

### Panel de Administración de Dominios (para ti como Super Admin)

En la página `/admin`, agregar una sección para:
1. Ver todos los dominios configurados
2. Asignar dominio personalizado a una organización
3. Subir logo/favicon para cada organización

### Panel de Branding (para admins de cada organización)

En `/settings` > "Marca", los admins de cada organización podrán:
1. Cambiar colores primario/secundario
2. Subir logo (guardado en Supabase Storage)
3. Ver su dominio asignado (solo lectura, asignado por super admin)

## Consideraciones de DNS y Dominios

Para que los dominios personalizados funcionen:

1. **Subdominios de lovable.app**: Funcionan automáticamente (ej: `cliente1.neumancrm.lovable.app`)

2. **Dominios externos** (ej: `crm.miempresa.com`): Requieren:
   - Que el cliente configure un CNAME apuntando a tu dominio publicado
   - Configurar el dominio en Lovable (Settings > Domains)

## Orden de Implementación

1. **Fase 1 - Base de datos**: Migración para agregar campos de branding a organizations
2. **Fase 2 - Context/Hook**: Crear BrandingContext y useBranding
3. **Fase 3 - UI Dinámica**: Modificar Sidebar, Auth, Header para usar branding dinámico
4. **Fase 4 - Panel Admin**: Agregar gestión de branding en /admin para super admins
5. **Fase 5 - Panel Org**: Actualizar Settings para que admins de org configuren su marca

## Seguridad

- RLS: Solo super admins pueden asignar dominios
- RLS: Solo admins de cada org pueden modificar su propio branding (colores, logo)
- Validación: Dominios deben ser únicos en toda la plataforma
- El campo `custom_domain` tendrá constraint UNIQUE

## Beneficios del Enfoque

1. **Un solo código**: Cualquier mejora se refleja en todos los clientes automáticamente
2. **Una sola base de datos**: Fácil de mantener y escalar
3. **Branding independiente**: Cada cliente ve "su" CRM con su marca
4. **Control centralizado**: Tú como super admin controlas qué dominios puede usar cada cliente
5. **Escalable**: Preparado para agregar más opciones de personalización en el futuro


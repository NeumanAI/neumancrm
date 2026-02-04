

# Plan: Distinguir Tipos de Clientes (Directos vs Marca Blanca)

## El Problema Actual

Actualmente todas las organizaciones son tratadas igual. No hay forma de distinguir entre:

1. **Clientes directos (B2B)**: Empresas que usan tu CRM bajo tu marca "NeumanCRM"
2. **Resellers/Marca Blanca (B2B2B)**: Partners que revenden el CRM con su propia marca y dominio

## Solución Propuesta

Agregar un campo `organization_type` a la tabla `organizations` para distinguir claramente entre ambos tipos:

```text
┌────────────────────────────────────────────────────────────────┐
│                     TIPOS DE ORGANIZACIÓN                       │
├─────────────────────────────┬──────────────────────────────────┤
│   CLIENTE DIRECTO (direct)  │   MARCA BLANCA (whitelabel)      │
├─────────────────────────────┼──────────────────────────────────┤
│ • Usa neumancrm.lovable.app │ • Usa su propio dominio          │
│ • Ve tu logo/marca          │ • Ve su logo/marca               │
│ • No puede cambiar colores  │ • Puede personalizar colores     │
│ • Es tu cliente final       │ • Revende a sus propios clientes │
└─────────────────────────────┴──────────────────────────────────┘
```

## Cambios en Base de Datos

Agregar columna a la tabla `organizations`:

```sql
ALTER TABLE public.organizations 
ADD COLUMN organization_type TEXT NOT NULL DEFAULT 'direct' 
CHECK (organization_type IN ('direct', 'whitelabel'));

COMMENT ON COLUMN public.organizations.organization_type IS 
  'direct = cliente final bajo marca NeumanCRM, whitelabel = reseller con su propia marca';
```

## Cambios en la UI del Panel Admin

### 1. Modificar el botón "Nueva empresa"

Reemplazar el botón único por dos opciones claras:

```text
┌─────────────────────────────────────────────────────┐
│  [+ Nueva empresa directa]  [+ Nueva marca blanca]  │
└─────────────────────────────────────────────────────┘
```

O un dropdown con opciones:

```text
┌────────────────────────────────────┐
│  [▼ Nueva empresa]                 │
│  ├─ Cliente directo               │
│  │   (Usa tu marca NeumanCRM)     │
│  └─ Marca blanca / Reseller       │
│      (Con su propia marca)        │
└────────────────────────────────────┘
```

### 2. Modificar el diálogo de creación

**Para Cliente Directo:**
- Nombre de la empresa
- Email del administrador
- Aprobar inmediatamente
- (Sin opciones de branding - usa tu marca)

**Para Marca Blanca:**
- Nombre de la empresa
- Email del administrador
- Logo URL
- Colores (primario/secundario)
- Dominio personalizado
- Aprobar inmediatamente

### 3. Agregar pestañas/filtros por tipo

```text
┌──────────────────────────────────────────────────────┐
│ Pestañas: [Directos] [Marca Blanca] [Todos]          │
├──────────────────────────────────────────────────────┤
│ Tabla con organizaciones filtradas por tipo          │
└──────────────────────────────────────────────────────┘
```

### 4. Badges visuales

En la tabla de organizaciones:
- **Clientes directos**: Badge azul "Directo"
- **Marca blanca**: Badge púrpura "Marca Blanca" con icono de paleta

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/admin/CreateOrganizationDialog.tsx` | Agregar prop `organizationType` y condicionar campos según tipo |
| `src/pages/Admin.tsx` | Separar botones de creación, agregar pestañas por tipo, badges |
| `src/hooks/useSuperAdmin.ts` | Incluir `organization_type` en queries y mutaciones |

## Flujo de Usuario Propuesto

```text
Super Admin en /admin
        │
        ▼
  ¿Qué tipo de empresa?
        │
   ┌────┴────┐
   │         │
   ▼         ▼
Directa    Marca Blanca
   │         │
   ▼         ▼
Formulario  Formulario
 simple     completo
 (nombre,   (nombre,
  email)     email,
             logo,
             colores,
             dominio)
```

## Beneficios

1. **Claridad conceptual**: Siempre sabrás qué tipo de cliente es cada organización
2. **UI simplificada**: Los clientes directos no ven opciones de branding que no les aplican
3. **Reportes separados**: Podrás ver métricas por tipo de cliente
4. **Escalabilidad**: Fácil agregar más tipos en el futuro (ej: "enterprise", "trial")

## Orden de Implementación

1. Migración de base de datos (agregar columna `organization_type`)
2. Actualizar hook `useSuperAdmin` para incluir el nuevo campo
3. Modificar `CreateOrganizationDialog` para soportar ambos tipos
4. Actualizar `Admin.tsx` con nuevos botones y pestañas
5. Agregar badges visuales para distinguir tipos


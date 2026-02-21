

# Limpiar Datos Demo del Dashboard

## Problema

La base de datos contiene datos de demostración (proyecto inmobiliario "Harena") que fueron sembrados para pruebas. Estos datos inflan las cifras del dashboard con valores irreales como **246.4 MUS$ en pipeline** y **18 contactos ficticios**. El código del dashboard ya usa datos reales -- el problema es exclusivamente los registros demo en la base de datos.

## Datos identificados como DEMO (a eliminar)

Los registros demo siguen un patron de UUID reconocible:

| Tabla | Registros demo | Patron UUID |
|---|---|---|
| contacts | 16 de 18 | `b2000001-0000-0000-*` |
| companies | 8 de 8 | `a1000001-0000-0000-*` |
| opportunities | 10 de 10 | `c3000001-0000-0000-*` |
| activities | ~12 de 14 | Referencia a contactos/empresas demo |
| timeline_entries | 6 de 6 | Referencia a contactos/empresas demo |

## Datos REALES (se conservan)

- Contactos: "Pepito Perez" (jogedu@gmail.com), "Alberto Perez", "Jorge UTP"
- Actividades creadas manualmente por el usuario real
- Pipelines y stages del usuario

## Plan de ejecucion

### 1. Migracion SQL para limpiar datos demo

Eliminar en orden correcto (respetando dependencias):

1. `timeline_entries` que referencian contactos/empresas demo
2. `activities` que referencian contactos/empresas/oportunidades demo  
3. `contact_projects` que referencian contactos demo
4. `opportunities` con IDs demo (`c3000001-*`)
5. `contacts` con IDs demo (`b2000001-*`)
6. `companies` con IDs demo (`a1000001-*`)

### 2. Sin cambios de codigo

El dashboard (`Dashboard.tsx`) ya esta correctamente implementado -- usa hooks reales (`useContacts`, `useCompanies`, `useOpportunities`). No hay mock data en el codigo. Una vez limpia la base de datos, las cifras seran correctas automaticamente.

## Resultado esperado

Despues de la limpieza:
- Pipeline Activo: **0 US$** (sin oportunidades demo)
- Clientes Activos: **3** (solo los contactos reales)
- Tasa de Conversion: **0%** (sin deals)
- Charts mostraran estados vacios elegantes ("Sin datos")



Objetivo: corregir de forma definitiva que `/cartera` siga vacío, evitando depender de joins embebidos frágiles y mostrando errores reales en UI.

1) Diagnóstico técnico inmediato (sin asumir más)
- Confirmar en runtime 3 cosas en paralelo:
  - si `usePortfolioContracts` está ejecutando query,
  - si devuelve `error`,
  - y si `organization.id` está presente.
- Hoy la UI siempre cae en “No hay contratos” cuando hay error o query deshabilitada, por eso el problema se “disfraza” de vacío.

2) Cambiar estrategia de carga en `usePortfolioContracts` (fix principal)
- Reemplazar el query con joins embebidos por estrategia en 2 pasos:
  - Paso A: traer `portfolio_contracts` base (sin `contacts(...)`, `real_estate_projects(...)`, `real_estate_unit_types(...)`).
  - Paso B: con IDs resultantes, traer contactos/proyectos/unidades por separado y hacer merge en frontend.
- Beneficio: elimina dependencia de resolución de relaciones del API (FK cache/embedding ambiguo) y evita que un join falle toda la lista.
- Mantener filtro por estado/proyecto/búsqueda como está.

3) Robustecer hooks de mora y próximos vencimientos
- Aplicar el mismo patrón en `usePortfolioOverdue` y `usePortfolioUpcoming`:
  - traer cuotas base,
  - traer contratos/contactos/proyectos por IDs,
  - combinar en memoria.
- Así KPIs, panel de mora y alertas no dependen de joins embebidos.

4) Manejo de errores visible (no más “vacío silencioso”)
- En hooks: exponer `error` + `isError`.
- En `Portfolio.tsx`:
  - si hay error, mostrar tarjeta de error con mensaje claro y botón “Reintentar”.
  - dejar “No hay contratos” solo para caso realmente vacío.
- Agregar `console.error` con contexto (query, orgId, código de error) para acelerar futuros diagnósticos.

5) Revisión de políticas de acceso (RLS) para cartera
- Validar políticas SELECT de:
  - `portfolio_contracts`
  - `portfolio_payment_schedule`
  - `portfolio_payments`
- Si el usuario opera como superadmin/impersonación, evaluar agregar condición explícita para ese caso en SELECT (sin abrir datos públicamente), manteniendo aislamiento por organización.
- Esto se hará solo si la validación confirma bloqueo por política y no por query.

6) Validación funcional final (obligatoria)
- En `/cartera` verificar:
  - aparecen contratos,
  - KPIs con valores reales,
  - panel de mora (si aplica),
  - próximos vencimientos (según rango de fechas).
- En `/cartera/:id` verificar:
  - detalle del contrato,
  - cronograma,
  - pagos y acciones de cobro.
- Confirmar en red que ya no dependemos de requests con joins embebidos para render principal.

Resultado esperado
- Cartera deja de mostrarse vacía.
- Si hay un problema real de backend/políticas, se verá explícitamente en pantalla y logs.
- El módulo queda resiliente ante problemas de metadata de relaciones.

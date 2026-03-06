

# Plan: Datos de Prueba para Constructora (jogedu@gmail.com)

Crear un conjunto completo de datos de prueba realistas para la vertical inmobiliaria, cubriendo todos los módulos.

---

## Datos de referencia

| Campo | Valor |
|-------|-------|
| user_id | `e595967d-a0cc-4cf2-ba94-32aa81d3eee0` |
| organization_id | `5179d17c-7107-46ea-ba1a-88a029bf74d9` |
| pipeline_id | `35044588-1e14-44a0-b156-2f2396201673` |
| Vertical | real_estate |
| Datos existentes | 8 contactos (prospectos web), 1 actividad, 0 proyectos, 0 empresas, 0 oportunidades, 0 contratos |

---

## Datos a insertar (todos via insert tool, no migraciones)

### 1. Empresas (3)
Constructoras colombianas ficticias: "Bitan Corp", "Grupo Edificar", "Torres del Valle SAS"

### 2. Contactos nuevos (8 — mezcla de prospectos y compradores)
4 compradores con datos completos (nombre, teléfono, WhatsApp, email real ficticio) y 4 prospectos calificados. Algunos vinculados a las empresas.

### 3. Proyectos Inmobiliarios (2)
- "Torres del Parque" — En venta, 120 unidades, Bogotá
- "Reserva del Bosque" — Preventa, 80 unidades, Medellín

### 4. Unidades (8 por proyecto = 16 total)
Mix de APTOs y PARQUEADERO con estados: Disponible, Separado, Vendido. Compradores asignados a unidades vendidas/separadas.

### 5. Oportunidades (6)
Distribuidas en diferentes stages del pipeline, valores entre $80M-$350M COP, vinculadas a contactos y proyectos.

### 6. Actividades (6)
Mix de calls, meetings, tasks y notes con diferentes prioridades y fechas.

### 7. Timeline entries (4)
Notas, llamadas y reuniones vinculadas a contactos.

### 8. Contratos de Cartera (3)
- 2 contratos activos con planes de pago (12 y 24 meses)
- 1 contrato con cuotas vencidas para probar detección de mora
- Planes de pago con cuotas pasadas (pagadas + overdue) y futuras (pending)

### 9. Pagos registrados (6-8 cuotas pagadas)
Cuotas pagadas de los contratos activos para simular historial.

---

## Ejecución

Se harán múltiples llamadas al insert tool en secuencia:
1. Empresas → obtener IDs
2. Contactos → obtener IDs
3. Proyectos inmobiliarios → obtener IDs
4. Unidades → vincular a proyectos y compradores
5. Oportunidades → vincular a contactos y stages
6. Actividades y timeline
7. Contratos de cartera → vincular a proyectos y compradores
8. Plan de pagos → cuotas con estados mixtos (paid/overdue/pending)

No se requieren migraciones SQL — solo inserciones de datos.


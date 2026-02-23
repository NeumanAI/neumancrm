

# Plan: Listado Comercial de Funcionalidades

Transformar la pagina de documentacion existente (`CRMDocumentation.tsx`) en un listado orientado a ventas, con lenguaje no tecnico, beneficios claros y categorias actualizadas que reflejen las 91+ funciones de IA y todos los modulos del CRM.

---

## Cambios principales

### Archivo: `src/pages/CRMDocumentation.tsx`

**1. Reescribir el contenido de los modulos con lenguaje comercial**

Reemplazar descripciones tecnicas por beneficios de negocio. Por ejemplo:

- "create_contact con todos los campos" pasa a ser "Crea contactos dictandole a la IA en lenguaje natural"
- "search_contacts, search_companies" pasa a ser "Busca cualquier dato del CRM con solo preguntar"
- "Row Level Security (RLS)" pasa a ser "Datos 100% aislados entre organizaciones"

**2. Actualizar los modulos a 16 categorias comerciales:**

| Modulo | Enfoque comercial |
|--------|------------------|
| Gestion de Contactos | Captura, organiza y da seguimiento a todos tus prospectos |
| Gestion de Empresas | Cuentas corporativas con vision completa |
| Pipeline de Ventas | Visualiza y controla tu embudo de ventas |
| Tareas y Actividades | Nunca pierdas un seguimiento |
| Conversaciones Omnicanal | Todos tus canales en un solo lugar |
| Proyectos y Unidades de Negocio | Segmenta por lineas de negocio |
| Asistente de IA (actualizado a 91+ herramientas) | Tu copiloto de ventas con inteligencia artificial |
| Gestion de Equipo | Colaboracion y performance del equipo |
| Gestion Comercial por Asesor (NUEVO) | Atribucion, ranking y traspasos de cartera |
| Calendario Comercial (NUEVO) | Agenda inteligente con metas y bloques de tiempo |
| Documentos (NUEVO) | Gestion centralizada con busqueda IA |
| Dashboard y Metricas | KPIs en tiempo real para tomar decisiones |
| Integraciones | Conecta con las herramientas que ya usas |
| Notificaciones | Alertas inteligentes para no perder oportunidades |
| Marca Blanca | Tu marca, tu plataforma |
| Administracion y Seguridad | Control total con datos protegidos |

**3. Expandir la seccion de IA con sub-categorias comerciales:**

Las 91 herramientas agrupadas en lenguaje de beneficio:
- Gestion de clientes y prospectos (crear, buscar, actualizar, perfilar)
- Pipeline y oportunidades (crear deals, mover etapas, analizar salud)
- Productividad (tareas, reuniones, priorizar el dia)
- Comunicacion (redactar emails, responder WhatsApp, analizar sentimiento)
- Reportes (ventas, conversion, forecast, actividad)
- Colaboracion (asignar, notificar, traspasar)
- Calendario (eventos, metas, bloques de tiempo)
- Documentos (subir, buscar, compartir)
- Inmobiliario (inventario, unidades, status, reporte maestro)
- Gestion comercial (performance, ranking, traspasos)

**4. Actualizar el resumen del footer:**
- De "30+ Herramientas IA" a "91+ Herramientas IA"
- Agregar "16 Modulos"
- Actualizar conteo total de funcionalidades

**5. Actualizar el PDF export** para reflejar el nuevo contenido

**6. Ajustes visuales menores:**
- Mantener el mismo layout de cards en grid
- Mantener la funcionalidad de exportar PDF
- Actualizar el titulo a "Funcionalidades de NeumanCRM" en vez de "Documentacion del CRM"

---

## Resumen tecnico

Solo se modifica un archivo: `src/pages/CRMDocumentation.tsx`. Los cambios son puramente de contenido (textos de los modulos y features), actualizacion del titulo, y ajuste del conteo en el footer.


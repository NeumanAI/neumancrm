
# Correcciones de UX Mobile para el CRM

## Problemas Identificados

1. **Sidebar siempre visible en mobile**: La barra lateral de 260px se muestra permanentemente en pantallas pequenas, empujando el contenido fuera de la pantalla. No hay mecanismo para ocultarla en mobile.

2. **AI Assistant se abre automaticamente a pantalla completa**: Al cargar cualquier pagina, el asistente ocupa el 100% de la pantalla en mobile, bloqueando todo el contenido. No hay forma facil de acceder al CRM sin primero minimizarlo.

3. **Daily Brief Modal se superpone con AI Assistant**: Ambos se abren simultaneamente, creando capas confusas.

4. **Dashboard sin padding adaptativo**: El contenido del dashboard tiene `p-6 md:p-8` duplicando el padding del main que ya tiene `p-6`, resultando en padding excesivo.

5. **Header elements ocultos en mobile**: El saludo y la barra de busqueda estan ocultos (`hidden md:block`), dejando solo el boton hamburguesa y los iconos de la derecha, sin contexto.

6. **Tablas y grids no responsivos**: Las tablas de contactos y el pipeline de columnas horizontales no se adaptan a pantallas pequenas.

---

## Plan de Implementacion

### 1. Sidebar como drawer en mobile

**Archivo**: `src/components/layout/Sidebar.tsx`

- En mobile (< 768px), la sidebar se convierte en un drawer/overlay que se abre desde la izquierda
- Agregar prop `isMobileOpen` y `onClose` 
- Cuando esta cerrada en mobile, no renderiza nada (o queda oculta con `translate-x`)
- Al hacer click en un NavLink en mobile, cerrar automaticamente la sidebar
- Agregar overlay/backdrop oscuro detras de la sidebar en mobile

**Archivo**: `src/components/layout/AppLayout.tsx`

- Manejar estado `mobileMenuOpen` separado de `sidebarCollapsed`
- Pasar al Header el callback para abrir el menu mobile
- Pasar a Sidebar los nuevos props de mobile

### 2. AI Assistant no abre automaticamente en mobile

**Archivo**: `src/components/ai/AIAssistant.tsx`

- En mobile, el asistente inicia minimizado por defecto
- En lugar de la barra lateral minimizada (que ya esta oculta con `hidden md:flex`), mostrar un FAB (boton flotante) en la esquina inferior derecha
- El FAB abre el asistente a pantalla completa
- Agregar boton X visible para cerrar en mobile

### 3. Daily Brief Modal adaptado

**Archivo**: `src/components/layout/DailyBriefModal.tsx`

- Agregar clase `max-h-[90vh]` y `mx-4` para que no desborde en mobile
- Asegurar que no se abra simultaneamente con el AI Assistant en mobile

### 4. Header mejorado para mobile

**Archivo**: `src/components/layout/Header.tsx`

- Mostrar nombre de pagina actual en mobile (en lugar del saludo completo)
- Mantener hamburguesa, notificaciones y avatar compactos
- Ocultar `GlobalProjectFilter` en mobile (moverlo al sidebar o a un dropdown)

### 5. Dashboard responsivo

**Archivo**: `src/pages/Dashboard.tsx`

- Eliminar padding duplicado (`p-6 md:p-8` -> `space-y-6 md:space-y-8`) ya que el main ya tiene `p-6`
- El grid inferior de 4 columnas (`lg:grid-cols-4`) ya baja a 1 columna en mobile, lo cual esta bien
- Verificar que las graficas tengan altura minima apropiada

### 6. Boton flotante de AI en mobile

**Archivo**: `src/components/ai/AIAssistant.tsx`

- Cuando esta minimizado en mobile, mostrar un FAB circular con el icono de Sparkles
- Posicion: `fixed bottom-6 right-6`
- Badge de notificaciones urgentes sobre el FAB
- Al tap, abre el panel a pantalla completa

---

## Archivos a Modificar

1. `src/components/layout/Sidebar.tsx` - Drawer mobile con overlay
2. `src/components/layout/AppLayout.tsx` - Estado mobile separado, sidebar condicional
3. `src/components/ai/AIAssistant.tsx` - FAB mobile, no auto-abrir en mobile
4. `src/components/layout/Header.tsx` - Ajustes de visibilidad mobile
5. `src/pages/Dashboard.tsx` - Padding duplicado
6. `src/components/layout/DailyBriefModal.tsx` - Sizing mobile

## Orden de Ejecucion

1. Sidebar como drawer mobile + AppLayout
2. AI Assistant FAB + comportamiento mobile
3. Header y Dashboard ajustes
4. Daily Brief Modal

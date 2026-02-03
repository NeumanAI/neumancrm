
## Implementación: Chat de IA Omnipresente

El plan fue aprobado. Aquí está el resumen detallado de los cambios a implementar:

### Archivos a Crear

#### 1. `src/contexts/ChatContext.tsx`
Contexto global que maneja:
- Estado del panel (abierto/cerrado)
- Lista de conversaciones desde Supabase
- Conversación seleccionada y mensajes
- Lógica de envío con streaming
- Auto-apertura del panel al enviar mensaje

#### 2. `src/components/chat/ChatMessages.tsx`
Componente reutilizable que muestra:
- Lista de mensajes con avatares
- Renderizado de Markdown para respuestas de IA
- Indicador de "Pensando..." mientras carga
- Quick actions cuando no hay mensajes
- Auto-scroll al nuevo contenido

#### 3. `src/components/chat/ChatConversationList.tsx`
Sidebar del panel expandido:
- Botón "Nueva Conversación"
- Conversaciones agrupadas por fecha (Hoy, Ayer, Más antiguas)
- Selección visual de conversación activa

#### 4. `src/components/chat/GlobalChatInput.tsx`
Barra fija en la parte inferior:
- Input de texto siempre visible
- Botón de enviar
- Botón para expandir/colapsar panel
- Altura fija de ~60px

#### 5. `src/components/chat/GlobalChatPanel.tsx`
Panel expandible usando Drawer (vaul):
- Se abre desde la parte inferior
- Altura de ~70vh del viewport
- Contiene ChatConversationList (sidebar)
- Contiene ChatMessages (área principal)
- Input integrado en el footer

### Archivos a Modificar

#### 6. `src/components/layout/AppLayout.tsx`
- Importar ChatProvider y GlobalChatInput
- Envolver contenido en ChatProvider
- Agregar GlobalChatInput después del main
- Ajustar padding-bottom del main para dejar espacio al input

#### 7. `src/components/layout/Sidebar.tsx`
- Remover el item `/chat` del array `navItems`

#### 8. `src/App.tsx`
- Remover import de Chat page
- Remover la ruta `/chat`

### Archivo a Eliminar

#### 9. `src/pages/Chat.tsx`
- Ya no es necesario (funcionalidad movida a componentes globales)

### Flujo de Usuario

```text
1. Usuario en cualquier página
   │
   ▼
2. Ve barra de input fija abajo: "✨ Pregúntame algo..."
   │
   ├─────────────────────────────────┐
   ▼                                 ▼
3a. Escribe y presiona Enter    3b. Click en ▲ para expandir
   │                                 │
   ▼                                 ▼
4. Panel se expande              4. Ve historial completo
   automáticamente                   de conversaciones
   │                                 │
   ▼                                 ▼
5. Respuesta aparece             5. Puede cambiar entre
   con streaming                     conversaciones
```

### Dependencias Utilizadas
- `vaul` - Ya instalado, para el Drawer
- `framer-motion` - Ya instalado, para animaciones
- `react-markdown` - Ya instalado, para renderizar respuestas
- `date-fns` - Ya instalado, para agrupar conversaciones

### Resultado Esperado
- Chat visible en todas las páginas protegidas
- Acceso instantáneo sin cambiar de ruta
- Historial de conversaciones en panel expandido
- Experiencia "AI First" similar a ChatGPT/Claude

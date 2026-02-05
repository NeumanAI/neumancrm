

# Plan: Menús Plataforma IA (Firma Digital y AgenticRAG)

## Resumen
Agregar dos nuevas páginas dentro de la sección de administración bajo el grupo "Plataforma IA":
1. **Firma Digital** - Iframe embebido que oculta el dominio
2. **AgenticRAG** - Página con mensaje "En Desarrollo"

---

## Cambios Requeridos

### 1. Actualizar Sidebar (`src/components/layout/Sidebar.tsx`)

Agregar nuevos items de navegación para super admins debajo de Administración:

```typescript
// Nuevos iconos a importar
import { PenTool, Bot, Cpu } from 'lucide-react';

// Nuevo grupo de items para Plataforma IA
const platformAINavItems = [
  { to: '/admin/firma-digital', icon: PenTool, label: 'Firma Digital', isPlatformAI: true },
  { to: '/admin/agentic-rag', icon: Bot, label: 'AgenticRAG', isPlatformAI: true },
];

// En la lógica de construcción de menú, agregar después de adminNavItems
if (isSuperAdmin) {
  allNavItems = [...allNavItems, ...adminNavItems, ...platformAINavItems];
}
```

### 2. Crear Página FirmaDigital (`src/pages/FirmaDigital.tsx`)

Página con iframe embebido a pantalla completa que oculta el dominio:

```typescript
export default function FirmaDigital() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header con navegación */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <PenTool className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Firma Digital</h1>
          </div>
        </div>
      </div>
      
      {/* Iframe embebido sin barra de URL visible */}
      <div className="w-full h-[calc(100vh-65px)]">
        <iframe
          src="https://demo.stg.mifirmadigital.com/login"
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          title="Firma Digital"
        />
      </div>
    </div>
  );
}
```

### 3. Crear Página AgenticRAG (`src/pages/AgenticRAG.tsx`)

Página placeholder con mensaje de desarrollo:

```typescript
export default function AgenticRAG() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header con navegación */}
      <div className="border-b">...</div>
      
      {/* Contenido placeholder */}
      <div className="flex flex-col items-center justify-center h-[calc(100vh-65px)] gap-6">
        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
          <Bot className="h-12 w-12 text-primary animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">AgenticRAG</h2>
          <p className="text-muted-foreground text-lg">En Desarrollo</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Sistema de IA agéntica con capacidades RAG avanzadas.
            Próximamente disponible.
          </p>
        </div>
        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
          <Cpu className="h-4 w-4 mr-1" />
          Próximamente
        </Badge>
      </div>
    </div>
  );
}
```

### 4. Actualizar Rutas (`src/App.tsx`)

Agregar las nuevas rutas de administración:

```typescript
import FirmaDigital from "./pages/FirmaDigital";
import AgenticRAG from "./pages/AgenticRAG";

// Agregar rutas después de /admin
<Route path="/admin/firma-digital" element={<FirmaDigital />} />
<Route path="/admin/agentic-rag" element={<AgenticRAG />} />
```

---

## Archivos a Crear

| Archivo | Descripción |
|---------|-------------|
| `src/pages/FirmaDigital.tsx` | Página con iframe embebido |
| `src/pages/AgenticRAG.tsx` | Página placeholder en desarrollo |

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/layout/Sidebar.tsx` | Agregar grupo Plataforma IA con 2 items |
| `src/App.tsx` | Agregar 2 rutas nuevas |

---

## Diseño Visual

### Sidebar
- Los items de "Plataforma IA" aparecerán debajo de "Administración"
- Usarán un estilo distintivo similar al de admin (borde y fondo sutil)
- Solo visibles para super admins

### Firma Digital
- Header minimalista con botón de retorno
- Iframe a pantalla completa sin bordes
- El dominio queda completamente oculto al usuario

### AgenticRAG
- Diseño centrado con icono animado
- Mensaje claro de "En Desarrollo"
- Badge de "Próximamente"

---

## Sección Técnica

### Seguridad del Iframe
El atributo `sandbox` limita las capacidades del iframe:
- `allow-scripts`: Permite ejecución de JavaScript
- `allow-same-origin`: Necesario para autenticación
- `allow-forms`: Permite envío de formularios
- `allow-popups`: Permite ventanas emergentes si necesarias

### Protección de Rutas
Ambas páginas verificarán `isSuperAdmin` antes de renderizar, redirigiendo a `/dashboard` si el usuario no tiene permisos.


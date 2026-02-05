import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  FileDown, 
  Users, 
  Building2, 
  Target, 
  CheckSquare, 
  MessageSquare, 
  FolderKanban,
  Brain,
  Shield,
  Settings,
  Database,
  Bell,
  Plug,
  BarChart3,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

interface Feature {
  name: string;
  description: string;
  status?: "stable" | "beta" | "new";
}

interface Module {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: Feature[];
}

const modules: Module[] = [
  {
    icon: <Users className="h-6 w-6" />,
    title: "Gestión de Contactos",
    description: "Sistema completo para administrar leads y contactos comerciales",
    features: [
      { name: "Creación y edición de contactos", description: "Formularios completos con validación de datos" },
      { name: "Importación masiva (CSV/Excel)", description: "Hasta 1500+ registros con mapeo automático de columnas", status: "stable" },
      { name: "Campos personalizados", description: "WhatsApp, Instagram, teléfono alternativo" },
      { name: "Historial de timeline", description: "Registro cronológico de todas las interacciones" },
      { name: "Documentos adjuntos", description: "Contratos, propuestas, acuerdos por contacto" },
      { name: "Asignación a proyectos", description: "Relación muchos-a-muchos con proyectos/unidades de negocio" },
      { name: "Estados de contacto", description: "Lead, Calificado, Cliente, Inactivo" },
      { name: "Nivel de interés", description: "Escala 1-10 para priorización" },
      { name: "Fuente de origen", description: "Tracking de canal: Manual, Webchat, WhatsApp, Instagram, Email" },
      { name: "Búsqueda y filtros avanzados", description: "Por nombre, email, empresa, proyecto" },
    ]
  },
  {
    icon: <Building2 className="h-6 w-6" />,
    title: "Gestión de Empresas",
    description: "Administración de cuentas corporativas y organizaciones",
    features: [
      { name: "Perfil completo de empresa", description: "Nombre, dominio, industria, tamaño, ingresos" },
      { name: "Contactos asociados", description: "Vista de todos los contactos de la empresa" },
      { name: "Oportunidades de la empresa", description: "Deals asociados a la cuenta" },
      { name: "Timeline unificado", description: "Historial de interacciones a nivel empresa" },
      { name: "Documentos corporativos", description: "Contratos marco, acuerdos comerciales" },
      { name: "Información de ubicación", description: "Dirección, ciudad, país" },
      { name: "Redes sociales", description: "LinkedIn, Twitter corporativo" },
      { name: "Logo de empresa", description: "Carga y visualización de imagen corporativa" },
    ]
  },
  {
    icon: <Target className="h-6 w-6" />,
    title: "Pipeline de Ventas",
    description: "Gestión visual del embudo de ventas con Kanban",
    features: [
      { name: "Vista Kanban drag & drop", description: "Arrastrar oportunidades entre etapas" },
      { name: "Pipelines múltiples", description: "Diferentes embudos para distintos productos/servicios" },
      { name: "Etapas personalizables", description: "Nombre, color, probabilidad, posición" },
      { name: "Valores de oportunidad", description: "Monto, moneda, probabilidad de cierre" },
      { name: "Fecha de cierre esperada", description: "Proyección de ingresos" },
      { name: "Estados: Abierto/Ganado/Perdido", description: "Con registro de razón de pérdida" },
      { name: "Asociación a contactos y empresas", description: "Vinculación completa de entidades" },
      { name: "Asignación por proyecto", description: "Filtrado de deals por unidad de negocio" },
      { name: "Métricas de pipeline", description: "Valor total, tasa de conversión" },
    ]
  },
  {
    icon: <CheckSquare className="h-6 w-6" />,
    title: "Tareas y Actividades",
    description: "Gestión de productividad y seguimiento de acciones",
    features: [
      { name: "Tipos de actividad", description: "Tarea, Llamada, Email, Reunión, Nota" },
      { name: "Prioridades", description: "Baja, Media, Alta, Urgente con colores distintivos" },
      { name: "Fechas de vencimiento", description: "Selector de fecha para planificación" },
      { name: "Estado completado", description: "Checkbox con marca de tiempo" },
      { name: "Vinculación a entidades", description: "Contacto, Empresa, Oportunidad asociados" },
      { name: "Filtros por tipo y estado", description: "Vista de tareas pendientes/completadas" },
      { name: "Asignación a miembros", description: "Delegación de tareas dentro del equipo" },
    ]
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Conversaciones Omnicanal",
    description: "Centro unificado de comunicación multicanal",
    features: [
      { name: "Webchat integrado", description: "Widget para sitios web con script de inserción", status: "stable" },
      { name: "WhatsApp vía ManyChat", description: "Integración con API de ManyChat" },
      { name: "Instagram DM", description: "Mensajes directos de Instagram" },
      { name: "Facebook Messenger", description: "Conversaciones de Messenger" },
      { name: "Creación automática de leads", description: "Cada conversación genera/actualiza contacto" },
      { name: "Algoritmo de matching", description: "Email > Teléfono > IG Username > ID Proveedor" },
      { name: "Historial de mensajes", description: "Timeline completo de la conversación" },
      { name: "Notas internas", description: "Comentarios privados en conversaciones" },
      { name: "Asignación de agentes", description: "Distribución de conversaciones por equipo" },
      { name: "Estados de conversación", description: "Activa, En espera, Resuelta, Spam" },
    ]
  },
  {
    icon: <FolderKanban className="h-6 w-6" />,
    title: "Proyectos y Unidades de Negocio",
    description: "Segmentación avanzada por líneas de negocio",
    features: [
      { name: "Tipos de proyecto", description: "Inmobiliario, Construcción, Marca, Producto, Departamento, Ubicación" },
      { name: "Filtro global", description: "Selector en header que afecta toda la aplicación", status: "stable" },
      { name: "Métricas por proyecto", description: "Contactos, empresas, oportunidades, valor pipeline" },
      { name: "Asignación de contactos", description: "Relación muchos-a-muchos con estados" },
      { name: "Miembros de proyecto", description: "Roles: Owner, Admin, Member, Viewer" },
      { name: "Datos del proyecto", description: "Presupuesto, meta de ingresos, fechas" },
      { name: "Información geográfica", description: "Ubicación, dirección, ciudad, país" },
      { name: "Personalización visual", description: "Color, icono, imagen del proyecto" },
      { name: "Códigos de proyecto", description: "Identificadores únicos para referencia" },
    ]
  },
  {
    icon: <Brain className="h-6 w-6" />,
    title: "Asistente de IA",
    description: "Copiloto inteligente con 30+ herramientas especializadas",
    features: [
      { name: "Chat conversacional", description: "Interfaz natural de lenguaje para comandos" },
      { name: "Creación de contactos", description: "create_contact con todos los campos" },
      { name: "Búsqueda inteligente", description: "search_contacts, search_companies, search_opportunities" },
      { name: "Gestión de pipeline", description: "create_opportunity, update_opportunity, list_opportunities" },
      { name: "Herramientas de etapas", description: "create_stage, update_stage, get_pipeline_stages" },
      { name: "Gestión de tareas", description: "create_task, update_task, list_tasks" },
      { name: "Programación de reuniones", description: "schedule_meeting con fecha, hora, participantes" },
      { name: "Adición de notas", description: "add_note a cualquier entidad" },
      { name: "Herramientas de proyectos", description: "list_projects, create_project, get_project_stats", status: "new" },
      { name: "Análisis de contactos por proyecto", description: "add_contact_to_project, get_project_contacts" },
      { name: "Búsqueda de proyectos", description: "search_projects por nombre o tipo" },
      { name: "Daily Brief", description: "Resumen diario de actividades y prioridades" },
      { name: "Insights automáticos", description: "Sugerencias basadas en datos del CRM" },
    ]
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Gestión de Equipo",
    description: "Administración de usuarios y colaboración",
    features: [
      { name: "Invitación de miembros", description: "Por email con vinculación automática al registro", status: "stable" },
      { name: "Roles de equipo", description: "Admin, Manager, Sales Rep, Viewer" },
      { name: "Cuotas de venta", description: "Mensuales y trimestrales por miembro" },
      { name: "Valor de deals cerrados", description: "Tracking de performance individual" },
      { name: "Estados de invitación", description: "Pendiente, Activo, Inactivo" },
      { name: "Feed de actividad", description: "Timeline de acciones del equipo" },
      { name: "Comentarios y menciones", description: "Colaboración en entidades (@usuario)" },
      { name: "Asignación de registros", description: "Contactos, empresas, deals por miembro" },
    ]
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Administración y Seguridad",
    description: "Control de acceso y configuración del sistema",
    features: [
      { name: "Multi-tenancy jerárquico", description: "Super Admin > Reseller > Sub-cliente", status: "stable" },
      { name: "Panel Super Admin", description: "Gestión global de organizaciones" },
      { name: "Panel Reseller", description: "Marca blanca para distribuidores" },
      { name: "Aprobación de organizaciones", description: "Flujo de aprobación/rechazo" },
      { name: "Dominios verificados", description: "Asociación de dominios a organizaciones" },
      { name: "Row Level Security (RLS)", description: "Aislamiento de datos por organización" },
      { name: "Autenticación JWT", description: "Tokens seguros con Supabase Auth" },
      { name: "Recuperación de contraseña", description: "Flujo de reset por email" },
      { name: "Magic Links", description: "Inicio de sesión sin contraseña" },
    ]
  },
  {
    icon: <Settings className="h-6 w-6" />,
    title: "Marca Blanca (White Label)",
    description: "Personalización completa de la plataforma",
    features: [
      { name: "Logo personalizado", description: "Carga de imagen corporativa" },
      { name: "Colores de marca", description: "Primario y secundario personalizables" },
      { name: "Nombre de empresa", description: "Visible en header y contexto" },
      { name: "Favicon personalizado", description: "Icono de pestaña del navegador" },
      { name: "Herencia de branding", description: "Sub-clientes heredan del reseller padre" },
      { name: "Dominios personalizados", description: "Configuración de custom domains" },
    ]
  },
  {
    icon: <Database className="h-6 w-6" />,
    title: "Gestión de Datos",
    description: "Importación, exportación y mantenimiento de datos",
    features: [
      { name: "Importación CSV/Excel", description: "Con mapeo automático de columnas", status: "stable" },
      { name: "Procesamiento por lotes", description: "Batches de 100 registros para archivos grandes" },
      { name: "Exportación de datos", description: "JSON, CSV (solo admin de cuenta)" },
      { name: "Detección de duplicados", description: "Escaneo automático de registros similares" },
      { name: "Fusión de duplicados", description: "Merge inteligente de registros" },
      { name: "Operaciones masivas", description: "Actualización y eliminación en lote" },
      { name: "Log de auditoría", description: "Historial completo de cambios" },
      { name: "Backups automáticos", description: "Copias de seguridad programadas" },
    ]
  },
  {
    icon: <Plug className="h-6 w-6" />,
    title: "Integraciones",
    description: "Conexiones con servicios externos",
    features: [
      { name: "Gmail", description: "Sincronización de correos y contactos" },
      { name: "ManyChat", description: "WhatsApp, Instagram, Messenger" },
      { name: "Webchat Widget", description: "Script embebible para sitios web" },
      { name: "n8n Webhooks", description: "Automatizaciones personalizadas" },
      { name: "API de Lovable AI Gateway", description: "Modelos Gemini y GPT integrados" },
    ]
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Notificaciones",
    description: "Sistema de alertas y recordatorios",
    features: [
      { name: "Centro de notificaciones", description: "Campana con badge de no leídas" },
      { name: "Recordatorios de tareas", description: "Alertas antes del vencimiento" },
      { name: "Actualizaciones de deals", description: "Cambios en oportunidades" },
      { name: "Nuevos contactos", description: "Notificación de leads entrantes" },
      { name: "Sincronización de email", description: "Estado de importación de correos" },
      { name: "Preferencias configurables", description: "Browser, email, horas de anticipación" },
    ]
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Dashboard y Métricas",
    description: "Visualización de KPIs y rendimiento",
    features: [
      { name: "Resumen de pipeline", description: "Valor total y por etapa" },
      { name: "Actividades pendientes", description: "Contador de tareas próximas" },
      { name: "Contactos recientes", description: "Últimas interacciones" },
      { name: "Daily Brief con IA", description: "Resumen inteligente del día" },
      { name: "Insights automáticos", description: "Sugerencias basadas en patrones" },
      { name: "Métricas por proyecto", description: "Tasa de conversión, valor pipeline" },
      { name: "Performance de equipo", description: "Cuotas vs. cerrados por miembro" },
    ]
  },
];

export default function CRMDocumentation() {
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  const exportToPDF = async () => {
    setIsExporting(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkNewPage = (requiredHeight: number) => {
        if (yPosition + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // Title Page
      pdf.setFontSize(28);
      pdf.setTextColor(30, 64, 175); // Blue
      pdf.text("NeumanCRM", pageWidth / 2, 60, { align: 'center' });
      
      pdf.setFontSize(18);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Documentación de Funcionalidades", pageWidth / 2, 75, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Generado: ${new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, pageWidth / 2, 90, { align: 'center' });

      // Stats summary
      const totalFeatures = modules.reduce((sum, m) => sum + m.features.length, 0);
      pdf.setFontSize(14);
      pdf.setTextColor(60, 60, 60);
      pdf.text(`${modules.length} Módulos • ${totalFeatures}+ Funcionalidades`, pageWidth / 2, 110, { align: 'center' });

      // Table of Contents
      pdf.addPage();
      yPosition = margin;
      
      pdf.setFontSize(20);
      pdf.setTextColor(30, 64, 175);
      pdf.text("Tabla de Contenidos", margin, yPosition);
      yPosition += 15;

      pdf.setFontSize(12);
      pdf.setTextColor(60, 60, 60);
      
      modules.forEach((module, index) => {
        checkNewPage(10);
        pdf.text(`${index + 1}. ${module.title}`, margin, yPosition);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`(${module.features.length} funcionalidades)`, margin + 100, yPosition);
        pdf.setTextColor(60, 60, 60);
        yPosition += 8;
      });

      // Module Details
      modules.forEach((module, moduleIndex) => {
        pdf.addPage();
        yPosition = margin;

        // Module Header
        pdf.setFontSize(18);
        pdf.setTextColor(30, 64, 175);
        pdf.text(`${moduleIndex + 1}. ${module.title}`, margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.setTextColor(100, 100, 100);
        const descLines = pdf.splitTextToSize(module.description, contentWidth);
        pdf.text(descLines, margin, yPosition);
        yPosition += (descLines.length * 5) + 10;

        // Features
        module.features.forEach((feature, featureIndex) => {
          checkNewPage(20);

          // Feature name
          pdf.setFontSize(11);
          pdf.setTextColor(40, 40, 40);
          pdf.setFont('helvetica', 'bold');
          
          let featureName = `• ${feature.name}`;
          if (feature.status) {
            featureName += ` [${feature.status.toUpperCase()}]`;
          }
          pdf.text(featureName, margin, yPosition);
          yPosition += 5;

          // Feature description
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(80, 80, 80);
          const featureDescLines = pdf.splitTextToSize(feature.description, contentWidth - 10);
          pdf.text(featureDescLines, margin + 5, yPosition);
          yPosition += (featureDescLines.length * 4) + 6;
        });
      });

      // Footer on last page
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text("NeumanCRM - Plataforma de Gestión de Relaciones con Clientes", pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save PDF
      pdf.save('NeumanCRM_Documentacion_Funcionalidades.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalFeatures = modules.reduce((sum, m) => sum + m.features.length, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Documentación del CRM</h1>
              <p className="text-muted-foreground text-sm">
                {modules.length} módulos • {totalFeatures}+ funcionalidades
              </p>
            </div>
          </div>
          <Button onClick={exportToPDF} disabled={isExporting} size="lg">
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4 mr-2" />
                Exportar PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="container mx-auto px-4 py-8">
          <div className="grid gap-6">
            {modules.map((module, index) => (
              <Card key={index} className="overflow-hidden">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {module.icon}
                    </div>
                    <div>
                      <CardTitle className="text-xl">{module.title}</CardTitle>
                      <p className="text-muted-foreground text-sm mt-1">
                        {module.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-auto">
                      {module.features.length} funcionalidades
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {module.features.map((feature, fIndex) => (
                      <div 
                        key={fIndex} 
                        className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{feature.name}</span>
                              {feature.status && (
                                <Badge 
                                  variant={
                                    feature.status === 'new' ? 'default' : 
                                    feature.status === 'beta' ? 'secondary' : 
                                    'outline'
                                  }
                                  className="text-xs"
                                >
                                  {feature.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {feature.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary Footer */}
          <Card className="mt-8 bg-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Resumen Total</h3>
                <div className="flex justify-center gap-8 text-sm">
                  <div>
                    <span className="text-2xl font-bold text-primary">{modules.length}</span>
                    <p className="text-muted-foreground">Módulos</p>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-primary">{totalFeatures}</span>
                    <p className="text-muted-foreground">Funcionalidades</p>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-primary">30+</span>
                    <p className="text-muted-foreground">Herramientas IA</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

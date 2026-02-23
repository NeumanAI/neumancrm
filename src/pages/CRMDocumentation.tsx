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
  ArrowLeft,
  CalendarDays,
  FileText,
  UserCheck
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
    description: "Captura, organiza y da seguimiento a todos tus prospectos y clientes en un solo lugar",
    features: [
      { name: "Fichas completas de contacto", description: "Toda la información de tu prospecto en una sola vista: datos, historial, documentos y más" },
      { name: "Importación masiva", description: "Sube tu base de datos desde Excel o CSV con mapeo automático de columnas — hasta 1,500+ registros de una vez", status: "stable" },
      { name: "Canales de contacto unificados", description: "WhatsApp, Instagram, teléfono, email — todos los datos de contacto en un mismo perfil" },
      { name: "Historial completo de interacciones", description: "Timeline cronológico de cada llamada, email, reunión y nota con el contacto" },
      { name: "Documentos por contacto", description: "Adjunta contratos, propuestas y acuerdos directamente al perfil del prospecto" },
      { name: "Segmentación por proyecto", description: "Asigna contactos a múltiples unidades de negocio o proyectos simultáneamente" },
      { name: "Estados inteligentes", description: "Clasifica automáticamente: Lead, Calificado, Cliente o Inactivo" },
      { name: "Nivel de interés", description: "Prioriza tu atención con una escala visual de 1 a 10" },
      { name: "Rastreo de origen", description: "Sabe exactamente de dónde vino cada lead: Webchat, WhatsApp, Instagram, Email o captura manual" },
      { name: "Búsqueda y filtros avanzados", description: "Encuentra cualquier contacto en segundos filtrando por nombre, empresa, proyecto o asesor" },
    ]
  },
  {
    icon: <Building2 className="h-6 w-6" />,
    title: "Gestión de Empresas",
    description: "Administra cuentas corporativas con visión completa de contactos, oportunidades y documentos",
    features: [
      { name: "Perfil corporativo completo", description: "Nombre, sitio web, industria, tamaño del equipo e ingresos estimados en una vista" },
      { name: "Contactos de la empresa", description: "Ve todos los contactos asociados a cada cuenta corporativa" },
      { name: "Oportunidades vinculadas", description: "Visualiza todos los deals abiertos con la empresa de un vistazo" },
      { name: "Timeline unificado", description: "Historial completo de todas las interacciones a nivel empresa" },
      { name: "Documentos corporativos", description: "Contratos marco, acuerdos comerciales y propuestas centralizados" },
      { name: "Ubicación y datos geográficos", description: "Dirección, ciudad y país para segmentación regional" },
      { name: "Redes sociales corporativas", description: "LinkedIn y Twitter de la empresa siempre a la mano" },
      { name: "Logo e identidad visual", description: "Identifica rápidamente cada cuenta con su imagen corporativa" },
    ]
  },
  {
    icon: <Target className="h-6 w-6" />,
    title: "Pipeline de Ventas",
    description: "Visualiza y controla tu embudo de ventas con tablero Kanban interactivo",
    features: [
      { name: "Tablero Kanban visual", description: "Arrastra y suelta oportunidades entre etapas — ve el estado de tus ventas de un vistazo" },
      { name: "Múltiples pipelines", description: "Crea embudos distintos para cada producto, servicio o línea de negocio" },
      { name: "Etapas personalizables", description: "Define nombres, colores y probabilidades para cada fase de tu proceso de venta" },
      { name: "Valor y probabilidad", description: "Registra el monto de cada oportunidad y su probabilidad de cierre" },
      { name: "Proyección de cierre", description: "Fecha esperada de cierre para planificar tus ingresos" },
      { name: "Ganado / Perdido con razón", description: "Registra el resultado final y el motivo — aprende de cada negociación" },
      { name: "Vinculación completa", description: "Asocia cada oportunidad a contactos, empresas y proyectos" },
      { name: "Filtrado por proyecto", description: "Ve solo los deals de la unidad de negocio que te interesa" },
      { name: "Métricas del pipeline", description: "Valor total en juego, tasa de conversión y velocidad del embudo" },
    ]
  },
  {
    icon: <CheckSquare className="h-6 w-6" />,
    title: "Tareas y Actividades",
    description: "Nunca pierdas un seguimiento — organiza llamadas, reuniones, emails y pendientes",
    features: [
      { name: "5 tipos de actividad", description: "Tarea, Llamada, Email, Reunión y Nota — cada una con su icono y flujo" },
      { name: "Prioridades visuales", description: "Baja, Media, Alta y Urgente con colores distintivos para enfocarte en lo importante" },
      { name: "Fechas de vencimiento", description: "Planifica cuándo debe completarse cada seguimiento" },
      { name: "Marca de completado", description: "Un clic para cerrar la tarea con registro automático de fecha y hora" },
      { name: "Vinculación a entidades", description: "Asocia cada tarea a un contacto, empresa u oportunidad específica" },
      { name: "Filtros inteligentes", description: "Ve solo las tareas pendientes, completadas o filtradas por tipo" },
      { name: "Asignación al equipo", description: "Delega tareas a miembros de tu equipo con seguimiento de cumplimiento" },
    ]
  },
  {
    icon: <MessageSquare className="h-6 w-6" />,
    title: "Conversaciones Omnicanal",
    description: "WhatsApp, Instagram, Messenger y Webchat — todos tus canales en un solo inbox",
    features: [
      { name: "Webchat para tu sitio web", description: "Widget embebible listo para pegar en cualquier página web", status: "stable" },
      { name: "WhatsApp vía ManyChat", description: "Recibe y responde mensajes de WhatsApp directamente desde el CRM" },
      { name: "Instagram Direct", description: "Gestiona mensajes directos de Instagram sin salir de la plataforma" },
      { name: "Facebook Messenger", description: "Atiende conversaciones de Messenger en el mismo inbox" },
      { name: "Creación automática de leads", description: "Cada nueva conversación genera o actualiza un contacto automáticamente" },
      { name: "Matching inteligente", description: "Identifica contactos existentes por email, teléfono, usuario de IG o ID externo" },
      { name: "Historial completo", description: "Todo el hilo de la conversación visible en un timeline limpio" },
      { name: "Notas internas", description: "Deja comentarios privados que solo tu equipo puede ver" },
      { name: "Asignación de agentes", description: "Distribuye las conversaciones entre los miembros del equipo" },
      { name: "Estados de conversación", description: "Clasifica en Activa, En espera, Resuelta o Spam para mantener el orden" },
    ]
  },
  {
    icon: <FolderKanban className="h-6 w-6" />,
    title: "Proyectos y Unidades de Negocio",
    description: "Segmenta toda tu operación por líneas de negocio, marcas, ubicaciones o productos",
    features: [
      { name: "6 tipos de proyecto", description: "Inmobiliario, Construcción, Marca, Producto, Departamento y Ubicación" },
      { name: "Filtro global en toda la app", description: "Selecciona un proyecto y toda la plataforma muestra solo esos datos", status: "stable" },
      { name: "Métricas por proyecto", description: "Contactos, empresas, oportunidades y valor del pipeline de cada uno" },
      { name: "Asignación de contactos", description: "Relaciona prospectos con uno o más proyectos con estados individuales" },
      { name: "Roles de proyecto", description: "Owner, Admin, Miembro y Viewer — controla quién ve y edita qué" },
      { name: "Presupuesto y metas", description: "Define meta de ingresos, presupuesto y fechas de cada proyecto" },
      { name: "Información geográfica", description: "Ubicación, dirección y ciudad para proyectos con presencia física" },
      { name: "Personalización visual", description: "Color, icono e imagen para identificar cada proyecto al instante" },
      { name: "Códigos de referencia", description: "Identificadores únicos para reportes y seguimiento interno" },
    ]
  },
  {
    icon: <Brain className="h-6 w-6" />,
    title: "Asistente de IA — 91+ Herramientas",
    description: "Tu copiloto de ventas con inteligencia artificial: habla en lenguaje natural y la IA ejecuta",
    features: [
      { name: "Gestión de contactos y prospectos", description: "Crea, busca, actualiza y perfila contactos solo con pedírselo a la IA", status: "stable" },
      { name: "Pipeline y oportunidades", description: "Crea deals, mueve etapas, analiza la salud de tus negociaciones" },
      { name: "Productividad inteligente", description: "Prioriza tu día, programa reuniones y recibe sugerencias de seguimiento automáticas" },
      { name: "Redacción de emails", description: "La IA te redacta correos profesionales y sugiere respuestas personalizadas" },
      { name: "WhatsApp y mensajería", description: "Responde mensajes de WhatsApp con sugerencias de la IA" },
      { name: "Análisis de sentimiento", description: "Detecta el tono emocional de correos y conversaciones" },
      { name: "Reportes instantáneos", description: "Pide reportes de ventas, conversión, forecast o actividad en lenguaje natural" },
      { name: "Colaboración de equipo", description: "Asigna contactos, notifica miembros y traspasa cuentas por IA" },
      { name: "Calendario inteligente", description: "Crea eventos, define metas y bloquea tiempo de enfoque con un comando", status: "new" },
      { name: "Gestión de documentos", description: "Sube, busca y comparte documentos asistido por IA" },
      { name: "Módulo inmobiliario", description: "Consulta inventario, busca unidades, cambia estatus y genera reportes maestros", status: "new" },
      { name: "Gestión comercial por asesor", description: "Consulta performance, ranking, cartera y traspasos de asesores", status: "new" },
      { name: "Daily Brief", description: "Resumen diario inteligente de tus prioridades, pendientes y oportunidades" },
      { name: "Predicción de cierre", description: "La IA analiza probabilidades de cierre basada en datos históricos" },
      { name: "Sugerencias de upsell", description: "Identifica oportunidades de venta cruzada y upselling automáticamente" },
    ]
  },
  {
    icon: <UserCheck className="h-6 w-6" />,
    title: "Gestión Comercial por Asesor",
    description: "Atribución, ranking y traspasos de cartera — mide el desempeño de cada asesor",
    features: [
      { name: "Atribución automática", description: "Cada contacto se asigna automáticamente al asesor que lo capturó", status: "new" },
      { name: "Dashboard de desempeño", description: "KPIs individuales: contactos, deals cerrados, tasa de conversión y valor" },
      { name: "Ranking de asesores", description: "Tabla de posiciones por volumen de ventas y eficiencia" },
      { name: "Traspaso de cartera", description: "Transfiere contactos entre asesores con registro de motivo y fecha" },
      { name: "Traspaso masivo", description: "Mueve múltiples contactos de un asesor a otro en una sola acción" },
      { name: "Historial de asignaciones", description: "Trazabilidad completa de quién atendió a cada contacto y cuándo" },
      { name: "Filtros por asesor", description: "Filtra contactos y pipeline por asesor asignado" },
    ]
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Gestión de Equipo",
    description: "Invita a tu equipo, asigna roles y mide el rendimiento de cada miembro",
    features: [
      { name: "Invitación por email", description: "Agrega miembros con un email y se vinculan automáticamente a la organización", status: "stable" },
      { name: "Roles diferenciados", description: "Admin, Manager, Vendedor y Viewer — cada uno con permisos adecuados" },
      { name: "Cuotas de venta", description: "Define metas mensuales y trimestrales por vendedor" },
      { name: "Tracking de resultados", description: "Compara cuotas vs. deals cerrados en tiempo real" },
      { name: "Estados de miembros", description: "Pendiente, Activo e Inactivo para control de acceso" },
      { name: "Feed de actividad", description: "Timeline de todo lo que hace tu equipo: creaciones, ediciones, cierres" },
      { name: "Comentarios y menciones", description: "Colabora en cualquier entidad mencionando a compañeros con @" },
      { name: "Asignación de registros", description: "Distribuye contactos, empresas y deals entre tu equipo" },
    ]
  },
  {
    icon: <CalendarDays className="h-6 w-6" />,
    title: "Calendario Comercial",
    description: "Agenda inteligente con eventos, metas de venta y bloques de tiempo enfocado",
    features: [
      { name: "Vista de calendario completa", description: "Día, semana y mes con todos tus eventos comerciales", status: "new" },
      { name: "Eventos vinculados al CRM", description: "Cada reunión conectada a un contacto, empresa u oportunidad" },
      { name: "Metas de venta en calendario", description: "Visualiza tus objetivos mensuales directamente en la agenda" },
      { name: "Bloques de tiempo", description: "Reserva horas de enfoque para prospección, llamadas o seguimiento" },
      { name: "Sincronización con Google Calendar", description: "Bidireccional — lo que agendas aquí aparece allá y viceversa" },
      { name: "Recordatorios automáticos", description: "Notificaciones antes de cada evento para que nunca llegues tarde" },
      { name: "Colores por tipo", description: "Identifica visualmente reuniones, llamadas, seguimientos y bloques" },
    ]
  },
  {
    icon: <FileText className="h-6 w-6" />,
    title: "Gestión de Documentos",
    description: "Centraliza contratos, propuestas y archivos con categorización y búsqueda inteligente",
    features: [
      { name: "Repositorio centralizado", description: "Todos los documentos de tu organización en un solo lugar", status: "new" },
      { name: "Categorías personalizables", description: "Crea categorías con colores e iconos para organizar tus archivos" },
      { name: "Búsqueda con IA", description: "Encuentra documentos describiendo lo que buscas en lenguaje natural" },
      { name: "Compartir con enlace", description: "Genera links seguros con fecha de expiración para compartir externamente" },
      { name: "Documentos por contacto y empresa", description: "Adjunta archivos directamente a la ficha de cada entidad" },
      { name: "Tipos de documento", description: "Contrato, Propuesta, Factura, Acuerdo y más — clasificación automática" },
      { name: "Control de versiones", description: "Historial de cambios y actualizaciones de cada documento" },
    ]
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Dashboard y Métricas",
    description: "KPIs en tiempo real para tomar decisiones basadas en datos, no en intuición",
    features: [
      { name: "Resumen de pipeline", description: "Valor total en juego y desglose por etapa de tu embudo" },
      { name: "Actividades pendientes", description: "Cuántos seguimientos tienes próximos y cuáles son urgentes" },
      { name: "Contactos recientes", description: "Últimas interacciones para retomar donde dejaste" },
      { name: "Daily Brief con IA", description: "Cada mañana, un resumen inteligente de lo que necesitas hacer hoy" },
      { name: "Insights automáticos", description: "La IA detecta patrones y te sugiere acciones concretas" },
      { name: "Métricas por proyecto", description: "Tasa de conversión y valor del pipeline por cada unidad de negocio" },
      { name: "Performance del equipo", description: "Cuotas vs. cerrados por cada vendedor — identifica a tus top performers" },
    ]
  },
  {
    icon: <Plug className="h-6 w-6" />,
    title: "Integraciones",
    description: "Conecta con las herramientas que ya usas sin cambiar tu flujo de trabajo",
    features: [
      { name: "Gmail", description: "Sincroniza correos y contactos automáticamente con tu cuenta de Google" },
      { name: "Google Calendar", description: "Sincronización bidireccional de eventos y reuniones" },
      { name: "ManyChat", description: "WhatsApp, Instagram y Messenger conectados en un solo clic" },
      { name: "Webchat Widget", description: "Copia y pega un código en tu sitio web para recibir chats en vivo" },
      { name: "n8n y Webhooks", description: "Automatiza cualquier flujo personalizado con webhooks" },
      { name: "IA integrada", description: "Modelos de inteligencia artificial listos para usar sin configuración adicional" },
    ]
  },
  {
    icon: <Bell className="h-6 w-6" />,
    title: "Notificaciones Inteligentes",
    description: "Alertas en el momento justo para que no se te escape ninguna oportunidad",
    features: [
      { name: "Centro de notificaciones", description: "Campana con badge de no leídas — todo en un vistazo" },
      { name: "Recordatorios de tareas", description: "Alerta antes de que venza un seguimiento importante" },
      { name: "Cambios en oportunidades", description: "Entérate al instante cuando un deal cambia de etapa o se cierra" },
      { name: "Nuevos leads entrantes", description: "Notificación inmediata cuando llega un prospecto nuevo" },
      { name: "Estado de sincronización", description: "Sabe cuándo se importaron tus correos o se sincronizó el calendario" },
      { name: "Preferencias configurables", description: "Elige qué notificaciones quieres recibir y con cuánta anticipación" },
    ]
  },
  {
    icon: <Settings className="h-6 w-6" />,
    title: "Marca Blanca (White Label)",
    description: "Tu marca, tu plataforma — personaliza colores, logo y dominio",
    features: [
      { name: "Logo personalizado", description: "Sube el logo de tu empresa y aparece en toda la plataforma" },
      { name: "Colores de marca", description: "Define color primario y secundario para que todo se vea como tu marca" },
      { name: "Nombre de empresa", description: "Tu nombre de empresa visible en el header y en todo el contexto" },
      { name: "Favicon personalizado", description: "El icono de la pestaña del navegador también es tuyo" },
      { name: "Herencia de marca", description: "Tus sub-clientes heredan automáticamente tu identidad visual" },
      { name: "Dominios personalizados", description: "Usa tu propio dominio para que la plataforma sea 100% tuya" },
    ]
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Administración y Seguridad",
    description: "Control total sobre usuarios, organizaciones y datos — con aislamiento garantizado",
    features: [
      { name: "Multi-tenancy jerárquico", description: "Super Admin, Reseller y Sub-clientes — cada nivel con sus permisos", status: "stable" },
      { name: "Panel de Super Admin", description: "Gestiona todas las organizaciones desde un solo lugar" },
      { name: "Panel de Reseller", description: "Distribuye la plataforma como propia con tu marca" },
      { name: "Aprobación de organizaciones", description: "Controla quién puede acceder con flujo de aprobación manual" },
      { name: "Dominios verificados", description: "Asocia dominios a organizaciones para mayor seguridad" },
      { name: "Datos 100% aislados", description: "Cada organización solo ve sus propios datos — aislamiento total" },
      { name: "Autenticación segura", description: "Tokens JWT encriptados para proteger cada sesión" },
      { name: "Recuperación de contraseña", description: "Flujo automático de reset por email" },
      { name: "Inicio sin contraseña", description: "Magic Links para acceder con un solo clic desde tu email" },
    ]
  },
  {
    icon: <Database className="h-6 w-6" />,
    title: "Gestión de Datos",
    description: "Importa, exporta y mantén tu base de datos limpia y actualizada",
    features: [
      { name: "Importación CSV/Excel", description: "Sube archivos con mapeo automático de columnas — sin configuración técnica", status: "stable" },
      { name: "Procesamiento de archivos grandes", description: "Maneja miles de registros en lotes automáticos" },
      { name: "Exportación de datos", description: "Descarga tu información en JSON o CSV cuando la necesites" },
      { name: "Detección de duplicados", description: "Escaneo automático que encuentra registros similares" },
      { name: "Fusión inteligente", description: "Combina duplicados conservando la mejor información de cada uno" },
      { name: "Operaciones masivas", description: "Actualiza o elimina cientos de registros en una sola acción" },
      { name: "Auditoría completa", description: "Historial de quién cambió qué, cuándo y desde dónde" },
      { name: "Backups automáticos", description: "Copias de seguridad programadas para proteger tu información" },
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
      pdf.setTextColor(30, 64, 175);
      pdf.text("NeumanCRM", pageWidth / 2, 60, { align: 'center' });
      
      pdf.setFontSize(18);
      pdf.setTextColor(100, 100, 100);
      pdf.text("Funcionalidades de la Plataforma", pageWidth / 2, 75, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Generado: ${new Date().toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, pageWidth / 2, 90, { align: 'center' });

      const totalFeatures = modules.reduce((sum, m) => sum + m.features.length, 0);
      pdf.setFontSize(14);
      pdf.setTextColor(60, 60, 60);
      pdf.text(`${modules.length} Módulos • ${totalFeatures}+ Funcionalidades • 91+ Herramientas IA`, pageWidth / 2, 110, { align: 'center' });

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

        pdf.setFontSize(18);
        pdf.setTextColor(30, 64, 175);
        pdf.text(`${moduleIndex + 1}. ${module.title}`, margin, yPosition);
        yPosition += 10;

        pdf.setFontSize(11);
        pdf.setTextColor(100, 100, 100);
        const descLines = pdf.splitTextToSize(module.description, contentWidth);
        pdf.text(descLines, margin, yPosition);
        yPosition += (descLines.length * 5) + 10;

        module.features.forEach((feature) => {
          checkNewPage(20);

          pdf.setFontSize(11);
          pdf.setTextColor(40, 40, 40);
          pdf.setFont('helvetica', 'bold');
          
          let featureName = `• ${feature.name}`;
          if (feature.status) {
            featureName += ` [${feature.status.toUpperCase()}]`;
          }
          pdf.text(featureName, margin, yPosition);
          yPosition += 5;

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(80, 80, 80);
          const featureDescLines = pdf.splitTextToSize(feature.description, contentWidth - 10);
          pdf.text(featureDescLines, margin + 5, yPosition);
          yPosition += (featureDescLines.length * 4) + 6;
        });
      });

      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text("NeumanCRM - Plataforma Inteligente de Gestión Comercial", pageWidth / 2, pageHeight - 10, { align: 'center' });

      pdf.save('NeumanCRM_Funcionalidades.pdf');
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error generating PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const totalFeatures = modules.reduce((sum, m) => sum + m.features.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Funcionalidades de NeumanCRM</h1>
              <p className="text-muted-foreground text-sm">
                {modules.length} módulos • {totalFeatures}+ funcionalidades • 91+ herramientas IA
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
                    <span className="text-2xl font-bold text-primary">91+</span>
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

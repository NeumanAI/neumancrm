export type VerticalId = 'general' | 'real_estate' | 'health';

export interface VerticalVocabulary {
  contact: string;
  contacts: string;
  contactAlt?: string;
  deal: string;
  deals: string;
  pipeline: string;
  company: string;
  companies: string;
  note: string;
}

export interface VerticalConfig {
  id: VerticalId;
  brandName: string;
  brandTagline: string;
  description: string;
  icon: string;
  color: string;
  modules: string[];
  vocabulary: VerticalVocabulary;
  aiContext: string;
  onboardingWelcome: string;
  pipelineStages: string[];
  comingSoon?: boolean;
}

export const VERTICALS: Record<VerticalId, VerticalConfig> = {
  general: {
    id: 'general',
    brandName: 'StarterCRM',
    brandTagline: 'El CRM inteligente para tu negocio',
    description: 'Para agencias, restaurantes, consultoras, tecnología y cualquier PYME',
    icon: '🚀',
    color: '#6366f1',
    modules: [],
    vocabulary: {
      contact: 'Contacto',
      contacts: 'Contactos',
      deal: 'Oportunidad',
      deals: 'Oportunidades',
      pipeline: 'Pipeline',
      company: 'Empresa',
      companies: 'Empresas',
      note: 'Nota',
    },
    aiContext: 'Eres el asistente de ventas de una empresa. Ayudas a gestionar contactos, oportunidades de venta y el seguimiento comercial.',
    onboardingWelcome: 'Soy tu asistente de StarterCRM. Voy a ayudarte a configurar tu CRM en minutos.',
    pipelineStages: ['Prospecto', 'Contactado', 'Propuesta enviada', 'Negociación', 'Cerrado'],
  },
  real_estate: {
    id: 'real_estate',
    brandName: 'BitanAI',
    brandTagline: 'CRM inteligente para constructoras',
    description: 'Para constructoras, inmobiliarias y desarrolladores de proyectos',
    icon: '🏗',
    color: '#f97316',
    modules: ['real_estate', 'real_estate_portfolio'],
    vocabulary: {
      contact: 'Prospecto',
      contacts: 'Prospectos',
      contactAlt: 'Comprador',
      deal: 'Separación',
      deals: 'Separaciones',
      pipeline: 'Embudo Comercial',
      company: 'Constructora',
      companies: 'Constructoras',
      note: 'Observación',
    },
    aiContext: 'Eres el asistente comercial de una constructora inmobiliaria. Ayudas a gestionar proyectos, unidades, prospectos, compradores, asesores comerciales y cartera de financiamiento.',
    onboardingWelcome: 'Soy tu asistente de BitanAI. Voy a ayudarte a configurar tu CRM para constructoras en minutos.',
    pipelineStages: ['Prospecto', 'Visita al proyecto', 'Propuesta', 'Negociación', 'Cierre'],
  },
  health: {
    id: 'health',
    brandName: 'Openmedic',
    brandTagline: 'CRM inteligente para clínicas',
    description: 'Para clínicas, consultorios médicos y centros de salud',
    icon: '🏥',
    color: '#10b981',
    modules: [],
    vocabulary: {
      contact: 'Paciente',
      contacts: 'Pacientes',
      deal: 'Consulta',
      deals: 'Consultas',
      pipeline: 'Agenda de Atención',
      company: 'Clínica',
      companies: 'Clínicas',
      note: 'Evolución Clínica',
    },
    aiContext: 'Eres el asistente de una clínica médica. Ayudas a gestionar pacientes, consultas y el seguimiento de tratamientos.',
    onboardingWelcome: 'Soy tu asistente de Openmedic. Voy a ayudarte a configurar tu CRM médico en minutos.',
    pipelineStages: ['Consulta inicial', 'Diagnóstico', 'Propuesta de tratamiento', 'Seguimiento', 'Alta'],
    comingSoon: true,
  },
};

export function getVerticalConfig(verticalId: VerticalId | string | null | undefined): VerticalConfig {
  if (verticalId && verticalId in VERTICALS) {
    return VERTICALS[verticalId as VerticalId];
  }
  return VERTICALS.general;
}

export function getVerticalModules(verticalId: VerticalId): Record<string, boolean> {
  const config = VERTICALS[verticalId];
  const modules: Record<string, boolean> = {};
  for (const mod of config.modules) {
    modules[mod] = true;
  }
  return modules;
}

export function getAvailableVerticals(): VerticalConfig[] {
  return Object.values(VERTICALS);
}

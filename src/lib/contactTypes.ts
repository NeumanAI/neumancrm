export type ContactType = 'prospecto' | 'comprador' | 'empresa' | 'inactivo';

export const CONTACT_TYPE_OPTIONS: ContactType[] = ['prospecto', 'comprador', 'empresa', 'inactivo'];

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  prospecto: 'Prospecto',
  comprador: 'Comprador',
  empresa: 'Empresa',
  inactivo: 'Inactivo',
};

export const CONTACT_TYPE_DESCRIPTIONS: Record<ContactType, string> = {
  prospecto: 'Contacto en etapa de exploración o interés inicial',
  comprador: 'Cliente que ha realizado una compra o tiene unidad asignada',
  empresa: 'Contacto corporativo o representante de empresa',
  inactivo: 'Contacto que no está activo actualmente',
};

export const CONTACT_TYPE_COLORS: Record<ContactType, string> = {
  prospecto: 'bg-blue-100 text-blue-800 border-blue-200',
  comprador: 'bg-teal-100 text-teal-800 border-teal-200',
  empresa: 'bg-purple-100 text-purple-800 border-purple-200',
  inactivo: 'bg-gray-100 text-gray-500 border-gray-200',
};

export const CONTACT_TYPE_ICONS: Record<ContactType, string> = {
  prospecto: 'UserSearch',
  comprador: 'UserCheck',
  empresa: 'Building2',
  inactivo: 'UserX',
};

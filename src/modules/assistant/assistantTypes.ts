// src/modules/assistant/assistantTypes.ts
export interface IASession {
  id: string;
  user_id: string;
  titre?: string;
  contexte?: string;
  module?: string;
  archive: boolean;
  created_at: string;
  updated_at: string;
}

export interface IAMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  contenu: string;
  tokens?: number;
  modele?: string;
  created_at: string;
}

export interface IABrouillon {
  id: string;
  conversation_id?: string;
  user_id: string;
  type: string;
  titre?: string;
  contenu: string;
  statut: 'brouillon' | 'propose' | 'valide' | 'refuse' | 'utilise';
  created_at: string;
}

export interface IAAction {
  id: string;
  conversation_id?: string;
  user_id?: string;
  type_action: string;
  description?: string;
  payload: Record<string, any>;
  statut: 'propose' | 'valide' | 'refuse' | 'execute' | 'annule';
  valide_par?: string;
  valide_le?: string;
  created_at: string;
}

export const CONTEXTES = [
  { value:'general',   label:'💬 Discussion générale' },
  { value:'events',    label:'🎉 Bella\'Events' },
  { value:'food',      label:'🍽 Bella\'Food' },
  { value:'bsh',       label:'🌸 Bella\'Secret Home' },
  { value:'vilo',      label:'📋 Vilo\'Assistance' },
  { value:'compta',    label:'💰 Comptabilité' },
  { value:'crm',       label:'👥 CRM Clients' },
  { value:'documents', label:'📁 Documents' },
  { value:'planning',  label:'📅 Planning' },
];

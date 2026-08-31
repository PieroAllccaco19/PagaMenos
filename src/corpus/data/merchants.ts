// PagaMenos · Corpus v1 registries: merchants, sources, research metadata. Pure data.
import type { Merchant, MerchantResearchMeta, Source } from '../types';

export const MERCHANTS: Merchant[] = [
  { merchantId: 'm_papa_johns', displayName: 'Papa Johns', category: 'FOOD' },
  { merchantId: 'm_chinawok', displayName: 'Chinawok', category: 'FOOD' },
  {
    merchantId: 'm_baco_y_vaca',
    displayName: 'Baco y Vaca',
    category: 'FOOD',
    aliases: ['Baco & Vaca'],
  },
  { merchantId: 'm_granja_azul', displayName: 'Granja Azul', category: 'FOOD' },
  { merchantId: 'm_fridays', displayName: 'TGI Fridays', category: 'FOOD', aliases: ['Fridays'] },
  {
    merchantId: 'm_uvk',
    displayName: 'UVK Multicines',
    category: 'ENTERTAINMENT',
    aliases: ['UVK'],
  },
  { merchantId: 'm_popeyes', displayName: 'Popeyes', category: 'FOOD' },
  { merchantId: 'm_cineplanet', displayName: 'Cineplanet', category: 'ENTERTAINMENT' },
  { merchantId: 'm_coney_park', displayName: 'Coney Park', category: 'ENTERTAINMENT' },
  { merchantId: 'm_coney_active', displayName: 'Coney Active', category: 'ENTERTAINMENT' },
  { merchantId: 'm_embarcadero_41', displayName: 'Embarcadero 41', category: 'FOOD' },
  {
    merchantId: 'm_issei',
    displayName: 'Issei Cocina Nikkei',
    category: 'FOOD',
    aliases: ['Issei'],
  },
  { merchantId: 'm_perroquet', displayName: 'Perroquet', category: 'FOOD' },
  { merchantId: 'm_villa_chicken', displayName: 'Villa Chicken', category: 'FOOD' },
];

export const SOURCES: Source[] = [
  {
    sourceId: 's_ibk_plin',
    providerFamily: 'IBK_PLIN',
    url: 'https://interbank.pe/promociones/descuentos/plinpromos',
    label: 'Interbank/Plin promos catalogue',
  },
  {
    sourceId: 's_ibk_promos',
    providerFamily: 'IBK_PLIN',
    url: 'https://interbank.pe/promociones',
    label: 'Interbank promotions catalogue',
  },
  {
    sourceId: 's_ibk_fridays',
    providerFamily: 'IBK_PLIN',
    url: 'https://interbank.pe/promociones/fridays',
    label: 'Interbank Fridays page',
  },
  {
    sourceId: 's_ibk_embarcadero',
    providerFamily: 'IBK_PLIN',
    url: 'https://interbank.pe/promociones/embarcadero-41',
    label: 'Interbank Embarcadero 41 page',
  },
  {
    sourceId: 's_ibk_amex',
    providerFamily: 'IBK_PLIN',
    url: 'https://interbank.pe/promociones',
    label: 'Interbank AMEX Cineplanet page',
  },
  {
    sourceId: 's_bcp_beneficios',
    providerFamily: 'BCP_QORE',
    url: 'https://www.viabcp.com/beneficios/tarjetas',
    label: 'BCP card benefits catalogue',
  },
  {
    sourceId: 's_bcp_popeyes',
    providerFamily: 'BCP_QORE',
    url: 'https://www.viabcp.com/beneficios/tarjetas/popeyes',
    label: 'BCP Popeyes page',
  },
  {
    sourceId: 's_bcp_granja',
    providerFamily: 'BCP_QORE',
    url: 'https://www.viabcp.com/beneficios/tarjetas/granja-azul',
    label: 'BCP Granja Azul page',
  },
  {
    sourceId: 's_bcp_baco',
    providerFamily: 'BCP_QORE',
    url: 'https://www.viabcp.com/beneficios/tarjetas/baco-y-vaca',
    label: 'BCP Baco y Vaca page',
  },
  {
    sourceId: 's_bcp_cineplanet',
    providerFamily: 'BCP_QORE',
    url: 'https://www.viabcp.com/beneficios/tarjetas/cineplanet-exclusivo',
    label: 'BCP AMEX Cineplanet page',
  },
  {
    sourceId: 's_bcp_qore',
    providerFamily: 'BCP_QORE',
    url: 'https://www.viabcp.com/qore/beneficios',
    label: 'BCP Qore benefits',
  },
  {
    sourceId: 's_sip_beneficios',
    providerFamily: 'SIP_OH',
    url: 'https://beneficios.sip.pe/promociones',
    label: 'Sip/Oh! benefits catalogue',
  },
  {
    sourceId: 's_diners_tasty',
    providerFamily: 'DINERS',
    url: 'https://dinersclubperu.pe/establecimientos/modo-tasty',
    label: 'Diners Modo Tasty',
  },
  {
    sourceId: 's_diners_fun',
    providerFamily: 'DINERS',
    url: 'https://dinersclubperu.pe/establecimientos/modo-fun',
    label: 'Diners Modo Fun',
  },
];

export const RESEARCH_META: MerchantResearchMeta[] = [
  {
    merchantId: 'm_papa_johns',
    overlapClass: 'O2',
    decisionClass: 'DECISION_ENGINE_CORE',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_chinawok',
    overlapClass: 'O2',
    decisionClass: 'DECISION_ENGINE_CORE',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_baco_y_vaca',
    overlapClass: 'O3',
    decisionClass: 'DIRECTORY_SUFFICIENT',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_granja_azul',
    overlapClass: 'O3',
    decisionClass: 'DECISION_ASSIST',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_fridays',
    overlapClass: 'O4_CONFIRMED',
    decisionClass: 'DECISION_ENGINE_CORE',
    verifyFirstOverlay: true,
  },
  {
    merchantId: 'm_uvk',
    overlapClass: 'O4_CONFIRMED',
    decisionClass: 'DECISION_ENGINE_CORE',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_popeyes',
    overlapClass: 'O2',
    decisionClass: 'DECISION_ENGINE_CORE',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_cineplanet',
    overlapClass: 'O2',
    decisionClass: 'DIRECTORY_SUFFICIENT',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_coney_park',
    overlapClass: 'O2',
    decisionClass: 'DIRECTORY_SUFFICIENT',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_coney_active',
    overlapClass: 'O2',
    decisionClass: 'DECISION_ASSIST',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_embarcadero_41',
    overlapClass: 'O4_CONFIRMED',
    decisionClass: 'DECISION_ENGINE_CORE',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_issei',
    overlapClass: 'O2',
    decisionClass: 'DIRECTORY_SUFFICIENT',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_perroquet',
    overlapClass: 'O4_CONFIRMED',
    decisionClass: 'DECISION_ENGINE_CORE',
    verifyFirstOverlay: false,
  },
  {
    merchantId: 'm_villa_chicken',
    overlapClass: 'O2',
    decisionClass: 'DECISION_ASSIST',
    verifyFirstOverlay: true,
  },
];

// PagaMenos · assembled Corpus v1 (pure data).
import { CORPUS_ID, FREEZE_TIMESTAMP } from '../ids';
import type { Corpus } from '../types';
import { MERCHANTS, RESEARCH_META, SOURCES } from './merchants';
import { ACTIVE_RULES, EXCLUDED_RULES, OPERATIONAL_STATES } from './rules';
import { SCOPES } from './scopes';

export const CORPUS_V1: Corpus = {
  corpusId: CORPUS_ID,
  freezeTimestamp: FREEZE_TIMESTAMP,
  merchants: MERCHANTS,
  sources: SOURCES,
  scopes: SCOPES,
  activeRules: ACTIVE_RULES,
  operationalStates: OPERATIONAL_STATES,
  researchMeta: RESEARCH_META,
  excludedRules: EXCLUDED_RULES,
};

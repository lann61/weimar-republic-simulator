import type { EventChoice, HistoricalEvent } from '../types';

export function c(
  id: string,
  label: string,
  short_term: string,
  long_term: string,
  vars: Record<string, number> = {},
  extra: Partial<EventChoice['effects']> = {},
  beneficiaries?: string[],
  losers?: string[]
): EventChoice {
  return { id, label, short_term, long_term, effects: { vars, ...extra }, beneficiaries, losers };
}

export function ev(e: Omit<HistoricalEvent, 'source_ids' | 'data_quality'> & { source_ids?: string[]; data_quality?: HistoricalEvent['data_quality'] }): HistoricalEvent {
  return {
    ...e,
    source_ids: e.source_ids ?? ['source_ushmm_weimar', 'source_bundestag_weimar'],
    data_quality: e.data_quality ?? 'historical_secondary',
  };
}

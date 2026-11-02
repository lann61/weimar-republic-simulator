import Dexie, { type Table } from 'dexie';
import type { GameState } from '../simulation/types';

export interface SaveRecord {
  id?: number;
  name: string;
  date: string;
  scenarioId: string;
  mode: string;
  createdAt: number;
  dataVersion: string;
  state: GameState;
}

class WeimarDB extends Dexie {
  saves!: Table<SaveRecord, number>;

  constructor() {
    super('weimar-republic-simulator');
    this.version(1).stores({
      saves: '++id, name, date, createdAt',
    });
  }
}

export const db = new WeimarDB();

export async function saveGame(state: GameState, name: string): Promise<number> {
  const record: SaveRecord = {
    name,
    date: state.date,
    scenarioId: state.meta.scenarioId,
    mode: state.meta.mode,
    createdAt: Date.now(),
    dataVersion: state.meta.dataVersion,
    state: JSON.parse(JSON.stringify(state)),
  };
  return db.saves.add(record);
}

export async function listSaves(): Promise<SaveRecord[]> {
  return db.saves.orderBy('createdAt').reverse().toArray();
}

export async function loadSave(id: number): Promise<SaveRecord | undefined> {
  return db.saves.get(id);
}

export async function deleteSave(id: number): Promise<void> {
  return db.saves.delete(id);
}

export function exportSave(state: GameState): string {
  return JSON.stringify({ format: 'weimar-save-v1', dataVersion: state.meta.dataVersion, state }, null, 2);
}

export function downloadSave(state: GameState) {
  const blob = new Blob([exportSave(state)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `weimar-${state.date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

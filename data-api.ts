import { musicHostApi } from '../../src/plugin-api';
import { audioTypes, type TableBinding } from '../../src/data/media';
import type { DataRecord } from '../../src/data/model';
export const musicApi = {
  tables: musicHostApi.tables.list,
  query: (binding: TableBinding, signal: AbortSignal) => musicHostApi.files.query(binding, signal, Object.keys(audioTypes)),
  open: (binding: TableBinding, record: DataRecord) => musicHostApi.media.open(binding, record),
  settings: () => musicHostApi.state.get('settings').then(r => (r.value ?? {}) as {binding?: TableBinding; shuffle?: boolean; repeat?: 'off' | 'all' | 'one'; display?: 'list' | 'views'}),
  saveSettings: (patch: Record<string, unknown>) => musicHostApi.state.update('settings', patch),
};
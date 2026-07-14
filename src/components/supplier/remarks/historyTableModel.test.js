import { describe, expect, it } from 'vitest';
import { mapHistoryEntryToRow, partitionActivityItems } from './historyTableModel';

describe('historyTableModel', () => {
  it('mapt history entries naar tabelrijen met geformatteerde waarden', () => {
    const row = mapHistoryEntryToRow({
      id: 'custom:12',
      type: 'custom',
      action: 'UPDATE',
      columnLabel: 'Leverdatum',
      actor: { name: 'System' },
      oldValue: '2026-04-09T00:00:00.000Z',
      newValue: '2026-04-09T12:00:00.000Z',
      createdAt: '2026-07-14T08:06:00.000Z',
      status: 'applied',
    });

    expect(row.column).toBe('Leverdatum');
    expect(row.user).toBe('System');
    expect(row.previous).toBe('09/04/2026');
    expect(row.next).toBe('09/04/2026');
    expect(row.status).toBe('Applied');
  });

  it('splitst remarks en history voor het All-tabblad', () => {
    const result = partitionActivityItems([
      { kind: 'remark', id: 1 },
      { type: 'custom', id: 'custom:2' },
    ]);

    expect(result.remarks).toHaveLength(1);
    expect(result.history).toHaveLength(1);
  });
});

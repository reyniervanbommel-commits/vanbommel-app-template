import React from 'react';
import { Checkbox, Spinner, Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';

const useStyles = makeStyles({
  list: { display: 'flex', flexDirection: 'column', ...shorthands.gap('4px'), maxHeight: '320px', overflowY: 'auto' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...shorthands.gap('12px') },
  left: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), minWidth: 0 },
  meta: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200, whiteSpace: 'nowrap' },
  scope: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('4px'),
    ...shorthands.padding('0', '4px'),
  },
  empty: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

function scopeLabel(scope) {
  return scope === 'detail' ? 'regel' : 'hoofd';
}

/**
 * AdminTrackChangesColumns — pure lijst met aanvinkbare kolommen voor track changes.
 * De view rendert alleen; state en opslaan zitten in de parent-Settings-component.
 *
 * @param {{
 *   columns: Array<{ id: number|string, label: string, source: string, scope: string }>,
 *   selectedIds: Set<string>,
 *   trackedSince: Record<string, string>,
 *   loading: boolean,
 *   onToggle: (id: string, checked: boolean) => void,
 *   formatDate: (iso: string) => string,
 * }} props
 */
export default function AdminTrackChangesColumns({ columns, selectedIds, trackedSince, loading, onToggle, formatDate }) {
  const styles = useStyles();
  if (loading) return <Spinner size="tiny" label="Kolommen laden..." />;
  if (!columns.length) return <Text className={styles.empty}>Geen trackbare kolommen gevonden.</Text>;

  return (
    <div className={styles.list}>
      {columns.map((col) => {
        const id = String(col.id);
        const checked = selectedIds.has(id);
        const since = trackedSince[id];
        return (
          <div key={id} className={styles.row}>
            <span className={styles.left}>
              <Checkbox
                checked={checked}
                onChange={(_e, data) => onToggle(id, Boolean(data.checked))}
                label={col.label || `#${id}`}
              />
              <span className={styles.scope}>{scopeLabel(col.scope)}</span>
            </span>
            {checked && since ? (
              <span className={styles.meta}>sinds {formatDate(since)}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

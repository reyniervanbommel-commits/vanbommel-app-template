import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Spinner,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { apiRequest } from '../../../utils/api';
import { BOARD_TB_SOURCE } from '../../../config/featureFlags';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('14px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('8px'),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  description: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  lookupCard: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('6px'),
    ...shorthands.padding('10px', '12px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
  },
  lookupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('8px'),
    flexWrap: 'wrap',
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    ...shorthands.gap('4px', '12px'),
  },
  relationText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  error: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: tokens.fontSizeBase200,
  },
  empty: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontStyle: 'italic',
  },
});

function normalizeSelectedColumns(lookup) {
  const selected = Array.isArray(lookup?.selectedTargetColumns)
    ? lookup.selectedTargetColumns
    : Object.values(lookup?.fields || {});
  return [...new Set(selected.map((value) => String(value || '').trim()).filter(Boolean))];
}

function asSet(list) {
  return new Set((Array.isArray(list) ? list : []).map((value) => String(value || '').trim()).filter(Boolean));
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function adminBase(tableKey) {
  return BOARD_TB_SOURCE ? `/data/${tableKey}` : '/purchase-orders';
}

function LookupFieldMappingPanel({ tableKey = 'purchase-orders', lookups = [], onReload }) {
  const styles = useStyles();
  const [selectedByTarget, setSelectedByTarget] = useState({});
  const [savingTarget, setSavingTarget] = useState('');
  const [error, setError] = useState('');
  const basePath = adminBase(tableKey);

  useEffect(() => {
    const nextState = {};
    lookups.forEach((lookup) => {
      nextState[lookup.targetTableKey] = normalizeSelectedColumns(lookup);
    });
    setSelectedByTarget(nextState);
  }, [lookups]);

  const hasMappings = useMemo(() => Array.isArray(lookups) && lookups.length > 0, [lookups]);

  const toggleField = (targetTableKey, fieldKey, checked) => {
    setSelectedByTarget((prev) => {
      const current = asSet(prev[targetTableKey]);
      if (checked) current.add(fieldKey);
      else current.delete(fieldKey);
      return {
        ...prev,
        [targetTableKey]: [...current],
      };
    });
  };

  const saveLookup = async (lookup) => {
    const targetTableKey = lookup.targetTableKey;
    const selected = selectedByTarget[targetTableKey] || [];
    setSavingTarget(targetTableKey);
    setError('');
    try {
      await apiRequest(`${basePath}/lookups/${encodeURIComponent(targetTableKey)}`, {
        method: 'PUT',
        body: { targetFields: selected },
      });
      if (typeof onReload === 'function') await onReload();
    } catch (err) {
      setError(err.message || 'Opslaan van lookup mapping is mislukt.');
    } finally {
      setSavingTarget('');
    }
  };

  if (!hasMappings) return null;

  return (
    <div className={styles.root}>
      <Text weight="semibold">Lookup column mapping</Text>
      <Text className={styles.description}>
        Select which fields from linked entities should appear as read-only columns on Purchase Orders.
      </Text>
      {error ? <Text className={styles.error}>{error}</Text> : null}

      {lookups.map((lookup) => {
        const targetTableKey = lookup.targetTableKey;
        const available = Array.isArray(lookup.targetColumns) ? lookup.targetColumns : [];
        const currentSet = asSet(normalizeSelectedColumns(lookup));
        const draftSet = asSet(selectedByTarget[targetTableKey] || []);
        const hasChanges = !setsEqual(currentSet, draftSet);
        const isSaving = savingTarget === targetTableKey;
        const sourceLabel = lookup.sourceScope === 'detail' ? 'PO lines' : 'PO header';
        return (
          <div key={`${targetTableKey}-${lookup.sourceScope}-${lookup.sourceField}`} className={styles.lookupCard}>
            <div className={styles.lookupHeader}>
              <Text weight="semibold">{lookup.targetTableLabel || targetTableKey}</Text>
              <Button
                appearance="primary"
                size="small"
                disabled={!hasChanges || isSaving}
                onClick={() => saveLookup(lookup)}
              >
                {isSaving ? <Spinner size="tiny" /> : 'Save mapping'}
              </Button>
            </div>
            <Text className={styles.relationText}>
              {sourceLabel}: <strong>{lookup.sourceField}</strong> {'->'} <strong>{lookup.targetKeyField}</strong>
            </Text>
            {!available.length ? (
              <Text className={styles.empty}>No active source columns available for this lookup target.</Text>
            ) : (
              <div className={styles.fieldGrid}>
                {available.map((column) => (
                  <Checkbox
                    key={column.key}
                    label={column.label}
                    checked={draftSet.has(column.key)}
                    disabled={isSaving}
                    onChange={(_, data) => toggleField(targetTableKey, column.key, Boolean(data.checked))}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(LookupFieldMappingPanel);

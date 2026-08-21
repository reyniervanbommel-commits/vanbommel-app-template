import React, { useCallback, useMemo } from 'react';
import { Field, Select, Text, makeStyles, tokens, shorthands, mergeClasses } from '@fluentui/react-components';

const useStyles = makeStyles({
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusXLarge),
    ...shorthands.padding(tokens.spacingVerticalXL),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalL),
  },
  sectionFlyout: {
    ...shorthands.padding(tokens.spacingVerticalL),
    ...shorthands.gap(tokens.spacingVerticalM),
    alignItems: 'flex-start',
    width: '100%',
    boxSizing: 'border-box',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  gridFlyout: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalMNudge),
    alignItems: 'flex-start',
  },
  fieldFlyout: { width: 'auto', maxWidth: '100%' },
  compactControl: { width: '168px', maxWidth: '100%' },
  title: { color: tokens.colorNeutralForeground1 },
});

function optionText(col) {
  const label = col.label || col.key;
  return label === col.key ? label : `${label} (${col.key})`;
}

export default function RccpDeliveryPlanFields({
  config, columns, compact, onUpdateField,
}) {
  const styles = useStyles();
  const dateColumns = columns || [];
  const qtyColumns = useMemo(
    () => (columns || []).filter((col) => col.rccpMeasure),
    [columns],
  );

  const handlePlanned = useCallback((e) => {
    onUpdateField('deliveryPlanPlannedDateKey', e.target.value);
  }, [onUpdateField]);
  const handleDeliveredDate = useCallback((e) => {
    onUpdateField('deliveryPlanDeliveredDateKey', e.target.value);
  }, [onUpdateField]);
  const handleOrdered = useCallback((e) => {
    onUpdateField('deliveryPlanOrderedQtyKey', e.target.value);
  }, [onUpdateField]);
  const handleDeliveredQty = useCallback((e) => {
    onUpdateField('deliveryPlanDeliveredQtyKey', e.target.value);
  }, [onUpdateField]);

  return (
    <div className={mergeClasses(styles.section, compact && styles.sectionFlyout)}>
      <Text weight="semibold" className={styles.title}>Delivery plan</Text>
      <div className={mergeClasses(styles.grid, compact && styles.gridFlyout)}>
        <Field label="Planned date" className={compact ? styles.fieldFlyout : undefined}>
          <Select
            className={compact ? styles.compactControl : undefined}
            size={compact ? 'small' : 'medium'}
            value={config.deliveryPlanPlannedDateKey || ''}
            onChange={handlePlanned}
          >
            {dateColumns.map((col) => (
              <option key={`p-${col.scope}-${col.key}`} value={col.key}>{optionText(col)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Delivered date" className={compact ? styles.fieldFlyout : undefined}>
          <Select
            className={compact ? styles.compactControl : undefined}
            size={compact ? 'small' : 'medium'}
            value={config.deliveryPlanDeliveredDateKey || ''}
            onChange={handleDeliveredDate}
          >
            <option value="">None</option>
            {dateColumns.map((col) => (
              <option key={`d-${col.scope}-${col.key}`} value={col.key}>{optionText(col)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Ordered quantity" className={compact ? styles.fieldFlyout : undefined}>
          <Select
            className={compact ? styles.compactControl : undefined}
            size={compact ? 'small' : 'medium'}
            value={config.deliveryPlanOrderedQtyKey || ''}
            onChange={handleOrdered}
          >
            {qtyColumns.map((col) => (
              <option key={`oq-${col.scope}-${col.key}`} value={col.key}>{optionText(col)}</option>
            ))}
          </Select>
        </Field>
        <Field label="Delivered quantity" className={compact ? styles.fieldFlyout : undefined}>
          <Select
            className={compact ? styles.compactControl : undefined}
            size={compact ? 'small' : 'medium'}
            value={config.deliveryPlanDeliveredQtyKey || ''}
            onChange={handleDeliveredQty}
          >
            <option value="">None</option>
            {qtyColumns.map((col) => (
              <option key={`dq-${col.scope}-${col.key}`} value={col.key}>{optionText(col)}</option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}

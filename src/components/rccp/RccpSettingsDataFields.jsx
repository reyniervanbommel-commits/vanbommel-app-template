import React, { memo, useCallback, useMemo, useState } from 'react';
import { Button, Field, Input, Select, Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { ChevronDownRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { rccpFieldLabel } from './rccpFieldLabel';
import RccpNarrowDropdown from './RccpNarrowDropdown';
import { rccpColumnGroupLabel } from '../../utils/rccpColumnGroups';

const useStyles = makeStyles({
  stack: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalL),
    width: '100%',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  groupTitle: { color: tokens.colorNeutralForeground2 },
  slot: { width: '200px', maxWidth: '200px' },
  toggle: { alignSelf: 'flex-start' },
});

function columnOption(col) {
  const label = col.label || col.key;
  return {
    value: col.key,
    text: label === col.key ? label : `${label} (${col.key})`,
    shortText: label,
    group: rccpColumnGroupLabel(col),
  };
}

const EMPTY_COLUMN = '__none__';

function ColumnSelect({
  label, value, onChange, columns, info, compact, allowEmpty = false,
}) {
  const styles = useStyles();
  const options = useMemo(() => {
    const mapped = columns.map(columnOption);
    return allowEmpty
      ? [{ value: EMPTY_COLUMN, text: 'None', shortText: 'None' }, ...mapped]
      : mapped;
  }, [allowEmpty, columns]);
  const selected = options.find((opt) => opt.value === (value || (allowEmpty ? EMPTY_COLUMN : value)));
  const handleSelect = useCallback((key) => {
    onChange({ target: { value: key === EMPTY_COLUMN ? '' : key } });
  }, [onChange]);

  return (
    <div className={styles.slot}>
      <Field label={rccpFieldLabel(label, info)}>
        <RccpNarrowDropdown
          size={compact ? 'small' : 'medium'}
          selectedValue={value || (allowEmpty ? EMPTY_COLUMN : value)}
          selectedText={selected?.shortText || value}
          options={options}
          onSelect={handleSelect}
        />
      </Field>
    </div>
  );
}

function CapacityImportFields({ compact, policy, onPolicy }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const toggleOpen = useCallback(() => setOpen((current) => !current), []);

  return (
    <div className={styles.group}>
      <Button
        className={styles.toggle}
        size="small"
        appearance="subtle"
        icon={open ? <ChevronDownRegular /> : <ChevronRightRegular />}
        aria-expanded={open}
        onClick={toggleOpen}
      >
        Capacity import
      </Button>
      {open && (
        <div className={styles.slot}>
          <Field
            label={rccpFieldLabel(
              'Duplicate Excel rows',
              'What to do when an imported week already exists.',
            )}
          >
            <Select
              size={compact ? 'small' : 'medium'}
              value={policy || 'update'}
              onChange={onPolicy}
            >
              <option value="update">Update existing rows</option>
              <option value="skip">Skip duplicates</option>
            </Select>
          </Field>
        </div>
      )}
    </div>
  );
}

function RccpSettingsDataFields({
  config, columns, statusOptions, compact, onVendor, onDate, onReceiptDate, onConfirmedDate, onStatuses, onPolicy,
}) {
  const styles = useStyles();
  const masterColumns = columns.filter((c) => c.scope === 'master');
  const known = statusOptions.length
    ? `Comma-separated labels to ignore in the matrix. Known statuses: ${statusOptions.join(', ')}.`
    : 'Comma-separated status labels to ignore in the matrix.';

  return (
    <div className={styles.stack}>
      <div className={styles.group}>
        <Text weight="semibold" className={styles.groupTitle}>Purchase order fields</Text>
        <ColumnSelect
          compact={compact}
          label="Vendor"
          info="Purchase order column that identifies the vendor."
          value={config.vendorColumnKey}
          onChange={onVendor}
          columns={masterColumns}
        />
        <ColumnSelect
          compact={compact}
          label="Delivery date"
          info="Line date first; the order header is the fallback."
          value={config.dateColumnKey}
          onChange={onDate}
          columns={columns}
        />
        <ColumnSelect
          compact={compact}
          label="Receipt date"
          info="Date used to place actually delivered quantity below the axis. Empty or 1-1-1900 is not shown below the axis."
          value={config.receiptDateColumnKey || ''}
          onChange={onReceiptDate}
          columns={columns}
          allowEmpty
        />
        <ColumnSelect
          compact={compact}
          label="Confirmed delivery date"
          info="Line date first; the order header is the fallback. Optional."
          value={config.confirmedDateColumnKey || ''}
          onChange={onConfirmedDate}
          columns={columns}
          allowEmpty
        />
      </div>
      <div className={styles.group}>
        <Text weight="semibold" className={styles.groupTitle}>Load filter</Text>
        <div className={styles.slot}>
          <Field label={rccpFieldLabel('Excluded PO statuses', known)}>
            <Input
              size={compact ? 'small' : 'medium'}
              value={(config.excludedStatuses || []).join(', ')}
              onChange={onStatuses}
            />
          </Field>
        </div>
      </div>
      <CapacityImportFields
        compact={compact}
        policy={config.duplicatePolicy}
        onPolicy={onPolicy}
      />
    </div>
  );
}

export default memo(RccpSettingsDataFields);

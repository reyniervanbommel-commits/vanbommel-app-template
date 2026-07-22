import React from 'react';
import {
  Button,
  Dropdown,
  Option,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';

const CLEAR_VALUE = '__clear__';

const useStyles = makeStyles({
  intro: {
    display: 'block',
    marginBottom: '4px',
  },
  conflictItem: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('4px'),
    ...shorthands.padding('6px', '0'),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  conflictLabel: {
    fontWeight: tokens.fontWeightSemibold,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    ...shorthands.gap('8px'),
    marginTop: '8px',
  },
});

/**
 * Toont — nadat het verwijderen van een statuslabel is geweigerd omdat het nog in gebruik is —
 * per getroffen label hoeveel items het raakt en biedt een keuze: leegmaken of vervangen door een
 * ander (resterend) label. Puur presentational; alle state/logica zit in useStatusLabelsEditor.
 */
export default function StatusLabelsConflictResolver({
  conflicts,
  remainingOptions,
  reassignChoices,
  onChangeChoice,
  onCancel,
  onConfirm,
  saving,
}) {
  const styles = useStyles();

  return (
    <>
      <Text className={styles.intro} size={200}>
        {conflicts.length === 1
          ? 'This status is still used in existing items. Choose what to do before deleting it:'
          : 'These statuses are still used in existing items. Choose what to do before deleting them:'}
      </Text>
      {conflicts.map((conflict) => {
        const choice = reassignChoices[conflict.label] || '';
        const selectedValue = choice ? choice : CLEAR_VALUE;
        const selectedText = choice || 'Clear (no status)';
        return (
          <div key={conflict.id} className={styles.conflictItem}>
            <Text size={200}>
              <span className={styles.conflictLabel}>{conflict.label}</span>
              {` is used in ${conflict.count} item${conflict.count === 1 ? '' : 's'}.`}
            </Text>
            <Dropdown
              size="small"
              value={selectedText}
              selectedOptions={[selectedValue]}
              onOptionSelect={(_, data) => {
                onChangeChoice(conflict.label, data.optionValue === CLEAR_VALUE ? '' : data.optionValue);
              }}
            >
              <Option value={CLEAR_VALUE}>Clear (no status)</Option>
              {remainingOptions.map((option) => (
                <Option key={option.id} value={option.label}>
                  {option.label}
                </Option>
              ))}
            </Dropdown>
          </div>
        );
      })}
      <div className={styles.actions}>
        <Button appearance="subtle" size="small" onClick={onCancel}>
          Back
        </Button>
        <Button appearance="primary" size="small" onClick={onConfirm} disabled={saving}>
          {saving ? 'Applying...' : 'Confirm & delete'}
        </Button>
      </div>
    </>
  );
}

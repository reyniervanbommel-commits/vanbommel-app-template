import React, { memo, useCallback, useMemo } from 'react';
import { Button, Text, makeStyles, tokens } from '@fluentui/react-components';
import { NEW_COLUMN_TYPES } from './purchaseOrderColumnFilterMenuConstants';

const useStyles = makeStyles({
  subPaneTitle: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: '4px',
  },
  typeButton: {
    justifyContent: 'flex-start',
  },
});

const AddColumnTypeButton = memo(function AddColumnTypeButton({ type, disabled, onConfirm }) {
  const handleClick = useCallback(() => onConfirm(type), [onConfirm, type]);
  return (
    <Button
      className={useStyles().typeButton}
      appearance="subtle"
      size="small"
      disabled={disabled}
      onClick={handleClick}
    >
      {disabled ? `${type.label} · Already added` : type.label}
    </Button>
  );
});

export default function PurchaseOrderAddColumnPane({
  columnLevel = 'header',
  remarksAlreadyAdded = false,
  onConfirm,
}) {
  const styles = useStyles();
  const addableTypes = useMemo(
    () => (columnLevel === 'header'
      ? NEW_COLUMN_TYPES
      : NEW_COLUMN_TYPES.filter((type) => !['image', 'remarks'].includes(type.dataType))),
    [columnLevel]
  );

  return (
    <>
      <Text className={styles.subPaneTitle}>Column type</Text>
      {addableTypes.map((type) => (
        <AddColumnTypeButton
          key={type.key}
          type={type}
          disabled={type.dataType === 'remarks' && remarksAlreadyAdded}
          onConfirm={onConfirm}
        />
      ))}
    </>
  );
}

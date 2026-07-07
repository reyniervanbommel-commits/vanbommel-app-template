import React, { useMemo } from 'react';
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

export default function PurchaseOrderAddColumnPane({ columnLevel = 'header', onConfirm }) {
  const styles = useStyles();
  const addableTypes = useMemo(
    () => (columnLevel === 'header'
      ? NEW_COLUMN_TYPES
      : NEW_COLUMN_TYPES.filter((type) => type.dataType !== 'image')),
    [columnLevel]
  );

  return (
    <>
      <Text className={styles.subPaneTitle}>Kolomtype</Text>
      {addableTypes.map((type) => (
        <Button
          key={type.key}
          className={styles.typeButton}
          appearance="subtle"
          size="small"
          onClick={() => onConfirm(type)}
        >
          {type.label}
        </Button>
      ))}
    </>
  );
}

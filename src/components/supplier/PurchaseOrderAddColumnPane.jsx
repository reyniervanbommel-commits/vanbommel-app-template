import React from 'react';
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

export default function PurchaseOrderAddColumnPane({ onConfirm }) {
  const styles = useStyles();

  return (
    <>
      <Text className={styles.subPaneTitle}>Kolomtype</Text>
      {NEW_COLUMN_TYPES.map((type) => (
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

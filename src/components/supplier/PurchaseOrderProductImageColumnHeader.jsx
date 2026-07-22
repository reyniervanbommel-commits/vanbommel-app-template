import React, { memo } from 'react';
import { Text, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  labelText: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

function PurchaseOrderProductImageColumnHeader({ label = 'Image' }) {
  const styles = useStyles();
  return (
    <Text weight="semibold" className={styles.labelText}>{label}</Text>
  );
}

export default memo(PurchaseOrderProductImageColumnHeader);

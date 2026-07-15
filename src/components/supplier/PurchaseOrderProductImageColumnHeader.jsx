import React, { memo } from 'react';
import { Text, makeStyles, tokens } from '@fluentui/react-components';
import { CloudRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  labelWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    minWidth: 0,
    maxWidth: '100%',
    columnGap: '4px',
  },
  icon: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase300,
    width: '16px',
    minWidth: '16px',
    lineHeight: 1,
    flexShrink: 0,
  },
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
    <span className={styles.labelWrap}>
      <CloudRegular className={styles.icon} aria-hidden />
      <Text weight="semibold" className={styles.labelText}>{label}</Text>
    </span>
  );
}

export default memo(PurchaseOrderProductImageColumnHeader);

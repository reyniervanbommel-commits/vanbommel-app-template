import React, { memo } from 'react';
import { Badge, Spinner, Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';
import { Clock16Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  card: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
    minHeight: '36px',
    ...shorthands.padding('6px', '12px'),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  icon: {
    display: 'flex',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  block: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('0px'),
    minWidth: 0,
  },
  label: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase100,
  },
  value: {
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    whiteSpace: 'nowrap',
  },
  divider: {
    width: '1px',
    alignSelf: 'stretch',
    backgroundColor: tokens.colorNeutralStroke2,
  },
});

function freshnessText(hasCache, relativeSynced, refreshing) {
  if (refreshing) return 'Refreshing...';
  if (hasCache) return relativeSynced || 'Unknown';
  return 'Unknown';
}

function PurchaseOrderSyncStatus({ hasCache, relativeSynced, total, refreshing = false }) {
  const styles = useStyles();
  return (
    <div className={styles.card}>
      <span className={styles.icon} aria-hidden>
        {refreshing ? <Spinner size="tiny" /> : <Clock16Regular />}
      </span>
      <div className={styles.block}>
        <Text className={styles.label}>Last refreshed</Text>
        <Text className={styles.value} weight="medium">
          {freshnessText(hasCache, relativeSynced, refreshing)}
        </Text>
      </div>
      <div className={styles.divider} />
      <div className={styles.block}>
        <Text className={styles.label}>Rows</Text>
        <Badge appearance="outline" color="informative">{total}</Badge>
      </div>
    </div>
  );
}

export default memo(PurchaseOrderSyncStatus);
export { freshnessText };

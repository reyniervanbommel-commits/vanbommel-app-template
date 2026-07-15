import React, { memo } from 'react';
import { Button, makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import { AddRegular, ArrowClockwiseRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap('12px'),
    marginBottom: '16px',
  },
  title: { fontSize: '20px', fontWeight: 700 },
  subtitle: { color: tokens.colorNeutralForeground3, marginLeft: '8px', fontSize: '13px' },
  actions: { display: 'flex', ...shorthands.gap('8px') },
});

function BiToolbar({ chartCount, onNewChart, onRefresh }) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div>
        <Text className={styles.title}>Business Intelligence</Text>
        <Text className={styles.subtitle}>{chartCount} chart{chartCount === 1 ? '' : 's'}</Text>
      </div>
      <div className={styles.actions}>
        <Button appearance="secondary" icon={<ArrowClockwiseRegular />} onClick={onRefresh}>Refresh</Button>
        <Button appearance="primary" icon={<AddRegular />} onClick={onNewChart}>New chart</Button>
      </div>
    </div>
  );
}

export default memo(BiToolbar);

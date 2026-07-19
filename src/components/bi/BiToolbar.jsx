import React, { memo } from 'react';
import { Button, makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import { AddRegular, ArrowClockwiseRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shorthands.gap(tokens.spacingHorizontalM),
    marginBottom: tokens.spacingVerticalL,
  },
  heading: {
    ...shorthands.margin('0'),
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
    marginLeft: tokens.spacingHorizontalS,
    fontSize: tokens.fontSizeBase200,
  },
  actions: { display: 'flex', ...shorthands.gap(tokens.spacingHorizontalS) },
});

function BiToolbar({ chartCount, onNewChart, onRefresh }) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div>
        <Text as="h1" className={styles.heading}>Business Intelligence</Text>
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

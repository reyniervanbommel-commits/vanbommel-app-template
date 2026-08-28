import React, { memo } from 'react';
import { Button, Card, Text, makeStyles, tokens, shorthands } from '@fluentui/react-components';
import { formatIsoWindowLabel } from './rccpUtils';

const useStyles = makeStyles({
  card: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding(tokens.spacingVerticalL),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
    alignItems: 'flex-start',
    maxWidth: '640px',
  },
});

function RccpEmptyWindowCard({ dataWindow, onShow }) {
  const styles = useStyles();
  if (!dataWindow) return null;
  return (
    <Card className={styles.card}>
      <Text weight="semibold">No load in the selected weeks</Text>
      <Text size={200}>
        This vendor has purchase-order load in {formatIsoWindowLabel(dataWindow)}.
      </Text>
      <Button size="small" appearance="primary" onClick={onShow}>
        Show weeks with data
      </Button>
    </Card>
  );
}

export default memo(RccpEmptyWindowCard);

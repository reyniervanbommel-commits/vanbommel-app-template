import React, { memo } from 'react';
import { Button, makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import { AddRegular, ArrowClockwiseRegular } from '@fluentui/react-icons';
import RccpVendorFilter from '../rccp/RccpVendorFilter';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingHorizontalM),
    marginBottom: tokens.spacingVerticalL,
  },
  titleGroup: { display: 'flex', flexDirection: 'column' },
  heading: {
    ...shorthands.margin('0'),
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
  },
  subtitle: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  controls: {
    display: 'flex',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  actions: { display: 'flex', alignItems: 'flex-end', ...shorthands.gap(tokens.spacingHorizontalS) },
});

function BiToolbar({
  chartCount, onNewChart, onRefresh,
  vendorAccount, onVendorChange, vendors, vendorNames, vendorsLoading, vendorsError,
}) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <div className={styles.titleGroup}>
        <Text as="h1" className={styles.heading}>Business Intelligence</Text>
        <Text className={styles.subtitle}>{chartCount} chart{chartCount === 1 ? '' : 's'}</Text>
      </div>
      <div className={styles.controls}>
        <RccpVendorFilter
          value={vendorAccount}
          onChange={onVendorChange}
          vendors={vendors}
          vendorNames={vendorNames}
          loading={vendorsLoading}
          error={vendorsError}
        />
        <div className={styles.actions}>
          <Button appearance="secondary" icon={<ArrowClockwiseRegular />} onClick={onRefresh}>Refresh</Button>
          <Button appearance="primary" icon={<AddRegular />} onClick={onNewChart}>New chart</Button>
        </div>
      </div>
    </div>
  );
}

export default memo(BiToolbar);

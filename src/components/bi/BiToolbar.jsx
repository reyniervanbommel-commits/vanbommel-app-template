import React, { memo } from 'react';
import { Button, makeStyles, shorthands, Text, tokens } from '@fluentui/react-components';
import { AddRegular, ArrowClockwiseRegular } from '@fluentui/react-icons';
import RccpVendorFilter from '../rccp/RccpVendorFilter';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    ...shorthands.gap(tokens.spacingVerticalS),
    marginBottom: tokens.spacingVerticalL,
  },
  heading: {
    ...shorthands.margin('0'),
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightBold,
  },
  controls: {
    display: 'flex',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  actions: { display: 'flex', alignItems: 'flex-end', ...shorthands.gap(tokens.spacingHorizontalS) },
  vendorField: { maxWidth: '420px', minWidth: '320px' },
});

function BiToolbar({
  onNewChart, onRefresh,
  vendorAccount, onVendorChange, vendors, vendorNames, vendorsLoading, vendorsError,
}) {
  const styles = useStyles();
  return (
    <div className={styles.root}>
      <Text as="h1" className={styles.heading}>Business Intelligence</Text>
      <div className={styles.controls}>
        <div className={styles.actions}>
          <Button appearance="secondary" icon={<ArrowClockwiseRegular />} onClick={onRefresh}>Refresh</Button>
          <Button appearance="primary" icon={<AddRegular />} onClick={onNewChart}>New chart</Button>
        </div>
        <RccpVendorFilter
          className={styles.vendorField}
          value={vendorAccount}
          onChange={onVendorChange}
          vendors={vendors}
          vendorNames={vendorNames}
          loading={vendorsLoading}
          error={vendorsError}
        />
      </div>
    </div>
  );
}

export default memo(BiToolbar);

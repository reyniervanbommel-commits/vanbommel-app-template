import React, { memo, useCallback } from 'react';
import {
  Button,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import PurchaseOrdersActiveFiltersList from './PurchaseOrdersActiveFiltersList';
import PurchaseOrdersActiveFormatRulesList from './PurchaseOrdersActiveFormatRulesList';

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalL),
  },
});

function PurchaseOrdersActiveRulesFlyout({
  open,
  onClose,
  filters,
  formatRules,
  expandedKey,
  onToggleExpanded,
  onClearFilter,
  onClearFormatRules,
  filterEditor = null,
  formatEditor = null,
}) {
  const styles = useStyles();
  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);
  const handleOpenChange = useCallback((_, data) => {
    if (!data.open) handleClose();
  }, [handleClose]);

  return (
    <Drawer open={open} position="end" size="medium" onOpenChange={handleOpenChange}>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={(
            <Button
              appearance="subtle"
              icon={<Dismiss24Regular />}
              aria-label="Close"
              onClick={handleClose}
            />
          )}
        >
          Active filters & formatting
        </DrawerHeaderTitle>
      </DrawerHeader>
      {open ? (
        <DrawerBody>
          <div className={styles.body}>
            <PurchaseOrdersActiveFiltersList
              filters={filters}
              expandedKey={expandedKey}
              onToggleExpanded={onToggleExpanded}
              onClearFilter={onClearFilter}
              filterEditor={filterEditor}
            />
            <PurchaseOrdersActiveFormatRulesList
              formatRules={formatRules}
              expandedKey={expandedKey}
              onToggleExpanded={onToggleExpanded}
              onClearFormatRules={onClearFormatRules}
              formatEditor={formatEditor}
            />
          </div>
        </DrawerBody>
      ) : null}
    </Drawer>
  );
}

export default memo(PurchaseOrdersActiveRulesFlyout);

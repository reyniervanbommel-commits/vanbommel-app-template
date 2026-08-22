import React, { memo, useCallback, useState } from 'react';
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
import PurchaseOrdersActiveFilterEditor from './PurchaseOrdersActiveFilterEditor';
import PurchaseOrdersActiveFormatEditor from './PurchaseOrdersActiveFormatEditor';
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
  onClearFilter,
  onClearFormatRules,
  filterEditorProps = {},
  formatEditorProps = {},
}) {
  const styles = useStyles();
  const [expandedKey, setExpandedKey] = useState(null);
  const handleClose = useCallback(() => {
    setExpandedKey(null);
    onClose?.();
  }, [onClose]);
  const handleOpenChange = useCallback((_, data) => {
    if (!data.open) handleClose();
  }, [handleClose]);
  const handleToggleExpanded = useCallback((itemKey) => {
    setExpandedKey((currentKey) => (currentKey === itemKey ? null : itemKey));
  }, []);
  const renderFilterEditor = useCallback((item) => (
    <PurchaseOrdersActiveFilterEditor item={item} {...filterEditorProps} />
  ), [filterEditorProps]);
  const renderFormatEditor = useCallback((item) => (
    <PurchaseOrdersActiveFormatEditor
      item={item}
      referenceColumns={item.scope === 'line' ? formatEditorProps.lineColumns : formatEditorProps.headerColumns}
      onSetColumnFormatRules={
        item.scope === 'line'
          ? formatEditorProps.onSaveLineColumnFormatRules
          : formatEditorProps.onSaveHeaderColumnFormatRules
      }
    />
  ), [formatEditorProps]);

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
              onToggleExpanded={handleToggleExpanded}
              onClearFilter={onClearFilter}
              filterEditor={renderFilterEditor}
            />
            <PurchaseOrdersActiveFormatRulesList
              formatRules={formatRules}
              expandedKey={expandedKey}
              onToggleExpanded={handleToggleExpanded}
              onClearFormatRules={onClearFormatRules}
              formatEditor={renderFormatEditor}
            />
          </div>
        </DrawerBody>
      ) : null}
    </Drawer>
  );
}

export default memo(PurchaseOrdersActiveRulesFlyout);

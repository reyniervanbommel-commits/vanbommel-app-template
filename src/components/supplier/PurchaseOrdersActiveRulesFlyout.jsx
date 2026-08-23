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
import PurchaseOrdersActiveRulesSection from './PurchaseOrdersActiveRulesSection';

const EMPTY_GROUPS = { header: [], line: [] };

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
  filters = EMPTY_GROUPS,
  formatRules = EMPTY_GROUPS,
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
            <PurchaseOrdersActiveRulesSection
              title="Filters"
              emptyText="No active filters"
              headerItems={filters.header}
              lineItems={filters.line}
              keyPrefix="filter:"
              expandedKey={expandedKey}
              onToggleExpanded={handleToggleExpanded}
              onClear={onClearFilter}
              renderEditor={renderFilterEditor}
            />
            <PurchaseOrdersActiveRulesSection
              title="Conditional formatting"
              emptyText="No conditional formatting"
              headerItems={formatRules.header}
              lineItems={formatRules.line}
              keyPrefix="format:"
              expandedKey={expandedKey}
              onToggleExpanded={handleToggleExpanded}
              onClear={onClearFormatRules}
              renderEditor={renderFormatEditor}
            />
          </div>
        </DrawerBody>
      ) : null}
    </Drawer>
  );
}

export default memo(PurchaseOrdersActiveRulesFlyout);

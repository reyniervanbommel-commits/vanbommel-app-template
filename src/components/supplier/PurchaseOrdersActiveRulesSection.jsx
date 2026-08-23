import React, { memo, useCallback } from 'react';
import {
  Button,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  ChevronDown20Regular,
  ChevronRight20Regular,
} from '@fluentui/react-icons';

const EMPTY_ITEMS = [];

const useStyles = makeStyles({
  section: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  row: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalS),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  details: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  summary: {
    color: tokens.colorNeutralForeground3,
  },
  editor: {
    gridColumnStart: 2,
    gridColumnEnd: 4,
  },
});

const ActiveRuleRow = memo(function ActiveRuleRow({
  item,
  itemKey,
  expanded,
  onToggleExpanded,
  onClear,
  children,
}) {
  const styles = useStyles();
  const handleToggle = useCallback(() => {
    onToggleExpanded(itemKey);
  }, [itemKey, onToggleExpanded]);
  const handleClear = useCallback(() => {
    onClear(item);
  }, [item, onClear]);
  const expandLabel = expanded ? `Collapse ${item.columnLabel}` : `Expand ${item.columnLabel}`;

  return (
    <div className={styles.row}>
      <Button
        appearance="subtle"
        icon={expanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
        aria-label={expandLabel}
        onClick={handleToggle}
      />
      <div className={styles.details}>
        <Text weight="semibold">{item.columnLabel}</Text>
        <Text size={200} className={styles.summary}>{item.summary}</Text>
      </div>
      <Button appearance="subtle" onClick={handleClear}>Clear</Button>
      {expanded ? <div className={styles.editor}>{children}</div> : null}
    </div>
  );
});

function PurchaseOrdersActiveRulesSection({
  title,
  emptyText,
  headerItems = EMPTY_ITEMS,
  lineItems = EMPTY_ITEMS,
  keyPrefix,
  expandedKey,
  onToggleExpanded,
  onClear,
  renderEditor,
}) {
  const styles = useStyles();
  const hasItems = headerItems.length > 0 || lineItems.length > 0;
  const renderItem = useCallback((item) => {
    const itemKey = `${keyPrefix}${item.id}`;
    const expanded = expandedKey === itemKey;
    return (
      <ActiveRuleRow
        key={item.id}
        item={item}
        itemKey={itemKey}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        onClear={onClear}
      >
        {expanded && typeof renderEditor === 'function' ? renderEditor(item) : renderEditor}
      </ActiveRuleRow>
    );
  }, [expandedKey, keyPrefix, onClear, onToggleExpanded, renderEditor]);

  return (
    <section className={styles.section}>
      <Text weight="semibold">{title}</Text>
      {hasItems ? null : <Text>{emptyText}</Text>}
      {headerItems.length > 0 ? (
        <div className={styles.group}>
          <Text size={200} weight="semibold">Header columns</Text>
          {headerItems.map(renderItem)}
        </div>
      ) : null}
      {lineItems.length > 0 ? (
        <div className={styles.group}>
          <Text size={200} weight="semibold">Line columns</Text>
          {lineItems.map(renderItem)}
        </div>
      ) : null}
    </section>
  );
}

export default memo(PurchaseOrdersActiveRulesSection);

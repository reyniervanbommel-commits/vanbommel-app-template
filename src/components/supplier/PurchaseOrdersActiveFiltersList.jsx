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

export const ActiveRuleRow = memo(function ActiveRuleRow({
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

function PurchaseOrdersActiveFiltersList({
  filters,
  expandedKey,
  onToggleExpanded,
  onClearFilter,
  filterEditor,
}) {
  const styles = useStyles();
  const headerFilters = filters?.header || [];
  const lineFilters = filters?.line || [];
  const hasFilters = headerFilters.length > 0 || lineFilters.length > 0;
  const renderHeaderFilter = useCallback((item) => {
    const itemKey = `filter:${item.id}`;
    const expanded = expandedKey === itemKey;
    return (
      <ActiveRuleRow
        key={item.id}
        item={item}
        itemKey={itemKey}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        onClear={onClearFilter}
      >
        {expanded && typeof filterEditor === 'function' ? filterEditor(item) : filterEditor}
      </ActiveRuleRow>
    );
  }, [expandedKey, filterEditor, onClearFilter, onToggleExpanded]);
  const renderLineFilter = useCallback((item) => {
    const itemKey = `filter:${item.id}`;
    const expanded = expandedKey === itemKey;
    return (
      <ActiveRuleRow
        key={item.id}
        item={item}
        itemKey={itemKey}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        onClear={onClearFilter}
      >
        {expanded && typeof filterEditor === 'function' ? filterEditor(item) : filterEditor}
      </ActiveRuleRow>
    );
  }, [expandedKey, filterEditor, onClearFilter, onToggleExpanded]);

  return (
    <section className={styles.section}>
      <Text weight="semibold">Filters</Text>
      {hasFilters ? null : <Text>No active filters</Text>}
      {headerFilters.length > 0 ? (
        <div className={styles.group}>
          <Text size={200} weight="semibold">Header columns</Text>
          {headerFilters.map(renderHeaderFilter)}
        </div>
      ) : null}
      {lineFilters.length > 0 ? (
        <div className={styles.group}>
          <Text size={200} weight="semibold">Line columns</Text>
          {lineFilters.map(renderLineFilter)}
        </div>
      ) : null}
    </section>
  );
}

export default memo(PurchaseOrdersActiveFiltersList);

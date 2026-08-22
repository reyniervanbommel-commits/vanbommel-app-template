import React, { memo, useCallback } from 'react';
import { Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { ActiveRuleRow } from './PurchaseOrdersActiveFiltersList';

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
});

function PurchaseOrdersActiveFormatRulesList({
  formatRules,
  expandedKey,
  onToggleExpanded,
  onClearFormatRules,
  formatEditor,
}) {
  const styles = useStyles();
  const headerRules = formatRules?.header || [];
  const lineRules = formatRules?.line || [];
  const hasRules = headerRules.length > 0 || lineRules.length > 0;
  const renderHeaderRule = useCallback((item) => {
    const itemKey = `format:${item.id}`;
    const expanded = expandedKey === itemKey;
    return (
      <ActiveRuleRow
        key={item.id}
        item={item}
        itemKey={itemKey}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        onClear={onClearFormatRules}
      >
        {expanded && typeof formatEditor === 'function' ? formatEditor(item) : formatEditor}
      </ActiveRuleRow>
    );
  }, [expandedKey, formatEditor, onClearFormatRules, onToggleExpanded]);
  const renderLineRule = useCallback((item) => {
    const itemKey = `format:${item.id}`;
    const expanded = expandedKey === itemKey;
    return (
      <ActiveRuleRow
        key={item.id}
        item={item}
        itemKey={itemKey}
        expanded={expanded}
        onToggleExpanded={onToggleExpanded}
        onClear={onClearFormatRules}
      >
        {expanded && typeof formatEditor === 'function' ? formatEditor(item) : formatEditor}
      </ActiveRuleRow>
    );
  }, [expandedKey, formatEditor, onClearFormatRules, onToggleExpanded]);

  return (
    <section className={styles.section}>
      <Text weight="semibold">Conditional formatting</Text>
      {hasRules ? null : <Text>No conditional formatting</Text>}
      {headerRules.length > 0 ? (
        <div className={styles.group}>
          <Text size={200} weight="semibold">Header columns</Text>
          {headerRules.map(renderHeaderRule)}
        </div>
      ) : null}
      {lineRules.length > 0 ? (
        <div className={styles.group}>
          <Text size={200} weight="semibold">Line columns</Text>
          {lineRules.map(renderLineRule)}
        </div>
      ) : null}
    </section>
  );
}

export default memo(PurchaseOrdersActiveFormatRulesList);

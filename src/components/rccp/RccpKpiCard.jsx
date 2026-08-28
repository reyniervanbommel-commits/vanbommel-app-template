import React, { useCallback } from 'react';
import { Card, Text, makeStyles, mergeClasses, tokens, shorthands } from '@fluentui/react-components';
import { KPI_FORMULAS } from './rccpKpiFormulas';
import KpiFormulaFold from './KpiFormulaFold';

const useStyles = makeStyles({
  wrap: {
    position: 'relative',
    minWidth: 0,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  card: {
    boxSizing: 'border-box',
    flexGrow: 1,
    width: '100%',
    height: '100%',
    ...shorthands.padding(tokens.spacingVerticalL),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
  },
  clickable: { cursor: 'pointer' },
  selected: {
    ...shorthands.border('2px', 'solid', tokens.colorBrandStroke1),
  },
  label: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  valueRow: {
    display: 'flex',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
    whiteSpace: 'nowrap',
    ...shorthands.gap(tokens.spacingHorizontalXS),
  },
  value: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    width: 'auto',
  },
  hash: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground2,
    width: 'auto',
  },
  aside: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    width: 'auto',
  },
  pct: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    color: tokens.colorNeutralForeground2,
  },
  detail: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
});

function hasQty(value) {
  return value !== null && value !== undefined;
}

export function formatQty(value) {
  if (!hasQty(value)) return '—';
  return Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function formatPct(value) {
  if (!hasQty(value)) return '';
  return `${(Number(value) || 0).toFixed(1)}%`;
}

export function formatDays(value) {
  if (!hasQty(value)) return '—';
  const rounded = Math.round(Number(value) * 10) / 10;
  return `Ø ${rounded} days late`;
}

export function formatItems(value) {
  if (!hasQty(value)) return '';
  return `${formatQty(value)} items`;
}

function KpiCard({ kpiKey, label, qty, hash, aside, pct, detail, selected, clickable, onActivate }) {
  const styles = useStyles();
  const formula = KPI_FORMULAS[kpiKey] || '';
  const handleClick = useCallback(() => {
    if (clickable) onActivate(kpiKey);
  }, [clickable, kpiKey, onActivate]);
  const handleKeyDown = useCallback((event) => {
    if (!clickable) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(kpiKey);
    }
  }, [clickable, kpiKey, onActivate]);
  const mark = hash === true ? '#' : (typeof hash === 'string' ? hash : '');
  const showMark = Boolean(mark && hasQty(qty));
  const markBefore = mark === 'Ø';
  return (
    <div className={styles.wrap}>
      <Card
        className={mergeClasses(styles.card, clickable && styles.clickable, selected && styles.selected)}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        aria-pressed={clickable ? selected : undefined}
        onClick={clickable ? handleClick : undefined}
        onKeyDown={clickable ? handleKeyDown : undefined}
      >
        <Text className={styles.label}>{label}</Text>
        {(hasQty(qty) || aside) ? (
          <div className={styles.valueRow}>
            {showMark && markBefore ? <Text className={styles.hash}>{mark}</Text> : null}
            {hasQty(qty) ? <Text className={styles.value}>{formatQty(qty)}</Text> : null}
            {showMark && !markBefore ? <Text className={styles.hash}>{mark}</Text> : null}
            {aside ? <Text className={styles.aside}>{aside}</Text> : null}
          </div>
        ) : null}
        {pct ? <Text className={styles.pct}>{pct}</Text> : null}
        {detail ? <Text className={styles.detail}>{detail}</Text> : null}
      </Card>
      <KpiFormulaFold formula={formula} kpiKey={kpiKey} />
    </div>
  );
}

export default KpiCard;

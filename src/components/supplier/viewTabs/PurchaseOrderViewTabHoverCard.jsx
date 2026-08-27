import React from 'react';
import { Text, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { tabHoverFilterLines } from '../../../utils/viewTabs';

const useStyles = makeStyles({
  card: {
    position: 'fixed',
    zIndex: 1000,
    pointerEvents: 'none',
    minWidth: '160px',
    maxWidth: '280px',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    boxShadow: tokens.shadow16,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
  },
  title: {
    display: 'block',
    marginBottom: tokens.spacingVerticalXS,
  },
  line: {
    display: 'block',
    color: tokens.colorNeutralForeground2,
  },
});

export default function PurchaseOrderViewTabHoverCard({ tab, columns = [], anchorRect }) {
  const styles = useStyles();
  if (!tab || !anchorRect) return null;
  const lines = tabHoverFilterLines(tab, columns);
  const left = Math.max(8, Math.min(anchorRect.left, window.innerWidth - 288));

  return (
    <div
      className={styles.card}
      role="tooltip"
      style={{ left: `${left}px`, top: `${anchorRect.top + 6}px` }}
    >
      <Text weight="semibold" className={styles.title}>{tab.name || 'All'}</Text>
      {lines.map((line) => (
        <Text key={line} size={200} className={styles.line}>{line}</Text>
      ))}
    </div>
  );
}

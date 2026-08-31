import React, { useCallback, useState } from 'react';
import { Button, Text, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import {
  ArrowDownRegular,
  FilterRegular,
  PaintBrushRegular,
  TableRegular,
  TextBulletList20Regular,
} from '@fluentui/react-icons';
import { VIEW_STATE_DIFF_MAX_ROWS } from '../../utils/viewStateDiff';

const KIND_LABEL = {
  filter: 'Filter',
  format: 'Conditional formatting',
  sort: 'Sort',
  category: 'Category',
  column: 'Column',
};

const useStyles = makeStyles({
  card: {
    minWidth: '180px',
    maxWidth: '320px',
    maxHeight: '360px',
    overflowY: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    boxShadow: tokens.shadow16,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
  },
  positioned: {
    position: 'fixed',
    zIndex: 2000000,
  },
  title: {
    display: 'block',
    marginBottom: tokens.spacingVerticalS,
  },
  rows: {
    display: 'grid',
    gridTemplateColumns: 'auto minmax(0, 1fr)',
    columnGap: tokens.spacingHorizontalS,
    rowGap: tokens.spacingVerticalXS,
    alignItems: 'center',
  },
  icon: {
    display: 'inline-flex',
    color: tokens.colorNeutralForeground2,
    fontSize: '16px',
    lineHeight: 0,
  },
  detail: {
    color: tokens.colorNeutralForeground2,
    minWidth: 0,
  },
  more: {
    display: 'block',
    color: tokens.colorNeutralForeground2,
    gridColumnStart: 1,
    gridColumnEnd: -1,
    marginTop: tokens.spacingVerticalXXS,
  },
  moreButton: {
    gridColumnStart: 1,
    gridColumnEnd: -1,
    marginTop: tokens.spacingVerticalXXS,
    justifyContent: 'flex-start',
    minWidth: 0,
    maxWidth: '100%',
  },
});

function KindIcon({ kind }) {
  const label = KIND_LABEL[kind] || KIND_LABEL.column;
  let icon = <TableRegular />;
  if (kind === 'filter') icon = <FilterRegular />;
  else if (kind === 'format') icon = <PaintBrushRegular />;
  else if (kind === 'sort') icon = <ArrowDownRegular />;
  else if (kind === 'category') icon = <TextBulletList20Regular />;
  return (
    <span aria-label={label} title={label}>
      {icon}
    </span>
  );
}

export default function PurchaseOrderViewStateDiffCard({
  rows = [],
  anchorRect,
  onMouseEnter,
  onMouseLeave,
}) {
  const styles = useStyles();
  const [expanded, setExpanded] = useState(false);
  const extra = expanded ? 0 : Math.max(0, rows.length - VIEW_STATE_DIFF_MAX_ROWS);
  const visibleRows = extra ? rows.slice(0, VIEW_STATE_DIFF_MAX_ROWS) : rows;
  const positioned = Boolean(anchorRect);
  const positionStyle = positioned
    ? {
      left: `${Math.max(8, Math.min((anchorRect.right || anchorRect.left) + 8, window.innerWidth - 328))}px`,
      top: `${Math.max(8, anchorRect.top)}px`,
    }
    : undefined;
  const handleExpand = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded(true);
  }, []);
  const ignorePointer = useCallback((event) => {
    event.stopPropagation();
  }, []);

  return (
    <div
      className={mergeClasses(styles.card, positioned && styles.positioned)}
      role="note"
      style={positionStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={ignorePointer}
      onClick={ignorePointer}
    >
      <Text weight="semibold" className={styles.title}>Not in this view yet</Text>
      <div className={styles.rows}>
        {visibleRows.length ? visibleRows.map((row) => (
          <React.Fragment key={`${row.kind}-${row.label}-${row.detail}`}>
            <span className={styles.icon}>
              <KindIcon kind={row.kind} />
            </span>
            <Text size={200} className={styles.detail}>{row.detail}</Text>
          </React.Fragment>
        )) : (
          <Text size={200} className={styles.more}>Unsaved view changes</Text>
        )}
        {extra > 0 ? (
          <Button
            appearance="transparent"
            size="small"
            className={styles.moreButton}
            onClick={handleExpand}
          >
            {`+${extra} more`}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

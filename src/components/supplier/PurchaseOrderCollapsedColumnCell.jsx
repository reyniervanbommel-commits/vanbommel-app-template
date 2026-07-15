import React, { memo, useCallback } from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { ArrowBidirectionalLeftRightRegular } from '@fluentui/react-icons';
import { COLLAPSED_COLUMN_WIDTH } from '../../utils/collapsedColumnUtils';

const useStyles = makeStyles({
  cell: {
    width: `${COLLAPSED_COLUMN_WIDTH}px`,
    minWidth: `${COLLAPSED_COLUMN_WIDTH}px`,
    maxWidth: `${COLLAPSED_COLUMN_WIDTH}px`,
    padding: '0',
    margin: '0',
    textAlign: 'center',
    verticalAlign: 'middle',
    overflow: 'hidden',
    boxSizing: 'border-box',
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  headerCell: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  bodyCell: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  expandIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${COLLAPSED_COLUMN_WIDTH}px`,
    height: '100%',
    minHeight: '24px',
    fontSize: '10px',
    lineHeight: 1,
    color: tokens.colorNeutralForeground2,
    pointerEvents: 'none',
  },
});

function PurchaseOrderCollapsedColumnCell({
  columnKey,
  columnLabel = '',
  variant = 'body',
  className = '',
  cellStyle,
  onExpandColumn,
}) {
  const styles = useStyles();
  const CellTag = variant === 'header' ? 'th' : 'td';
  const handleExpand = useCallback(() => {
    onExpandColumn?.(columnKey);
  }, [columnKey, onExpandColumn]);
  const variantClassName = variant === 'header' ? styles.headerCell : styles.bodyCell;
  const ariaLabel = columnLabel
    ? `Show column ${columnLabel}`
    : 'Show column';

  return (
    <CellTag
      className={[styles.cell, variantClassName, className].filter(Boolean).join(' ')}
      style={{
        width: `${COLLAPSED_COLUMN_WIDTH}px`,
        minWidth: `${COLLAPSED_COLUMN_WIDTH}px`,
        maxWidth: `${COLLAPSED_COLUMN_WIDTH}px`,
        padding: 0,
        ...(cellStyle || {}),
      }}
      data-col-key={columnKey}
      data-collapsed-column="true"
      {...(variant === 'header' ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': ariaLabel,
        onClick: handleExpand,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleExpand();
          }
        },
      } : {})}
    >
      {variant === 'header' ? (
        <span className={styles.expandIcon} aria-hidden>
          <ArrowBidirectionalLeftRightRegular />
        </span>
      ) : null}
    </CellTag>
  );
}

export function PurchaseOrderCollapsedColumnHeaderCell(props) {
  return <PurchaseOrderCollapsedColumnCell {...props} variant="header" />;
}

export default memo(PurchaseOrderCollapsedColumnCell);

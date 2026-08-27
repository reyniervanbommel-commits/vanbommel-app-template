import React, { memo, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Text, Switch, makeStyles, mergeClasses, tokens, shorthands,
} from '@fluentui/react-components';
import {
  buildMatrixPeriodHeaders,
  formatMatrixPeriodAria,
  formatMatrixQty,
  matrixPeriodToken,
  RCCP_CAPACITY_MEASURE_KEY,
  RCCP_OVERCAPACITY_MEASURE_KEY,
  RCCP_ROW_LABEL_WIDTH,
  RCCP_WEEK_COL_WIDTH,
  statusToken,
} from './rccpUtils';
import { isCurrentMatrixPeriod } from './rccpPoStack';

const useStyles = makeStyles({
  wrapper: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'visible',
    width: '100%',
  },
  table: {
    tableLayout: 'fixed',
    width: 'auto',
    borderCollapse: 'separate',
    borderSpacing: 0,
  },
  sticky: {
    position: 'sticky',
    left: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 1,
    width: `${RCCP_ROW_LABEL_WIDTH}px`,
    minWidth: `${RCCP_ROW_LABEL_WIDTH}px`,
    maxWidth: `${RCCP_ROW_LABEL_WIDTH}px`,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('8px', '10px'),
    textAlign: 'left',
    verticalAlign: 'middle',
  },
  headerSticky: {
    backgroundColor: tokens.colorNeutralBackground2,
    zIndex: 3,
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase300,
  },
  weekCol: {
    width: `${RCCP_WEEK_COL_WIDTH}px`,
    minWidth: `${RCCP_WEEK_COL_WIDTH}px`,
    maxWidth: `${RCCP_WEEK_COL_WIDTH}px`,
    boxSizing: 'border-box',
    ...shorthands.padding('8px', '4px'),
    textAlign: 'center',
    verticalAlign: 'middle',
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  weekHeader: {
    backgroundColor: tokens.colorNeutralBackground2,
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase300,
  },
  weekColInner: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1.2,
  },
  yearHeader: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
  weekHeaderLabel: { fontWeight: tokens.fontWeightSemibold },
  mondayHeader: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
  rowLabel: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalSNudge),
    minWidth: 0,
  },
  rowName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  switchWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    transform: 'scale(0.7)',
    transformOrigin: 'center left',
    marginRight: '-10px',
  },
  qty: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase200, lineHeight: 1 },
  cellInteractive: { cursor: 'pointer' },
  currentHeader: {
    backgroundColor: tokens.colorBrandBackground2,
    boxShadow: `inset 0 -3px 0 0 ${tokens.colorBrandStroke1}`,
  },
  bodyRow: {
    ':hover td:first-child': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
});

function MatrixVisibilitySwitch({ styles, measureKey, label, checked, onToggle }) {
  const handleChange = useCallback((_, data) => {
    onToggle(measureKey, Boolean(data.checked));
  }, [measureKey, onToggle]);
  return (
    <span className={styles.switchWrap}>
      <Switch
        checked={Boolean(checked)}
        onChange={handleChange}
        size="small"
        aria-label={`Show ${label} in chart`}
      />
    </span>
  );
}

function RccpMatrixTable({
  measureRows,
  periods,
  cellMap,
  visibleKeys,
  onToggleVisible,
  onCellClick,
  interactive,
  gridWidth,
}) {
  const styles = useStyles();
  const isInteractive = interactive ?? Boolean(onCellClick);
  const periodHeaders = useMemo(() => buildMatrixPeriodHeaders(periods), [periods]);

  const handleClick = useCallback((cell) => {
    if (cell && onCellClick) onCellClick(cell);
  }, [onCellClick]);

  if (!measureRows.length || !periodHeaders.length) {
    return <Text>No matrix data for the selected window.</Text>;
  }

  return (
    <div className={styles.wrapper}>
    <Table size="small" className={styles.table} style={{ width: gridWidth || undefined }}>
      <TableHeader>
        <TableRow>
          <TableHeaderCell className={mergeClasses(styles.sticky, styles.headerSticky)}>Measure</TableHeaderCell>
          {periodHeaders.map((period) => (
            <TableHeaderCell
              key={period.key}
              className={mergeClasses(
                styles.weekCol,
                styles.weekHeader,
                isCurrentMatrixPeriod(period) && styles.currentHeader,
              )}
            >
              <div className={styles.weekColInner}>
                {period.yearLabel ? <div className={styles.yearHeader}>{period.yearLabel}</div> : null}
                <div className={styles.weekHeaderLabel}>{period.weekLabel}</div>
                <div className={styles.mondayHeader}>{period.mondayLabel}</div>
              </div>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {measureRows.map((row) => {
          const isCapacity = row.measureKey === RCCP_CAPACITY_MEASURE_KEY;
          const isOvercapacity = row.measureKey === RCCP_OVERCAPACITY_MEASURE_KEY;
          const isDerived = isCapacity || isOvercapacity;
          return (
            <TableRow key={row.measureKey} className={styles.bodyRow}>
              <TableCell className={styles.sticky}>
                <div className={styles.rowLabel}>
                  {onToggleVisible ? (
                    <MatrixVisibilitySwitch
                      styles={styles}
                      measureKey={row.measureKey}
                      label={row.label}
                      checked={Boolean(visibleKeys?.[row.measureKey])}
                      onToggle={onToggleVisible}
                    />
                  ) : null}
                  <span className={styles.rowName} title={row.label}>{row.label}</span>
                </div>
              </TableCell>
              {periodHeaders.map((period) => {
                const periodToken = matrixPeriodToken(period);
                const cell = cellMap.get(`${row.measureKey}|${period.year}|${periodToken}`);
                const periodLabel = formatMatrixPeriodAria(period);
                const value = isCapacity ? (cell?.availableQty ?? 0) : (cell?.confirmedQty ?? 0);
                const bg = isCapacity
                  ? tokens.colorNeutralBackground3
                  : statusToken(cell ? cell.statusColor : 'grey');
                const clickable = isInteractive && !isDerived && !period.month;
                return (
                  <TableCell
                    key={period.key}
                    className={mergeClasses(styles.weekCol, clickable && styles.cellInteractive)}
                    style={{ backgroundColor: bg }}
                    {...(clickable ? {
                      role: 'button',
                      tabIndex: 0,
                      'aria-label': `${row.label}, ${periodLabel}: ${formatMatrixQty(cell?.confirmedQty ?? 0)} of ${formatMatrixQty(cell?.availableQty ?? 0)}. Show purchase order lines.`,
                      onClick: () => handleClick(cell),
                      onKeyDown: (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleClick(cell);
                        }
                      },
                    } : {})}
                  >
                    <Text className={styles.qty}>{formatMatrixQty(value)}</Text>
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}

export default memo(RccpMatrixTable);

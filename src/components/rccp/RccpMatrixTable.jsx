import React, { memo, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Text, makeStyles, mergeClasses, tokens, shorthands,
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
import RccpMatrixRowToggle from './RccpMatrixRowToggle';

const useStyles = makeStyles({
  wrapper: {
    boxShadow: `0 0 0 1px ${tokens.colorNeutralStroke2}`,
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'visible',
    width: '100%',
    boxSizing: 'border-box',
  },
  table: {
    tableLayout: 'fixed',
    width: 'max-content',
    borderCollapse: 'separate',
    borderSpacing: 0,
    boxSizing: 'border-box',
  },
  sticky: {
    position: 'sticky',
    left: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 1,
    boxSizing: 'border-box',
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
  yearHeader: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    minHeight: '14px',
    lineHeight: '14px',
  },
  weekHeaderLabel: { fontWeight: tokens.fontWeightSemibold },
  mondayHeader: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
  rowName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  groupHeader: {
    backgroundColor: tokens.colorNeutralBackground2,
    fontWeight: tokens.fontWeightSemibold,
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
  activeSticky: {
    backgroundColor: tokens.colorBrandBackground2,
    boxShadow: `inset 3px 0 0 0 ${tokens.colorBrandStroke1}`,
  },
  activeRow: {
    ':hover td:first-child': { backgroundColor: tokens.colorBrandBackground2 },
  },
});

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
  const showYearRow = useMemo(
    () => periodHeaders.some((period) => period.yearLabel),
    [periodHeaders],
  );

  const handleClick = useCallback((cell) => {
    if (cell && onCellClick) onCellClick(cell);
  }, [onCellClick]);

  if (!measureRows.length || !periodHeaders.length) {
    return <Text>No matrix data for the selected window.</Text>;
  }

  return (
    <div className={styles.wrapper}>
    <Table
      size="small"
      className={styles.table}
      style={{ width: gridWidth || undefined, minWidth: gridWidth || undefined }}
    >
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
                {showYearRow ? (
                  <div className={styles.yearHeader}>{period.yearLabel || '\u00a0'}</div>
                ) : null}
                <div className={styles.weekHeaderLabel}>{period.weekLabel}</div>
                <div className={styles.mondayHeader}>{period.mondayLabel}</div>
              </div>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {measureRows.map((row) => {
          if (row.isPlanningDateGroup) {
            return (
              <TableRow key={row.measureKey}>
                <TableCell className={mergeClasses(styles.sticky, styles.groupHeader)}>
                  <span className={styles.rowName}>{row.label}</span>
                </TableCell>
                {periodHeaders.map((period) => (
                  <TableCell
                    key={period.key}
                    className={mergeClasses(styles.weekCol, styles.groupHeader)}
                  />
                ))}
              </TableRow>
            );
          }
          const isCapacity = row.measureKey === RCCP_CAPACITY_MEASURE_KEY;
          const isOvercapacity = row.measureKey === RCCP_OVERCAPACITY_MEASURE_KEY;
          const isDerived = isCapacity || isOvercapacity;
          const isPlanningDate = Boolean(row.isRequestedDelivery || row.isConfirmedDelivery);
          const isActivePlanning = isPlanningDate && Boolean(visibleKeys?.[row.measureKey]);
          return (
            <TableRow
              key={row.measureKey}
              className={mergeClasses(styles.bodyRow, isActivePlanning && styles.activeRow)}
            >
              <TableCell className={mergeClasses(styles.sticky, isActivePlanning && styles.activeSticky)}>
                  {onToggleVisible ? (
                    <RccpMatrixRowToggle
                      measureKey={row.measureKey}
                      label={row.label}
                      checked={Boolean(visibleKeys?.[row.measureKey])}
                      onToggle={onToggleVisible}
                      planningDate={isPlanningDate}
                      nested={isPlanningDate}
                    />
                  ) : (
                    <span className={styles.rowName} title={row.label}>{row.label}</span>
                  )}
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

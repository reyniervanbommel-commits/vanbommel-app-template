import React, { memo, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Text, Switch, makeStyles, mergeClasses, tokens, shorthands,
} from '@fluentui/react-components';
import {
  buildMatrixPeriodHeaders,
  formatMatrixQty,
  formatWeekLabel,
  isMatrixCellEmpty,
  RCCP_CAPACITY_MEASURE_KEY,
  RCCP_ROW_LABEL_WIDTH,
  RCCP_WEEK_COL_WIDTH,
  statusToken,
} from './rccpUtils';

const useStyles = makeStyles({
  table: { tableLayout: 'fixed', width: 'auto' },
  sticky: {
    position: 'sticky',
    left: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 1,
    width: `${RCCP_ROW_LABEL_WIDTH}px`,
    minWidth: `${RCCP_ROW_LABEL_WIDTH}px`,
    maxWidth: `${RCCP_ROW_LABEL_WIDTH}px`,
  },
  weekCol: {
    width: `${RCCP_WEEK_COL_WIDTH}px`,
    minWidth: `${RCCP_WEEK_COL_WIDTH}px`,
    maxWidth: `${RCCP_WEEK_COL_WIDTH}px`,
    textAlign: 'center',
    paddingLeft: tokens.spacingHorizontalXXS,
    paddingRight: tokens.spacingHorizontalXXS,
  },
  periodHeader: { textAlign: 'center', lineHeight: 1.2 },
  yearHeader: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
  weekHeader: { fontWeight: tokens.fontWeightSemibold },
  rowLabel: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalSNudge),
    minWidth: 0,
  },
  rowName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cell: {
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    ...shorthands.padding(tokens.spacingVerticalXS, tokens.spacingHorizontalXXS),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.gap('1px'),
    minHeight: '44px',
    justifyContent: 'center',
  },
  cellInteractive: { cursor: 'pointer' },
  loadValue: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase200 },
  utilValue: { color: tokens.colorNeutralForeground2, fontSize: tokens.fontSizeBase100 },
  capacityValue: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase200 },
});

function RccpMatrixTable({
  measureRows,
  periods,
  cellMap,
  visibleKeys,
  onToggleVisible,
  onCellClick,
  interactive,
  compact,
  gridWidth,
}) {
  const styles = useStyles();
  const isInteractive = interactive ?? Boolean(onCellClick);
  const periodHeaders = useMemo(() => buildMatrixPeriodHeaders(periods), [periods]);

  const visibleMeasureRows = useMemo(
    () => measureRows.filter((row) => periodHeaders.some((period) => {
      const cell = cellMap.get(`${row.measureKey}|${period.year}|${period.week}`);
      return !isMatrixCellEmpty(cell);
    })),
    [measureRows, periodHeaders, cellMap],
  );

  const handleClick = useCallback((cell) => {
    if (cell && onCellClick) onCellClick(cell);
  }, [onCellClick]);

  if (!visibleMeasureRows.length || !periodHeaders.length) {
    return <Text>No matrix data for the selected window.</Text>;
  }

  return (
    <Table size="small" className={styles.table} style={{ width: gridWidth || undefined }}>
      <TableHeader>
        <TableRow>
          <TableHeaderCell className={styles.sticky}>Measure</TableHeaderCell>
          {periodHeaders.map((period) => (
            <TableHeaderCell key={period.key} className={`${styles.weekCol} ${styles.periodHeader}`}>
              {period.yearLabel ? <div className={styles.yearHeader}>{period.yearLabel}</div> : null}
              <div className={styles.weekHeader}>{period.weekLabel}</div>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {visibleMeasureRows.map((row) => {
          const isCapacity = row.measureKey === RCCP_CAPACITY_MEASURE_KEY;
          return (
            <TableRow key={row.measureKey}>
              <TableCell className={styles.sticky}>
                <div className={styles.rowLabel}>
                  {!isCapacity && onToggleVisible ? (
                    <Switch
                      checked={Boolean(visibleKeys?.[row.measureKey])}
                      onChange={(_, data) => onToggleVisible(row.measureKey, Boolean(data.checked))}
                      aria-label={`Show ${row.label} in chart`}
                    />
                  ) : null}
                  <span className={styles.rowName} title={row.label}>{row.label}</span>
                </div>
              </TableCell>
              {periodHeaders.map((period) => {
                const cell = cellMap.get(`${row.measureKey}|${period.year}|${period.week}`);
                if (isMatrixCellEmpty(cell)) {
                  return <TableCell key={period.key} className={styles.weekCol} />;
                }

                const bg = isCapacity ? tokens.colorNeutralBackground3 : statusToken(cell.statusColor);
                const clickable = isInteractive && !isCapacity;
                return (
                  <TableCell key={period.key} className={styles.weekCol}>
                    <div
                      className={mergeClasses(styles.cell, clickable && styles.cellInteractive)}
                      style={{ backgroundColor: bg }}
                      {...(clickable ? {
                        role: 'button',
                        tabIndex: 0,
                        'aria-label': `${row.label}, ${formatWeekLabel(period.year, period.week)}: ${formatMatrixQty(cell.confirmedQty)} of ${formatMatrixQty(cell.availableQty)}. Show purchase order lines.`,
                        onClick: () => handleClick(cell),
                        onKeyDown: (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleClick(cell);
                          }
                        },
                      } : {})}
                    >
                      {isCapacity ? (
                        <Text className={styles.capacityValue}>{formatMatrixQty(cell.availableQty)}</Text>
                      ) : (
                        <>
                          <Text className={styles.loadValue}>{formatMatrixQty(cell.confirmedQty)}</Text>
                          <Text className={styles.utilValue}>/ {formatMatrixQty(cell.availableQty)}</Text>
                          {cell.utilPercent !== null && cell.utilPercent !== undefined && (
                            <Text className={styles.utilValue}>{cell.utilPercent}%</Text>
                          )}
                        </>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export default memo(RccpMatrixTable);

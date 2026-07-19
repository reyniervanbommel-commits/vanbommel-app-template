import React, { memo, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Text, Switch, makeStyles, mergeClasses, tokens, shorthands,
} from '@fluentui/react-components';
import {
  buildMatrixPeriodHeaders,
  formatMatrixQty,
  formatWeekLabel,
  RCCP_CAPACITY_MEASURE_KEY,
  RCCP_OVERCAPACITY_MEASURE_KEY,
  RCCP_ROW_LABEL_WIDTH,
  RCCP_WEEK_COL_WIDTH,
  statusToken,
} from './rccpUtils';

const useStyles = makeStyles({
  table: { tableLayout: 'fixed', width: 'auto', borderCollapse: 'collapse' },
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
    boxSizing: 'border-box',
    ...shorthands.padding(tokens.spacingVerticalXXS, '0'),
    textAlign: 'center',
    verticalAlign: 'middle',
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
  weekHeader: { fontWeight: tokens.fontWeightSemibold },
  mondayHeader: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
  rowLabel: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalSNudge),
    minWidth: 0,
  },
  rowName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cell: {
    width: '100%',
    boxSizing: 'border-box',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.padding(tokens.spacingVerticalXXS, tokens.spacingHorizontalXXS),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '28px',
  },
  cellInteractive: { cursor: 'pointer' },
  loadValue: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase200, lineHeight: 1 },
  capacityValue: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase200, lineHeight: 1 },
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

  const handleClick = useCallback((cell) => {
    if (cell && onCellClick) onCellClick(cell);
  }, [onCellClick]);

  if (!measureRows.length || !periodHeaders.length) {
    return <Text>No matrix data for the selected window.</Text>;
  }

  return (
    <Table size="small" className={styles.table} style={{ width: gridWidth || undefined }}>
      <TableHeader>
        <TableRow>
          <TableHeaderCell className={styles.sticky}>Measure</TableHeaderCell>
          {periodHeaders.map((period) => (
            <TableHeaderCell key={period.key} className={styles.weekCol}>
              <div className={styles.weekColInner}>
                {period.yearLabel ? <div className={styles.yearHeader}>{period.yearLabel}</div> : null}
                <div className={styles.weekHeader}>{period.weekLabel}</div>
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
                // Altijd een getal tonen (0 als er geen cel is), zodat een measure met alleen nullen
                // niet als lege regel oogt. Capaciteit toont zijn beschikbare aantal; load en
                // overcapaciteit tonen confirmedQty (overcapaciteit kan negatief zijn = tekort).
                const value = isCapacity ? (cell?.availableQty ?? 0) : (cell?.confirmedQty ?? 0);
                const bg = isCapacity
                  ? tokens.colorNeutralBackground3
                  : statusToken(cell ? cell.statusColor : 'grey');
                const clickable = isInteractive && !isDerived;
                return (
                  <TableCell key={period.key} className={styles.weekCol}>
                    <div className={styles.weekColInner}>
                      <div
                        className={mergeClasses(styles.cell, clickable && styles.cellInteractive)}
                        style={{ backgroundColor: bg }}
                        {...(clickable ? {
                          role: 'button',
                          tabIndex: 0,
                          'aria-label': `${row.label}, ${formatWeekLabel(period.year, period.week)}: ${formatMatrixQty(cell?.confirmedQty ?? 0)} of ${formatMatrixQty(cell?.availableQty ?? 0)}. Show purchase order lines.`,
                          onClick: () => handleClick(cell),
                          onKeyDown: (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleClick(cell);
                            }
                          },
                        } : {})}
                      >
                        <Text className={isCapacity ? styles.capacityValue : styles.loadValue}>
                          {formatMatrixQty(value)}
                        </Text>
                      </div>
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

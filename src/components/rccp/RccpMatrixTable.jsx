import React, { memo, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Text, makeStyles, tokens, shorthands,
} from '@fluentui/react-components';
import {
  buildMatrixPeriodHeaders,
  formatMatrixQty,
  isMatrixCellEmpty,
  statusToken,
} from './rccpUtils';

const useStyles = makeStyles({
  wrap: { overflowX: 'auto', width: '100%' },
  wrapCompact: { overflowX: 'auto', overflowY: 'auto', width: '100%', maxHeight: '100%' },
  cell: {
    minWidth: '72px',
    ...shorthands.borderRadius('6px'),
    ...shorthands.padding('6px', '8px'),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.gap('2px'),
  },
  cellCompact: {
    minWidth: '56px',
    ...shorthands.padding('4px', '5px'),
  },
  cellInteractive: { cursor: 'pointer' },
  sticky: {
    position: 'sticky',
    left: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 1,
    fontWeight: tokens.fontWeightSemibold,
  },
  periodHeader: { textAlign: 'center', lineHeight: 1.2 },
  yearHeader: {
    fontSize: '10px',
    color: tokens.colorNeutralForeground3,
  },
  weekHeader: { fontWeight: tokens.fontWeightSemibold },
  groupHint: { color: tokens.colorNeutralForeground3, fontSize: '11px', fontWeight: 400 },
  loadValue: { fontWeight: tokens.fontWeightSemibold },
  utilValue: { color: tokens.colorNeutralForeground2, fontSize: '11px' },
});

function RccpMatrixTable({
  categories, periods, cellMap, onCellClick, interactive, compact, groupColumnKey,
}) {
  const styles = useStyles();
  const isInteractive = interactive ?? Boolean(onCellClick);
  const periodHeaders = useMemo(() => buildMatrixPeriodHeaders(periods), [periods]);

  const visibleCategories = useMemo(
    () => categories.filter((category) => periodHeaders.some((period) => {
      const cell = cellMap.get(`${category}|${period.year}|${period.week}`);
      return !isMatrixCellEmpty(cell);
    })),
    [categories, periodHeaders, cellMap],
  );

  const handleClick = useCallback((cell) => {
    if (cell && onCellClick) onCellClick(cell);
  }, [onCellClick]);

  if (!visibleCategories.length || !periodHeaders.length) {
    return <Text>No matrix data for the selected window.</Text>;
  }

  const groupTitle = groupColumnKey
    ? `PO values from column "${groupColumnKey}" — each row is one value from that column`
    : 'Each row groups PO load by the configured category column';

  return (
    <div className={compact ? styles.wrapCompact : styles.wrap}>
      <Table size="small">
        <TableHeader>
          <TableRow>
            <TableHeaderCell className={styles.sticky} title={groupTitle}>
              <div>Group</div>
              {groupColumnKey ? <div className={styles.groupHint}>{groupColumnKey}</div> : null}
            </TableHeaderCell>
            {periodHeaders.map((period) => (
              <TableHeaderCell key={period.key} className={styles.periodHeader}>
                {period.yearLabel ? (
                  <div className={styles.yearHeader}>{period.yearLabel}</div>
                ) : null}
                <div className={styles.weekHeader}>{period.weekLabel}</div>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleCategories.map((category) => (
            <TableRow key={category}>
              <TableCell className={styles.sticky}>{category}</TableCell>
              {periodHeaders.map((period) => {
                const cell = cellMap.get(`${category}|${period.year}|${period.week}`);
                if (isMatrixCellEmpty(cell)) {
                  return <TableCell key={period.key} />;
                }

                const bg = statusToken(cell.statusColor);
                return (
                  <TableCell key={period.key}>
                    <div
                      className={`${styles.cell}${compact ? ` ${styles.cellCompact}` : ''}${isInteractive ? ` ${styles.cellInteractive}` : ''}`}
                      style={{ backgroundColor: bg }}
                      {...(isInteractive ? {
                        role: 'button',
                        tabIndex: 0,
                        onClick: () => handleClick(cell),
                        onKeyDown: (e) => { if (e.key === 'Enter') handleClick(cell); },
                      } : {})}
                      aria-label={`${category} load ${cell.confirmedQty} capacity ${cell.availableQty}`}
                    >
                      <Text size={200} className={styles.loadValue}>{formatMatrixQty(cell.confirmedQty)}</Text>
                      <Text size={100}>/ {formatMatrixQty(cell.availableQty)}</Text>
                      {cell.utilPercent !== null && cell.utilPercent !== undefined && (
                        <Text className={styles.utilValue}>{cell.utilPercent}%</Text>
                      )}
                    </div>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default memo(RccpMatrixTable);

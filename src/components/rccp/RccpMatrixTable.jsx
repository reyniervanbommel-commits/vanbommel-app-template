import React, { memo, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Text, makeStyles, tokens, shorthands,
} from '@fluentui/react-components';
import { formatWeekLabel, statusToken } from './rccpUtils';

const useStyles = makeStyles({
  wrap: { overflowX: 'auto' },
  cell: {
    minWidth: '120px',
    cursor: 'pointer',
    ...shorthands.borderRadius('6px'),
    ...shorthands.padding('8px'),
  },
  sticky: {
    position: 'sticky',
    left: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 1,
    fontWeight: tokens.fontWeightSemibold,
  },
});

function RccpMatrixTable({ categories, periods, cellMap, onCellClick }) {
  const styles = useStyles();

  const handleClick = useCallback((cell) => {
    if (cell && onCellClick) onCellClick(cell);
  }, [onCellClick]);

  if (!categories.length || !periods.length) {
    return <Text>No matrix data for the selected window.</Text>;
  }

  return (
    <div className={styles.wrap}>
      <Table size="small">
        <TableHeader>
          <TableRow>
            <TableHeaderCell className={styles.sticky}>Category</TableHeaderCell>
            {periods.map((p) => (
              <TableHeaderCell key={p.key}>{formatWeekLabel(p.year, p.week)}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category}>
              <TableCell className={styles.sticky}>{category}</TableCell>
              {periods.map((p) => {
                const cell = cellMap.get(`${category}|${p.year}|${p.week}`);
                const bg = statusToken(cell?.statusColor || 'grey');
                return (
                  <TableCell key={p.key}>
                    <div
                      className={styles.cell}
                      style={{ backgroundColor: bg }}
                      role="button"
                      tabIndex={0}
                      aria-label={cell ? `${category} ${cell.statusLabel}` : `${category} empty`}
                      onClick={() => handleClick(cell)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(cell); }}
                    >
                      <Text size={200} weight="semibold">{cell?.statusLabel || 'N/A'}</Text>
                      <Text size={100}>
                        {cell ? `${cell.confirmedQty}/${cell.availableQty}` : '0/0'}
                      </Text>
                      {cell?.utilPercent !== null && cell?.utilPercent !== undefined && (
                        <Text size={100}>{cell.utilPercent}%</Text>
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

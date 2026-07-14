import React, { memo, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';

const useStyles = makeStyles({
  wrapper: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    overflowX: 'auto',
  },
  table: {
    minWidth: '100%',
  },
  headerRow: {
    backgroundColor: tokens.colorNeutralBackground2,
  },
  headerCell: {
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    ...shorthands.padding('10px', '12px'),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    whiteSpace: 'nowrap',
  },
  row: {
    backgroundColor: tokens.colorNeutralBackground1,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  cell: {
    ...shorthands.padding('11px', '12px'),
    ...shorthands.borderTop('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    color: tokens.colorNeutralForeground1,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    whiteSpace: 'nowrap',
  },
  leadingCell: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  statusPillBase: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '92px',
    ...shorthands.padding('4px', '10px'),
    borderRadius: tokens.borderRadiusCircular,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase200,
  },
  statusPillInfo: {
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
  },
  statusPillSuccess: {
    color: tokens.colorPaletteGreenForeground1,
    backgroundColor: tokens.colorPaletteGreenBackground1,
  },
  statusPillWarning: {
    color: tokens.colorPaletteDarkOrangeForeground1,
    backgroundColor: tokens.colorPaletteDarkOrangeBackground1,
  },
  statusPillDanger: {
    color: tokens.colorPaletteRedForeground1,
    backgroundColor: tokens.colorPaletteRedBackground1,
  },
  emptyStateCell: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
  },
});

const normalizeCellValue = (value) => {
  if (React.isValidElement(value)) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value);
};

const formatDateCellValue = (value) => {
  if (React.isValidElement(value)) {
    return value;
  }

  const normalized = normalizeCellValue(value);
  if (normalized === '-') {
    return normalized;
  }

  const parsedDate = new Date(normalized);
  if (Number.isNaN(parsedDate.getTime())) {
    return normalized;
  }

  return new Intl.DateTimeFormat('nl-NL').format(parsedDate);
};

const resolveColumnType = (column) => {
  if (column.type) {
    return column.type;
  }

  if (/status/i.test(column.key)) {
    return 'status';
  }

  if (/date/i.test(column.key)) {
    return 'date';
  }

  return 'text';
};

const resolveStatusPillClassName = (styles, value) => {
  if (React.isValidElement(value)) {
    return styles.statusPillInfo;
  }

  const normalized = value.toLowerCase();

  if (/(draft|nieuw|open|pending)/i.test(normalized)) {
    return styles.statusPillInfo;
  }

  if (/(geleverd|completed|processed|actief|done|success)/i.test(normalized)) {
    return styles.statusPillSuccess;
  }

  if (/(waarschuwing|in behandeling|processing|warning)/i.test(normalized)) {
    return styles.statusPillWarning;
  }

  if (/(error|fout|cancel|geblokkeerd|failed)/i.test(normalized)) {
    return styles.statusPillDanger;
  }

  return styles.statusPillInfo;
};

function DataTable({ columns, items }) {
  const styles = useStyles();
  const hasItems = items.length > 0;

  const headerCells = useMemo(
    () =>
      columns.map((column) => (
        <TableHeaderCell key={column.key} className={styles.headerCell}>
          {column.header}
        </TableHeaderCell>
      )),
    [columns, styles.headerCell],
  );

  const rows = useMemo(() => {
    if (!hasItems) {
      return [
        <TableRow key="empty" className={styles.row}>
          <TableCell
            className={mergeClasses(styles.cell, styles.emptyStateCell)}
            colSpan={Math.max(columns.length, 1)}
          >
            No data found
          </TableCell>
        </TableRow>,
      ];
    }

    return items.map((item, rowIndex) => (
      <TableRow key={item.id ?? rowIndex} className={styles.row}>
        {columns.map((column, columnIndex) => {
          const rawValue = column.render ? column.render(item) : item[column.key];
          const cellType = resolveColumnType(column);
          const displayValue = cellType === 'date' ? formatDateCellValue(rawValue) : normalizeCellValue(rawValue);

          return (
            <TableCell
              key={column.key}
              className={mergeClasses(styles.cell, columnIndex === 0 ? styles.leadingCell : undefined)}
            >
              {cellType === 'status' && typeof displayValue === 'string' && displayValue !== '-' ? (
                <span className={mergeClasses(styles.statusPillBase, resolveStatusPillClassName(styles, displayValue))}>
                  {displayValue}
                </span>
              ) : (
                displayValue
              )}
            </TableCell>
          );
        })}
      </TableRow>
    ));
  }, [columns, hasItems, items, styles]);

  return (
    <div className={styles.wrapper}>
      <Table className={styles.table} size="small">
        <TableHeader>
          <TableRow className={styles.headerRow}>{headerCells}</TableRow>
        </TableHeader>
        <TableBody>{rows}</TableBody>
      </Table>
    </div>
  );
}

export default memo(DataTable);

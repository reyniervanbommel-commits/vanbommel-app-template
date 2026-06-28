import React from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  subTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  subHeaderCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('6px', '8px'),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground3,
    whiteSpace: 'nowrap',
  },
  subCell: {
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('6px', '8px'),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
});

function toDisplay(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '-';
}

export default function PurchaseOrdersSubitemsTable({ rowId, lines }) {
  const styles = useStyles();

  return (
    <table className={styles.subTable}>
      <thead>
        <tr>
          <th className={styles.subHeaderCell}>Subitem-ID</th>
          <th className={styles.subHeaderCell}>Subitemnaam</th>
          <th className={styles.subHeaderCell}>What To Test</th>
          <th className={styles.subHeaderCell}>Description</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line, index) => (
          <tr key={`${rowId}-line-${line.lineNumber || index}`}>
            <td className={styles.subCell}>
              {toDisplay(line.purchaseOrderNumber)}-{toDisplay(line.lineNumber)}
            </td>
            <td className={styles.subCell}>{toDisplay(line.itemNumber)}</td>
            <td className={styles.subCell}>{toDisplay(line.description)}</td>
            <td className={styles.subCell}>
              {toDisplay(line.quantity)} {toDisplay(line.unit)} | {toDisplay(line.lineAmount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


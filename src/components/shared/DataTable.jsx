import React from 'react';
import { Table, TableHeader, TableHeaderCell, TableBody, TableRow, TableCell } from '@fluentui/react-components';

export default function DataTable({ columns, items }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>{columns.map(col => <TableHeaderCell key={col.key}>{col.header}</TableHeaderCell>)}</TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item, i) => (
          <TableRow key={item.id || i}>
            {columns.map(col => <TableCell key={col.key}>{col.render ? col.render(item) : item[col.key]}</TableCell>)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

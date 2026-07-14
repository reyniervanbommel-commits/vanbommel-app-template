import React from 'react';
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { DeleteRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('16px', '20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  muted: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  tableWrap: {
    overflowX: 'auto',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('6px'),
  },
});

/**
 * Toont bestaande Excel-koppelingen met de mogelijkheid ze te verwijderen.
 */
export default function ExistingLinksList({ links, onDelete }) {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <Text weight="semibold">Existing links</Text>
      {!links?.length ? (
        <Text className={styles.muted} block>No external links have been published yet.</Text>
      ) : (
        <div className={styles.tableWrap}>
          <Table size="small">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Main table</TableHeaderCell>
                <TableHeaderCell>Scope</TableHeaderCell>
                <TableHeaderCell>Keyveld</TableHeaderCell>
                <TableHeaderCell>Dataset</TableHeaderCell>
                <TableHeaderCell>Columnmen</TableHeaderCell>
                <TableHeaderCell>Action</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {links.map((link) => {
                const fieldCount = link.fields ? Object.keys(link.fields).length : 0;
                return (
                  <TableRow key={link.id}>
                    <TableCell><span className={styles.mono}>{link.mainTableKey}</span></TableCell>
                    <TableCell>
                      <Badge appearance="tint" color="informative" size="small">
                        {link.sourceScope === 'detail' ? 'detail' : 'master'}
                      </Badge>
                    </TableCell>
                    <TableCell><span className={styles.mono}>{link.sourceField || '—'}</span></TableCell>
                    <TableCell><span className={styles.mono}>{link.datasetTableKey}</span></TableCell>
                    <TableCell>
                      <Badge appearance="tint" color="brand" size="small">{fieldCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        appearance="subtle"
                        size="small"
                        icon={<DeleteRegular />}
                        onClick={() => onDelete(link.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

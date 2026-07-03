import React from 'react';
import {
  Badge,
  Checkbox,
  Input,
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

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('12px') },
  intro: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200 },
  samples: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  tableWrap: {
    maxHeight: '420px',
    overflowY: 'auto',
    overflowX: 'auto',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderRadius('6px'),
  },
  headerCell: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground2,
    whiteSpace: 'nowrap',
    ...shorthands.padding('8px', '12px'),
  },
  keyInput: { minWidth: '200px' },
  disabledKey: { color: tokens.colorNeutralForeground4, fontSize: tokens.fontSizeBase200 },
});

/**
 * Stap 3: kolommen kiezen. Aangevinkte dataset-kolommen worden read-only
 * verrijkingskolommen; per kolom kan de afgeleide kolom-key aangepast worden
 * (default = dataset-kolom-key). Sleutelveld zelf is uitgesloten (niet verrijken op eigen sleutel).
 */
export default function StepColumns({
  dataset,
  datasetKeyField,
  selectedColumns,
  derivedKeys,
  onToggle,
  onDerivedKey,
}) {
  const styles = useStyles();
  const columns = (dataset?.columns || []).filter((c) => c.key !== datasetKeyField);

  return (
    <div className={styles.root}>
      <Text className={styles.intro} block>
        Kies welke datasetkolommen als read-only verrijkingskolommen op de hoofdtabel verschijnen.
        Het sleutelveld zelf hoeft niet gekozen te worden. Pas eventueel de kolom-sleutel aan.
      </Text>
      <div>
        <Badge appearance="tint" color="brand" size="small">
          {selectedColumns.size} gekozen
        </Badge>
      </div>
      <div className={styles.tableWrap}>
        <Table size="small">
          <TableHeader>
            <TableRow>
              <TableHeaderCell className={styles.headerCell}>Gebruiken</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Kolom</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Type</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Voorbeeldwaarden</TableHeaderCell>
              <TableHeaderCell className={styles.headerCell}>Kolom-sleutel</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.map((col) => {
              const checked = selectedColumns.has(col.key);
              return (
                <TableRow key={col.key}>
                  <TableCell>
                    <Checkbox
                      checked={checked}
                      onChange={() => onToggle(col.key, col.key)}
                    />
                  </TableCell>
                  <TableCell>
                    <Text weight="semibold">{col.label}</Text>
                    <Text className={styles.mono} block>{col.key}</Text>
                  </TableCell>
                  <TableCell><span className={styles.samples}>{col.dataType || '—'}</span></TableCell>
                  <TableCell>
                    <Text className={styles.samples}>
                      {col.samples?.length ? col.samples.join(' | ') : '—'}
                    </Text>
                  </TableCell>
                  <TableCell>
                    {checked ? (
                      <Input
                        className={styles.keyInput}
                        size="small"
                        value={derivedKeys[col.key] ?? col.key}
                        onChange={(_, d) => onDerivedKey(col.key, d.value)}
                      />
                    ) : (
                      <span className={styles.disabledKey}>—</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

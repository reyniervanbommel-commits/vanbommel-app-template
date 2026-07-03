import React, { memo } from 'react';
import { Badge, Text, Tooltip, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { KeyRegular, TableRegular, LinkRegular, BranchRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('12px') },
  cards: { display: 'flex', ...shorthands.gap('12px'), flexWrap: 'wrap', alignItems: 'stretch' },
  entityCard: {
    flex: '1 1 240px',
    minWidth: '240px',
    maxWidth: '360px',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke2),
    ...shorthands.borderRadius('8px'),
    boxShadow: tokens.shadow4,
    overflow: 'hidden',
  },
  entityHeader: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('10px', '14px'),
    backgroundColor: tokens.colorBrandBackground2,
    ...shorthands.borderBottom('1px', 'solid', tokens.colorBrandStroke2),
  },
  entityBody: { ...shorthands.padding('12px', '14px'), display: 'flex', flexDirection: 'column', ...shorthands.gap('6px') },
  fieldRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('6px'), fontSize: tokens.fontSizeBase200 },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200, wordBreak: 'break-all' },
  muted: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  relations: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
    ...shorthands.padding('12px', '14px'),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
  },
  relationRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), fontSize: tokens.fontSizeBase200, flexWrap: 'wrap' },
});

function EntityCard({ table }) {
  const styles = useStyles();
  return (
    <div className={styles.entityCard}>
      <div className={styles.entityHeader}>
        <TableRegular />
        <Text weight="semibold">{table.label}</Text>
      </div>
      <div className={styles.entityBody}>
        <span className={styles.mono}>{table.sourceEntity}</span>
        {(table.keyFields || []).map((key) => (
          <div key={key} className={styles.fieldRow}>
            <Tooltip content="Sleutelveld" relationship="label">
              <KeyRegular fontSize={14} />
            </Tooltip>
            <span className={styles.mono}>{key}</span>
          </div>
        ))}
        {table.hasDetail ? (
          <div className={styles.fieldRow}>
            <BranchRegular fontSize={14} />
            <span className={styles.muted}>
              1 : n detail{table.detailEntity ? ` (${table.detailEntity})` : ''}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Generiek ER-overzicht (#AB:161): N entiteit-kaarten + lookup-relaties (fk_join, n:1).
 * Data komt uit GET /api/data ({ tables, edges }). Vervangt het oude, hardcoded 2-node-diagram.
 */
function DataModelDiagram({ tables = [], edges = [] }) {
  const styles = useStyles();
  if (!tables.length) return null;
  const labelByKey = new Map(tables.map((t) => [t.key, t.label]));

  return (
    <div className={styles.root}>
      <div className={styles.cards}>
        {tables.map((t) => <EntityCard key={t.key} table={t} />)}
      </div>
      {edges.length ? (
        <div className={styles.relations}>
          <Text weight="semibold" size={200}>Relaties</Text>
          {edges.map((e, i) => (
            <div className={styles.relationRow} key={`${e.from}-${e.to}-${i}`}>
              <LinkRegular fontSize={14} />
              <Text size={200} weight="semibold">{labelByKey.get(e.from) || e.from}</Text>
              <Badge appearance="tint" color="brand" size="small">{e.cardinality || 'n:1'}</Badge>
              <Text size={200} weight="semibold">{labelByKey.get(e.to) || e.to}</Text>
              {e.on ? (
                <span className={styles.muted}>
                  via <span className={styles.mono}>{e.on}</span>{e.sourceScope === 'detail' ? ' (regel)' : ''}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default memo(DataModelDiagram);

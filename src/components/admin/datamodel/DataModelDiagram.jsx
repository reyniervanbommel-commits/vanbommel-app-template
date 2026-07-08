import React, { memo } from 'react';
import { Badge, Text, Tooltip, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { KeyRegular, TableRegular, ArrowRightRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  diagram: {
    display: 'flex',
    alignItems: 'stretch',
    ...shorthands.gap('12px'),
    flexWrap: 'wrap',
  },
  entityCard: {
    flex: '1 1 260px',
    minWidth: '260px',
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
  entityBody: {
    ...shorthands.padding('12px', '14px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    fontSize: tokens.fontSizeBase200,
  },
  mono: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
    wordBreak: 'break-all',
  },
  muted: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  relationsWrap: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('6px'),
  },
  relationRow: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  relationTitle: {
    marginTop: '4px',
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  relationBadgeWrap: { display: 'flex', flexWrap: 'wrap', ...shorthands.gap('4px') },
});

function EntityCard({ entity, columnCount, visibleCount, rowCount }) {
  const styles = useStyles();
  return (
    <div className={styles.entityCard}>
      <div className={styles.entityHeader}>
        <TableRegular />
        <Text weight="semibold">{entity.title}</Text>
      </div>
      <div className={styles.entityBody}>
        <span className={styles.mono}>{entity.name}</span>
        <span className={styles.muted}>Path: <span className={styles.mono}>{entity.path}</span></span>
        {entity.expandedVia ? (
          <span className={styles.muted}>
            Fetched via <span className={styles.mono}>$expand={entity.expandedVia}</span> on the header call
          </span>
        ) : null}
        {entity.keys.map((key) => (
          <div key={key} className={styles.fieldRow}>
            <Tooltip content="Key field" relationship="label">
              <KeyRegular fontSize={14} />
            </Tooltip>
            <span className={styles.mono}>{key}</span>
          </div>
        ))}
        <span className={styles.muted}>
          {visibleCount} of {columnCount} columns visible
          {typeof rowCount === 'number' ? ` · ${rowCount.toLocaleString('nl-NL')} rows cached` : ''}
        </span>
      </div>
    </div>
  );
}

function lookupToRelationText(lookup) {
  const sourceLabel = lookup.sourceScope === 'detail' ? 'PO line' : 'PO header';
  const targetLabel = lookup.targetTableLabel || lookup.targetTableKey;
  return `${sourceLabel} n:1 ${targetLabel}`;
}

function DataModelDiagram({ entities, relation, columns, cache, lookups = [] }) {
  const styles = useStyles();
  const header = entities.find((e) => e.id === 'header');
  const line = entities.find((e) => e.id === 'line');
  const lookupEntities = lookups.map((lookup) => ({
    id: `lookup-${lookup.targetTableKey}`,
    title: lookup.targetTableLabel || lookup.targetTableKey,
    name: lookup.targetTableKey,
    path: lookup.targetTableKey,
    keys: [lookup.targetKeyField].filter(Boolean),
    cacheTable: 'tb_cache',
  }));
  const cards = [header, line, ...lookupEntities].filter(Boolean);
  if (!cards.length) return null;

  const headerCols = columns.header || [];
  const lineCols = columns.line || [];

  return (
    <>
      <div className={styles.diagram}>
        {cards.map((entity) => {
          // Cache counts are available for the selected table only; lookup targets omit row count.
          // This keeps the diagram accurate while still showing target entities and relation keys.
          const isLine = entity.id === 'line';
          const isLookup = String(entity.id).startsWith('lookup-');
          return (
            <EntityCard
              key={entity.id}
              entity={entity}
              columnCount={isLine ? lineCols.length : headerCols.length}
              visibleCount={(isLine ? lineCols : headerCols).filter((c) => c.isActive).length}
              rowCount={isLookup ? undefined : (isLine ? cache?.detailRows : cache?.masterRows)}
            />
          );
        })}
      </div>

      <div className={styles.relationsWrap}>
        <Text className={styles.relationTitle}>Relations</Text>
        {relation ? (
          <div className={styles.relationRow}>
            <Badge appearance="tint" color="brand" size="small">
              1:n
            </Badge>
            <span>{`${header?.title || 'Header'} -> ${line?.title || 'Line'}`}</span>
            <div className={styles.relationBadgeWrap}>
              {(relation?.onFields || []).map((field) => (
                <Badge key={field} appearance="outline" size="small">{field}</Badge>
              ))}
            </div>
          </div>
        ) : null}
        {lookups.map((lookup) => (
          <div key={`${lookup.sourceScope}-${lookup.targetTableKey}-${lookup.sourceField}`} className={styles.relationRow}>
            <ArrowRightRegular fontSize={14} />
            <span>{lookupToRelationText(lookup)}</span>
            <div className={styles.relationBadgeWrap}>
              <Badge appearance="outline" size="small">{lookup.sourceField}</Badge>
              <Badge appearance="outline" size="small">{lookup.targetKeyField}</Badge>
            </div>
          </div>
        ))}
        {!relation && !lookups.length ? (
          <Text size={200}>No relations configured for this entity.</Text>
        ) : null}
      </div>
    </>
  );
}

export default memo(DataModelDiagram);

/*
  Note:
  The previous SVG connector implementation was limited to exactly 2 entities.
  This generalized version keeps the overview readable for PO + lookup nodes.
*/

import React, { memo } from 'react';
import { Badge, Text, Tooltip, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { KeyRegular, TableRegular, LinkRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  diagram: {
    display: 'flex',
    alignItems: 'stretch',
    ...shorthands.gap('0px'),
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
  connector: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.padding('8px', '4px'),
    minWidth: '170px',
    flex: '0 1 auto',
  },
  connectorSvg: { display: 'block' },
  connectorLabel: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('4px'),
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  keyBadgeWrap: { display: 'flex', flexWrap: 'wrap', ...shorthands.gap('4px'), justifyContent: 'center' },
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

/**
 * Visueel ER-diagram (header 1:n lines) met de koppelvelden op de connector.
 * Bewust simpel gehouden (flex + SVG) — geen diagram-library nodig voor 2 entiteiten.
 */
function DataModelDiagram({ entities, relation, columns, cache }) {
  const styles = useStyles();
  const header = entities.find((e) => e.id === 'header');
  const line = entities.find((e) => e.id === 'line');
  if (!header || !line) return null;

  const headerCols = columns.header || [];
  const lineCols = columns.line || [];

  return (
    <div className={styles.diagram}>
      <EntityCard
        entity={header}
        columnCount={headerCols.length}
        visibleCount={headerCols.filter((c) => c.isActive).length}
        rowCount={cache ? cache.headerCount : undefined}
      />

      <div className={styles.connector}>
        <div className={styles.connectorLabel}>
          <LinkRegular fontSize={14} />
          <span>1&nbsp;:&nbsp;n</span>
        </div>
        <svg className={styles.connectorSvg} width="150" height="28" viewBox="0 0 150 28" aria-hidden="true">
          {/* Relatielijn met crow's foot aan de n-zijde */}
          <line x1="4" y1="14" x2="132" y2="14" stroke={tokens.colorBrandStroke1} strokeWidth="2" />
          <line x1="4" y1="6" x2="4" y2="22" stroke={tokens.colorBrandStroke1} strokeWidth="2" />
          <line x1="132" y1="14" x2="146" y2="5" stroke={tokens.colorBrandStroke1} strokeWidth="2" />
          <line x1="132" y1="14" x2="146" y2="14" stroke={tokens.colorBrandStroke1} strokeWidth="2" />
          <line x1="132" y1="14" x2="146" y2="23" stroke={tokens.colorBrandStroke1} strokeWidth="2" />
        </svg>
        <div className={styles.keyBadgeWrap}>
          {(relation?.onFields || []).map((field) => (
            <Badge key={field} appearance="tint" color="brand" size="small">{field}</Badge>
          ))}
        </div>
      </div>

      <EntityCard
        entity={line}
        columnCount={lineCols.length}
        visibleCount={lineCols.filter((c) => c.isActive).length}
        rowCount={cache ? cache.lineCount : undefined}
      />
    </div>
  );
}

export default memo(DataModelDiagram);

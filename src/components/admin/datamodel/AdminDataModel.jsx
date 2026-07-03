import React from 'react';
import {
  Badge,
  Spinner,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import DataModelDiagram from './DataModelDiagram';
import EntityColumnsTable from './EntityColumnsTable';
import SyncFilterBuilder from './SyncFilterBuilder';
import DataPreviewTables from './DataPreviewTables';
import { useDataModelAdmin } from '../../../hooks/useDataModelAdmin';
import { formatSyncedAt } from '../../../utils/purchaseOrderFormat';

const useStyles = makeStyles({
  root: { width: '100%', maxWidth: 'none', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  intro: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  section: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('16px', '20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  statusRow: { display: 'flex', alignItems: 'center', ...shorthands.gap('8px'), flexWrap: 'wrap' },
  mono: { fontFamily: tokens.fontFamilyMonospace, fontSize: tokens.fontSizeBase200, wordBreak: 'break-all' },
  error: { color: tokens.colorPaletteRedForeground1 },
});

/**
 * Admin tab "Data model": shows which D365 tables the app fetches, how they
 * are related (visually), and manages per-column visibility + write-back.
 * Currently limited to Purchase Order headers and lines.
 */
export default function AdminDataModel() {
  const styles = useStyles();
  const {
    entities,
    relation,
    connection,
    columns,
    cache,
    syncFilter,
    filterCatalog,
    previewTables,
    loading,
    error,
    togglingKey,
    syncNow,
    toggleVisibility,
    toggleWriteback,
  } = useDataModelAdmin();

  if (loading) return <Spinner label="Loading data model..." />;

  return (
    <div className={styles.root}>
      <div>
        <Text size={600} weight="semibold" block>Data model</Text>
        <Text className={styles.intro} block>
          These tables are fetched from D365 and cached in SQL. Use the toggles below to control
          which columns are visible on the Purchase Orders screen and which columns allow
          corrections to be written back to D365.
        </Text>
      </div>

      {error ? <Text className={styles.error} block>{error}</Text> : null}

      <div className={styles.section}>
        <Text weight="semibold">Fetched tables and relationship</Text>
        <DataModelDiagram entities={entities} relation={relation} columns={columns} cache={cache} />
        {relation ? <Text className={styles.intro}>{relation.description}</Text> : null}
        <div className={styles.statusRow}>
          {connection?.baseUrl ? (
            <>
              <Text size={200}>Environment:</Text>
              <span className={styles.mono}>{connection.baseUrl}</span>
            </>
          ) : (
            <Badge appearance="tint" color="danger">No D365 environment configured</Badge>
          )}
          {connection?.company ? (
            <Badge appearance="tint" color="brand">Company: {connection.company}</Badge>
          ) : null}
        </div>
        {cache ? (
          <div className={styles.statusRow}>
            <Text size={200}>Cache:</Text>
            <Badge appearance="tint" color={cache.stale ? 'warning' : 'success'}>
              {cache.lastFullSyncAt
                ? `Last synced ${formatSyncedAt(cache.lastFullSyncAt) || 'unknown'}`
                : 'Never synced'}
            </Badge>
            {cache.removedCount > 0 ? (
              <Badge appearance="tint" color="warning">{cache.removedCount} removed in D365</Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      <SyncFilterBuilder filterCatalog={filterCatalog} syncFilter={syncFilter} onSyncNow={syncNow} />

      <DataPreviewTables previewTables={previewTables} />

      <EntityColumnsTable
        title="Header columns"
        entityName="PurchaseOrderHeadersV2"
        columns={columns.header}
        togglingKey={togglingKey}
        onToggleVisibility={toggleVisibility}
        onToggleWriteback={toggleWriteback}
      />

      <EntityColumnsTable
        title="Line columns"
        entityName="PurchaseOrderLinesV2"
        columns={columns.line}
        togglingKey={togglingKey}
        onToggleVisibility={toggleVisibility}
        onToggleWriteback={toggleWriteback}
      />
    </div>
  );
}

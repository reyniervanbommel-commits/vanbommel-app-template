import React from 'react';
import {
  Spinner,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import SyncFilterBuilder from './SyncFilterBuilder';
import DataPreviewTables from './DataPreviewTables';
import { useDataModelAdmin } from '../../../hooks/useDataModelAdmin';

const useStyles = makeStyles({
  root: { width: '100%', maxWidth: 'none', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  intro: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1 },
});

/**
 * Admin tab "Data model": beheert kolomzichtbaarheid en write-back voor
 * Purchase Order headers + lines in gecombineerde tabellen met sampledata.
 */
export default function AdminDataModel() {
  const styles = useStyles();
  const {
    relation,
    columns,
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
          Manage the Purchase Order Header and Line fields in one place. Admins can choose which
          columns are visible on the table page, enable write-back where allowed, and see sample
          values from the latest synced dataset.
        </Text>
      </div>

      {error ? <Text className={styles.error} block>{error}</Text> : null}

      <SyncFilterBuilder filterCatalog={filterCatalog} syncFilter={syncFilter} onSyncNow={syncNow} />

      <DataPreviewTables
        previewTables={previewTables}
        columns={columns}
        relation={relation}
        togglingKey={togglingKey}
        onToggleVisibility={toggleVisibility}
        onToggleWriteback={toggleWriteback}
      />
    </div>
  );
}

import React, { useState } from 'react';
import {
  Spinner,
  Tab,
  TabList,
  Text,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import SyncFilterBuilder from './SyncFilterBuilder';
import DataPreviewTables from './DataPreviewTables';
import ExcelLinkWizard from './ExcelLinkWizard';
import { useDataModelAdmin } from '../../../hooks/useDataModelAdmin';

const useStyles = makeStyles({
  root: { width: '100%', maxWidth: 'none', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  intro: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1 },
});

/**
 * Admin tab "Data model": kolomzichtbaarheid + write-back voor Purchase Orders, plus een tab
 * "Externe koppelingen" om een Excel als read-only verrijking aan een hoofdtabel te koppelen (#AB:162).
 */
export default function AdminDataModel() {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState('purchase-orders');
  const po = useDataModelAdmin();

  return (
    <div className={styles.root}>
      <div>
        <Text size={600} weight="semibold" block>Data model</Text>
        <Text className={styles.intro} block>
          Beheer welke Purchase Order-velden zichtbaar zijn en schakel write-back in waar toegestaan.
          Via "Externe koppelingen" koppel je een Excel-bestand als read-only kolommen aan een hoofdtabel.
        </Text>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={(_, d) => setSelectedTab(d.value)}>
        <Tab value="purchase-orders">Inkooporders</Tab>
        <Tab value="excel-links">Externe koppelingen</Tab>
      </TabList>

      {selectedTab === 'purchase-orders' ? (
        po.loading ? (
          <Spinner label="Data model laden..." />
        ) : (
          <>
            {po.error ? <Text className={styles.error} block>{po.error}</Text> : null}
            <SyncFilterBuilder filterCatalog={po.filterCatalog} syncFilter={po.syncFilter} onSyncNow={po.syncNow} />
            <DataPreviewTables
              previewTables={po.previewTables}
              columns={po.columns}
              relation={po.relation}
              togglingKey={po.togglingKey}
              onToggleVisibility={po.toggleVisibility}
              onToggleVisibleAtDelete={po.toggleVisibleAtDelete}
              onToggleWriteback={po.toggleWriteback}
              onSetColumnToggleState={po.setColumnToggleState}
              onDeleteColumn={po.deleteColumn}
            />
          </>
        )
      ) : (
        <ExcelLinkWizard />
      )}
    </div>
  );
}

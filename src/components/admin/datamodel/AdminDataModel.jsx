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
import DataModelDiagram from './DataModelDiagram';
import ExcelLinkWizard from './ExcelLinkWizard';
import { useDataModelAdmin } from '../../../hooks/useDataModelAdmin';

const useStyles = makeStyles({
  root: { width: '100%', maxWidth: 'none', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  intro: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1 },
});

/**
 * Admin tab "Data model": configureer kolommen en syncfilters per entiteit (PO, vendors, items),
 * plus een tab "Externe koppelingen" om een Excel als read-only verrijking te koppelen (#AB:162/#195).
 */
export default function AdminDataModel() {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState('purchase-orders');
  const purchaseOrders = useDataModelAdmin('purchase-orders');
  const vendors = useDataModelAdmin('vendors');
  const items = useDataModelAdmin('items');
  const modelByTab = {
    'purchase-orders': purchaseOrders,
    vendors,
    items,
  };
  const selectedModel = modelByTab[selectedTab];
  const isDataEntityTab = Boolean(selectedModel);

  return (
    <div className={styles.root}>
      <div>
        <Text size={600} weight="semibold" block>Data model</Text>
        <Text className={styles.intro} block>
          Configure columns and sync filters per D365 entity.
          Use "Externe koppelingen" to publish Excel lookups as read-only enrichment columns.
        </Text>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={(_, d) => setSelectedTab(d.value)}>
        <Tab value="purchase-orders">Inkooporders</Tab>
        <Tab value="vendors">Leveranciers</Tab>
        <Tab value="items">Artikelen</Tab>
        <Tab value="excel-links">Externe koppelingen</Tab>
      </TabList>

      {isDataEntityTab ? (
        selectedModel.loading ? (
          <Spinner label="Data model laden..." />
        ) : (
          <>
            {selectedModel.error ? <Text className={styles.error} block>{selectedModel.error}</Text> : null}
            <DataModelDiagram
              entities={selectedModel.entities}
              relation={selectedModel.relation}
              columns={selectedModel.columns}
              cache={selectedModel.cache}
              lookups={selectedModel.lookups}
            />
            <SyncFilterBuilder
              tableKey={selectedTab}
              filterCatalog={selectedModel.filterCatalog}
              syncFilter={selectedModel.syncFilter}
              onSyncNow={selectedModel.syncNow}
            />
            <DataPreviewTables
              tableKey={selectedTab}
              entities={selectedModel.entities}
              previewTables={selectedModel.previewTables}
              columns={selectedModel.columns}
              relation={selectedModel.relation}
              togglingKey={selectedModel.togglingKey}
              onToggleVisibility={selectedModel.toggleVisibility}
              onToggleVisibleAtDelete={selectedModel.toggleVisibleAtDelete}
              onToggleWriteback={selectedModel.toggleWriteback}
              onSetColumnToggleState={selectedModel.setColumnToggleState}
              onDeleteColumn={selectedModel.deleteColumn}
            />
          </>
        )
      ) : (
        <ExcelLinkWizard />
      )}
    </div>
  );
}

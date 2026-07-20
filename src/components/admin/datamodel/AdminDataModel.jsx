import React, { useState } from 'react';
import {
  MessageBar,
  MessageBarBody,
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
  info: { marginTop: '4px' },
});

/**
 * Admin tab "Data model": configureer kolommen en syncfilters per entiteit (PO, vendors, items),
 * plus een tab "External links" om een Excel als read-only verrijking te koppelen (#AB:162/#195).
 */
function formatDiscoveryMessage(discovery) {
  if (!discovery) return '';
  const headerAdded = Number(discovery.headerInserted) || 0;
  const lineAdded = Number(discovery.lineInserted) || 0;
  const totalAdded = headerAdded + lineAdded;
  if (!totalAdded) return '';
  const parts = [];
  if (headerAdded) parts.push(`${headerAdded} header`);
  if (lineAdded) parts.push(`${lineAdded} line`);
  return `Added ${parts.join(' and ')} column${totalAdded === 1 ? '' : 's'} from D365 (hidden by default). Turn on "Visible in table" to use them on the board.`;
}

export default function AdminDataModel() {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState('purchase-orders');
  const purchaseOrders = useDataModelAdmin('purchase-orders');
  const vendors = useDataModelAdmin('vendors');
  const items = useDataModelAdmin('items');
  const productReceiptLines = useDataModelAdmin('product-receipt-lines');
  const modelByTab = {
    'purchase-orders': purchaseOrders,
    vendors,
    items,
    'product-receipt-lines': productReceiptLines,
  };
  const selectedModel = modelByTab[selectedTab];
  const isDataEntityTab = Boolean(selectedModel);
  const discoveryMessage = formatDiscoveryMessage(selectedModel?.discovery);

  return (
    <div className={styles.root}>
      <div>
        <Text size={600} weight="semibold" block>Data model</Text>
        <Text className={styles.intro} block>
          Configure columns and sync filters per D365 entity.
          Use "External links" to publish Excel lookups as read-only enrichment columns.
        </Text>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={(_, d) => setSelectedTab(d.value)}>
        <Tab value="purchase-orders">Purchase orders</Tab>
        <Tab value="vendors">Vendors</Tab>
        <Tab value="items">Itemen</Tab>
        <Tab value="product-receipt-lines">Ontvangstregels</Tab>
        <Tab value="excel-links">External links</Tab>
      </TabList>

      {isDataEntityTab ? (
        selectedModel.loading ? (
          <Spinner label="Loading data model..." />
        ) : (
          <>
            {selectedModel.error ? <Text className={styles.error} block>{selectedModel.error}</Text> : null}
            {discoveryMessage ? (
              <MessageBar intent="info" className={styles.info}>
                <MessageBarBody>{discoveryMessage}</MessageBarBody>
              </MessageBar>
            ) : null}
            <SyncFilterBuilder
              tableKey={selectedTab}
              filterCatalog={selectedModel.filterCatalog}
              syncFilter={selectedModel.syncFilter}
              cache={selectedModel.cache}
              onSyncNow={selectedModel.syncNow}
              onReimportBaseline={selectedModel.reimportBaseline}
              baselineBusy={selectedModel.togglingKey === 'baseline-import'}
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
              onToggleRccpMeasure={selectedModel.toggleRccpMeasure}
              onSetColumnToggleState={selectedModel.setColumnToggleState}
              onDeleteColumn={selectedModel.deleteColumn}
              onDiscoverFields={selectedModel.discoverFields}
            />
          </>
        )
      ) : (
        <ExcelLinkWizard />
      )}
    </div>
  );
}

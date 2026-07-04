import React, { useEffect, useMemo, useState } from 'react';
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
import GenericEntityDataModel from './GenericEntityDataModel';
import { useDataModelAdmin } from '../../../hooks/useDataModelAdmin';
import { apiRequest } from '../../../utils/api';

const PO_TABLE_KEY = 'purchase-orders';

const useStyles = makeStyles({
  root: { width: '100%', maxWidth: 'none', display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  intro: { color: tokens.colorNeutralForeground3, fontSize: tokens.fontSizeBase200 },
  error: { color: tokens.colorPaletteRedForeground1 },
});

/**
 * Admin tab "Data model": entiteit-kiezer per tabel. Inkooporders draaien op de bestaande
 * po_*-laag (kolomzichtbaarheid + write-back); Leveranciers/Artikelen op de generieke tb_*-laag (#AB:161).
 */
export default function AdminDataModel() {
  const styles = useStyles();
  const po = useDataModelAdmin();

  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState('');
  const [selectedKey, setSelectedKey] = useState(PO_TABLE_KEY);

  useEffect(() => {
    let active = true;
    apiRequest('/data')
      .then((result) => { if (active) setOverview(result); })
      .catch((err) => {
        if (!active) return;
        setOverview({ tables: [], edges: [] });
        setOverviewError(err.message || 'Model-overzicht laden mislukt');
      });
    return () => { active = false; };
  }, []);

  // Tabs: altijd minstens Inkooporders; overige tabellen komen uit het model-overzicht.
  const tables = useMemo(() => {
    const fromApi = Array.isArray(overview?.tables) ? overview.tables : [];
    if (fromApi.some((t) => t.key === PO_TABLE_KEY)) return fromApi;
    return [{ key: PO_TABLE_KEY, label: 'Inkooporders', sourceEntity: '/data/PurchaseOrderHeadersV2', keyFields: [], hasDetail: true }, ...fromApi];
  }, [overview]);

  const poRelation = useMemo(() => (po.relation ? { onFields: po.relation.onFields } : null), [po.relation]);

  return (
    <div className={styles.root}>
      <div>
        <Text size={600} weight="semibold" block>Data model</Text>
        <Text className={styles.intro} block>
          Beheer per entiteit welke D365-velden zichtbaar zijn en zie voorbeeldwaarden uit de laatste sync.
          Inkooporders ondersteunen ook write-back; Leveranciers en Artikelen verrijken de inkooporders via
          lookups (leveranciersnaam op de kop, artikelnaam op de regel).
        </Text>
      </div>

      {overviewError ? <Text className={styles.error} block>{overviewError}</Text> : null}

      <TabList selectedValue={selectedKey} onTabSelect={(_, d) => setSelectedKey(d.value)}>
        {tables.map((t) => <Tab key={t.key} value={t.key}>{t.label}</Tab>)}
      </TabList>

      {selectedKey === PO_TABLE_KEY ? (
        po.loading ? (
          <Spinner label="Inkooporders laden..." />
        ) : (
          <>
            {po.error ? <Text className={styles.error} block>{po.error}</Text> : null}
            <SyncFilterBuilder filterCatalog={po.filterCatalog} syncFilter={po.syncFilter} onSyncNow={po.syncNow} />
            <DataPreviewTables
              previewTables={po.previewTables}
              columns={po.columns}
              relation={poRelation}
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
        <GenericEntityDataModel key={selectedKey} tableKey={selectedKey} />
      )}
    </div>
  );
}

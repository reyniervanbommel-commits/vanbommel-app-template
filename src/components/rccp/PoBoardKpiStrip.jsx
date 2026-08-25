import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import { subscribeRccpSettingsSaved } from '../../hooks/rccpSettingsSync';
import { clearPoBoardKpiCache, getPoBoardKpis } from '../../utils/poBoardKpiCache';
import { aggregatePoBoardKpisFromByOrder } from '../../utils/poBoardKpis';
import RccpKpiCards from './RccpKpiCards';

const useStyles = makeStyles({
  hint: { color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalS },
});

function PoBoardKpiStrip({ orders, selectedKey, onKpiFilter, refreshKey }) {
  const styles = useStyles();
  const [payload, setPayload] = useState(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [settingsTick, setSettingsTick] = useState(0);

  useEffect(() => subscribeRccpSettingsSaved(() => {
    clearPoBoardKpiCache();
    setSettingsTick((tick) => tick + 1);
  }), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getPoBoardKpis(refreshKey)
      .then((data) => {
        if (!active) return;
        setPayload(data || { sku: [], orders: {} });
        setConfigured(data?.configured !== false);
      })
      .catch(() => {
        if (!active) return;
        setPayload({ sku: [], orders: {} });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refreshKey, settingsTick]);

  const visibleOrderNumbers = useMemo(
    () => (orders || []).map((order) => order?.orderNumber).filter(Boolean),
    [orders],
  );

  const { kpis, matchByKey } = useMemo(
    () => aggregatePoBoardKpisFromByOrder(payload, visibleOrderNumbers),
    [payload, visibleOrderNumbers],
  );

  const handleSelect = useCallback((key) => {
    onKpiFilter?.(key, matchByKey[key] || new Set());
  }, [matchByKey, onKpiFilter]);

  useEffect(() => {
    if (!selectedKey) return;
    onKpiFilter?.(selectedKey, matchByKey[selectedKey] || new Set(), { toggle: false });
  }, [matchByKey, onKpiFilter, selectedKey]);

  if (loading) return <Spinner size="tiny" label="Loading KPIs…" />;
  if (!configured) {
    return <Text className={styles.hint}>KPI columns are not configured yet.</Text>;
  }

  return (
    <>
      <Text className={styles.hint}>
        Values come from the purchase orders currently in the table. Click a tile to filter.
      </Text>
      <RccpKpiCards kpis={kpis} selectedKey={selectedKey} onSelect={handleSelect} />
    </>
  );
}

export default memo(PoBoardKpiStrip);

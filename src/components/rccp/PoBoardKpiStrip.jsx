import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';
import { apiRequest } from '../../utils/api';
import { getCachedRccpConfig, publishRccpSettingsSync, subscribeRccpSettingsSync } from '../../hooks/rccpSettingsSync';
import { buildPoBoardKpis } from '../../utils/poBoardKpis';
import RccpKpiCards from './RccpKpiCards';

const useStyles = makeStyles({
  hint: { color: tokens.colorNeutralForeground3, marginBottom: tokens.spacingVerticalS },
});

function PoBoardKpiStrip({ orders, selectedKey, onKpiFilter }) {
  const styles = useStyles();
  const [config, setConfig] = useState(() => getCachedRccpConfig());
  const [loading, setLoading] = useState(!getCachedRccpConfig());

  useEffect(() => subscribeRccpSettingsSync((next) => setConfig(next)), []);

  useEffect(() => {
    if (config) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    apiRequest('/rccp/settings')
      .then((data) => {
        if (!active || !data?.config) return;
        publishRccpSettingsSync(data.config);
        setConfig(data.config);
      })
      .catch(() => { /* strip blijft leeg; tabel werkt gewoon */ })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [config]);

  const { kpis, matchByKey } = useMemo(
    () => buildPoBoardKpis(orders, config, { now: new Date() }),
    [orders, config],
  );

  const handleSelect = useCallback((key) => {
    onKpiFilter?.(key, matchByKey[key] || new Set());
  }, [matchByKey, onKpiFilter]);

  useEffect(() => {
    if (!selectedKey) return;
    onKpiFilter?.(selectedKey, matchByKey[selectedKey] || new Set(), { toggle: false });
  }, [matchByKey, onKpiFilter, selectedKey]);

  if (loading) return <Spinner size="tiny" label="Loading KPIs…" />;
  if (!config) {
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

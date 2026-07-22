import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, Field, Input, Spinner, Tab, TabList, Text, makeStyles, tokens, shorthands,
} from '@fluentui/react-components';
import { ArrowClockwise24Regular, Settings24Regular } from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { useRccpPage } from '../../hooks/useRccpPage';
import RccpKpiCards from './RccpKpiCards';
import RccpChartMatrixPanel from './RccpChartMatrixPanel';
import RccpMissingDateCard from './RccpMissingDateCard';
import RccpDiagnosticsCard from './RccpDiagnosticsCard';
import RccpDrillDownPanel from './RccpDrillDownPanel';
import RccpSettingsFlyout from './RccpSettingsFlyout';
import RccpVendorFilter from './RccpVendorFilter';
import RccpCapacityPlanningTab from './RccpCapacityPlanningTab';
import { useRccpVendorOptions } from '../../hooks/useRccpVendorOptions';
import { resolveDefaultRccpVendor } from './resolveRccpVendorFilter';
import { readPoFilterByColumnForRccp } from '../../utils/poVendorFilterHandoff';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalXL) },
  toolbar: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', ...shorthands.gap(tokens.spacingHorizontalM) },
  yearInput: { width: '104px' },
  weekInput: { width: '84px' },
  error: { color: tokens.colorPaletteRedForeground1 },
});

export default function RccpPageContent() {
  const styles = useStyles();
  const { user } = useAuth();
  const isAdmin = user?.role === ROLES.ADMIN;
  const isSupplier = user?.role === ROLES.SUPPLIER;
  // null = nog geen vendor gekozen (voorkomt dat de dashboard-analyse voor ALLE vendors laadt, wat traag is)
  const [vendorAccount, setVendorAccount] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const {
    vendors, vendorNames, loading: vendorsLoading, error: vendorsError,
  } = useRccpVendorOptions();

  // Selecteer standaard de vendor waarop de PO-pagina net gefilterd was (nr of naam); anders
  // de eerste vendor uit de lijst — in plaats van altijd "alle vendors" te laden (traag).
  useEffect(() => {
    if (isSupplier || vendorsLoading || vendorAccount !== null) return;
    const filterByColumn = readPoFilterByColumnForRccp();
    setVendorAccount(resolveDefaultRccpVendor({ vendors, vendorNames, filterByColumn }));
  }, [isSupplier, vendorsLoading, vendors, vendorNames, vendorAccount]);

  const vendorReady = isSupplier || vendorAccount !== null;
  const {
    window, setWindow, analysis, loading, error, readOnly,
    measureRows, periods, cellMap, reload,
  } = useRccpPage({
    vendorAccount: isSupplier ? undefined : (vendorAccount || undefined),
    enabled: vendorReady,
  });

  const [drillCell, setDrillCell] = useState(null);
  const capacityReloadRef = useRef(null);

  const handleWindowChange = useCallback((field, value) => {
    setWindow((prev) => ({ ...prev, [field]: Number(value) }));
  }, [setWindow]);

  const handleCellClick = useCallback((cell) => {
    if (cell) setDrillCell(cell);
  }, []);

  const handleCloseDrill = useCallback(() => setDrillCell(null), []);

  const handleOpenSettings = useCallback(() => setSettingsOpen(true), []);
  const handleCloseSettings = useCallback(() => setSettingsOpen(false), []);
  const handleSettingsSaved = useCallback(() => reload(), [reload]);
  const handleCapacityChanged = useCallback(() => reload(), [reload]);
  const handleImportCompleted = useCallback(() => {
    setActiveTab('capacity-planning');
    reload();
  }, [reload]);

  const handleTabSelect = useCallback((_, data) => {
    setActiveTab(data.value);
  }, []);

  const handleRefresh = useCallback(() => {
    if (activeTab === 'capacity-planning') {
      capacityReloadRef.current?.();
      return;
    }
    reload();
  }, [activeTab, reload]);

  const handleRegisterCapacityReload = useCallback((fn) => {
    capacityReloadRef.current = fn;
  }, []);

  return (
    <div className={styles.root}>
      <Text size={700} weight="semibold">Rough Cut Capacity Planning</Text>

      <TabList selectedValue={activeTab} onTabSelect={handleTabSelect}>
        <Tab value="dashboard">Dashboard</Tab>
        <Tab value="capacity-planning">Capacity planning</Tab>
      </TabList>

      <div className={styles.toolbar}>
        {!isSupplier && (
          <RccpVendorFilter
            value={vendorAccount || ''}
            onChange={setVendorAccount}
            vendors={vendors}
            vendorNames={vendorNames}
            loading={vendorsLoading}
            error={vendorsError}
          />
        )}
        {activeTab === 'dashboard' && (
          <>
            <Field label="From year">
              <Input className={styles.yearInput} type="number" value={String(window.fromYear)} onChange={(e) => handleWindowChange('fromYear', e.target.value)} />
            </Field>
            <Field label="From week">
              <Input className={styles.weekInput} type="number" min={1} max={53} value={String(window.fromWeek)} onChange={(e) => handleWindowChange('fromWeek', e.target.value)} />
            </Field>
            <Field label="To year">
              <Input className={styles.yearInput} type="number" value={String(window.toYear)} onChange={(e) => handleWindowChange('toYear', e.target.value)} />
            </Field>
            <Field label="To week">
              <Input className={styles.weekInput} type="number" min={1} max={53} value={String(window.toWeek)} onChange={(e) => handleWindowChange('toWeek', e.target.value)} />
            </Field>
          </>
        )}
        <Button icon={<ArrowClockwise24Regular />} onClick={handleRefresh}>Refresh</Button>
        {isAdmin && (
          <Button icon={<Settings24Regular />} onClick={handleOpenSettings}>Settings</Button>
        )}
      </div>

      {activeTab === 'dashboard' && (
        <>
          {loading && <Spinner label="Loading RCCP dashboard..." />}
          {error && <Text className={styles.error}>{error}</Text>}

          {!loading && !error && analysis && (
            <>
              <RccpKpiCards kpis={analysis.kpis} />
              <RccpChartMatrixPanel
                chart={analysis.chart}
                measureRows={measureRows}
                periods={periods}
                cellMap={cellMap}
                chartWeekRanges={analysis.config?.chartWeekRanges}
                onCellClick={handleCellClick}
                interactive
              />
              {(analysis.kpis?.totalConfirmed === 0) && (
                <RccpDiagnosticsCard
                  diagnostics={analysis.diagnostics}
                  config={analysis.config}
                  window={analysis.window}
                />
              )}
              <RccpMissingDateCard items={analysis.missingDates} />
            </>
          )}
        </>
      )}

      {activeTab === 'capacity-planning' && (
        <RccpCapacityPlanningTab
          vendorAccount={isSupplier ? undefined : (vendorAccount || undefined)}
          enabled={activeTab === 'capacity-planning' && vendorReady}
          isAdmin={isAdmin}
          onImported={handleImportCompleted}
          onChanged={handleCapacityChanged}
          onRegisterReload={handleRegisterCapacityReload}
        />
      )}

      <RccpDrillDownPanel
        open={Boolean(drillCell)}
        cell={drillCell}
        window={window}
        onClose={handleCloseDrill}
      />

      {isAdmin && (
        <RccpSettingsFlyout
          open={settingsOpen}
          onClose={handleCloseSettings}
          onSaved={handleSettingsSaved}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}

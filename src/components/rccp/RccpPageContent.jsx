import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, Field, Input, Spinner, Tab, TabList, Text, makeStyles, tokens, shorthands,
} from '@fluentui/react-components';
import { ArrowClockwise24Regular, Settings24Regular } from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { useRccpPage } from '../../hooks/useRccpPage';
import { useRccpDeliveryPlan } from '../../hooks/useRccpDeliveryPlan';
import { useRccpVendorPrefetch } from '../../hooks/useRccpVendorPrefetch';
import { RccpDeliveryPlanTab } from './delivery-plan';
import RccpKpiCards from './RccpKpiCards';
import RccpChartMatrixPanel from './RccpChartMatrixPanel';
import RccpMissingDateCard from './RccpMissingDateCard';
import RccpDiagnosticsCard from './RccpDiagnosticsCard';
import RccpDrillDownPanel from './RccpDrillDownPanel';
import RccpSettingsFlyout from './RccpSettingsFlyout';
import RccpVendorFilter from './RccpVendorFilter';
import RccpCapacityPlanningTab from './RccpCapacityPlanningTab';
import { useRccpVendorOptions } from '../../hooks/useRccpVendorOptions';
import { resolveDefaultRccpVendor, resolveRccpVendorFromFilter } from './resolveRccpVendorFilter';
import { readPoFilterByColumnForRccp } from '../../utils/poVendorFilterHandoff';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalXL) },
  toolbar: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', ...shorthands.gap(tokens.spacingHorizontalM) },
  yearInput: { width: '104px' },
  weekInput: { width: '84px' },
  error: { color: tokens.colorPaletteRedForeground1 },
  hint: { color: tokens.colorNeutralForeground3 },
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

  // Was er bij het openen van de pagina al een vendor-filter (nr of naam) actief op de
  // PO-tabelpagina? Bepaal dit één keer bij mount (los van of de vendorlijst al geladen is) —
  // zo weten we meteen of het zoekveld autofocus moet krijgen (geen PO-filter → gebruiker gaat
  // zelf zoeken) of niet (PO-filter aanwezig → vendor wordt automatisch voor-ingevuld).
  const [hadPoFilterHandoff] = useState(() => (
    Boolean(resolveRccpVendorFromFilter(readPoFilterByColumnForRccp()))
  ));

  // hasVendor bepaalt of er daadwerkelijk data geladen wordt (en dus of chart/matrix/capacity
  // planning vullen) — pas waar wanneer er echt een vendor gekozen is, niet zodra het
  // resolve-effect hieronder eenmalig is afgerond (dat kan ook naar '' resolven).
  const hasVendor = isSupplier || Boolean(vendorAccount);
  const {
    window, setWindow, windowLoaded, lastVendor, setLastVendor,
    analysis, loading, error, readOnly,
    measureRows, periods, cellMap, reload,
  } = useRccpPage({
    vendorAccount: isSupplier ? undefined : (vendorAccount || undefined),
    enabled: hasVendor && activeTab === 'dashboard',
  });
  const deliveryPlan = useRccpDeliveryPlan({
    vendorAccount: isSupplier ? undefined : (vendorAccount || undefined),
    window,
    windowLoaded,
    enabled: hasVendor && activeTab === 'delivery-plan',
  });
  const reloadDeliveryPlan = deliveryPlan.reload;

  // Neem de vendor over waarop de PO-pagina net gefilterd was (nr of naam); is er geen
  // PO-filter, laat de vendor dan leeg (in plaats van automatisch de eerste vendor te laden,
  // wat traag is) — de gebruiker zoekt dan zelf een vendor op via het zoekveld. Dit effect staat
  // bewust ná useRccpPage: het leunt op windowLoaded/lastVendor uit die hook (TDZ voorkomen).
  useEffect(() => {
    if (isSupplier || vendorAccount !== null) return;
    const filterByColumn = readPoFilterByColumnForRccp();
    const fromFilter = resolveDefaultRccpVendor({ vendors, vendorNames, filterByColumn });
    if (fromFilter) { setVendorAccount(fromFilter); return; }
    // PO-filter op naam kan pas matchen als de vendorlijst er is; account-nummer/lastVendor
    // hoeven daar niet op te wachten — anders blijft de dashboard leeg tot de trage
    // /rccp/vendors-snapshot klaar is.
    const filterCandidate = resolveRccpVendorFromFilter(filterByColumn);
    if (filterCandidate && vendorsLoading) return;
    if (!windowLoaded) return;
    if (lastVendor) { setVendorAccount(lastVendor); return; }
    if (vendorsLoading) return;
    setVendorAccount('');
  }, [isSupplier, vendorsLoading, vendors, vendorNames, vendorAccount, windowLoaded, lastVendor]);

  // Onthoud de gekozen vendor als voorkeur (samen met de week in board-settings/rccp), zodat de
  // pagina bij terugkeer exact dezelfde vendor-week-combinatie toont. Lege selectie wist de
  // voorkeur niet (dan blijft de laatste bewaard).
  const handleVendorChange = useCallback((account) => {
    setVendorAccount(account);
    if (account) setLastVendor(account);
  }, [setLastVendor]);

  // Terwijl de gebruiker een vendor zoekt (hover/keyboard-highlight in de dropdown, of een
  // exacte match tijdens het typen), laad de analyse voor die vendor alvast op de achtergrond —
  // zodra hij/zij die vendor echt selecteert, komt de data al (grotendeels) uit cache.
  const handleHighlightVendor = useRccpVendorPrefetch(window);

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
    if (activeTab === 'delivery-plan') {
      reloadDeliveryPlan();
      return;
    }
    reload();
  }, [activeTab, reloadDeliveryPlan, reload]);

  const handleRegisterCapacityReload = useCallback((fn) => {
    capacityReloadRef.current = fn;
  }, []);

  return (
    <div className={styles.root}>
      <Text size={700} weight="semibold">Rough Cut Capacity Planning</Text>

      <TabList selectedValue={activeTab} onTabSelect={handleTabSelect}>
        <Tab value="dashboard">Dashboard</Tab>
        <Tab value="delivery-plan">Delivery plan</Tab>
        <Tab value="capacity-planning">Capacity planning</Tab>
      </TabList>

      <div className={styles.toolbar}>
        {!isSupplier && (
          <RccpVendorFilter
            value={vendorAccount || ''}
            onChange={handleVendorChange}
            vendors={vendors}
            vendorNames={vendorNames}
            loading={vendorsLoading}
            error={vendorsError}
            autoFocus={!hadPoFilterHandoff}
            onHighlightVendor={handleHighlightVendor}
          />
        )}
        {(activeTab === 'dashboard' || activeTab === 'delivery-plan') && (
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

      {!hasVendor && (
        <Text className={styles.hint}>
          Search for a vendor above to load the dashboard, delivery plan and capacity planning data.
        </Text>
      )}

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

      {activeTab === 'delivery-plan' && (
        <RccpDeliveryPlanTab
          hasVendor={hasVendor}
          data={deliveryPlan.data}
          loading={deliveryPlan.loading}
          error={deliveryPlan.error}
        />
      )}

      {activeTab === 'capacity-planning' && (
        <RccpCapacityPlanningTab
          vendorAccount={isSupplier ? undefined : (vendorAccount || undefined)}
          enabled={activeTab === 'capacity-planning' && hasVendor}
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
          readOnly={readOnly}
        />
      )}
    </div>
  );
}

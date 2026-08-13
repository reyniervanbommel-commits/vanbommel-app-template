import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle,
  makeStyles, MessageBar, MessageBarActions, MessageBarBody, shorthands, Spinner, tokens,
} from '@fluentui/react-components';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { useAppToast } from '../../hooks/useAppToast';
import BiToolbar from './BiToolbar';
import BiDashboardGrid from './BiDashboardGrid';
import ChartBuilderPanel from './ChartBuilderPanel';
import ChartBuilderFlyout from './ChartBuilderFlyout';
import { useBiMeta } from './hooks/useBiMeta';
import { useBiCharts } from './hooks/useBiCharts';
import { useChartData } from './hooks/useChartData';
import { useStarterCharts } from './hooks/useStarterCharts';
import { useBiVendorFilter } from './hooks/useBiVendorFilter';
import { useBiDateFilter } from './hooks/useBiDateFilter';
import { BOARD_KEY } from './biConstants';
import { usePageActive } from '../../hooks/usePageActive';

const useStyles = makeStyles({
  pageLayout: {
    display: 'flex',
    alignItems: 'stretch',
    ...shorthands.gap(tokens.spacingHorizontalL),
    minHeight: 'calc(100vh - 120px)',
  },
  dashboardArea: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  loading: { display: 'flex', justifyContent: 'center', ...shorthands.padding('48px') },
  message: { marginBottom: tokens.spacingVerticalM },
});

export default function BiPage() {
  const styles = useStyles();
  const { user } = useAuth();
  // Suppliers zien BI read-only en uitsluitend hun eigen data (server-side gescoped in /api/bi).
  const isSupplier = user?.role === ROLES.SUPPLIER;
  const { notifyError, notifySuccess } = useAppToast();
  const meta = useBiMeta(BOARD_KEY);
  const { charts, loading: chartsLoading, error, reload, createChart, updateChart, deleteChart } = useBiCharts();
  const seedStarters = useStarterCharts({ columns: meta.columns, createChart });
  const vendorFilter = useBiVendorFilter();
  const dateFilter = useBiDateFilter();

  const [builderMode, setBuilderMode] = useState(null);
  const [draftPayload, setDraftPayload] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [flyoutChrome, setFlyoutChrome] = useState({ actions: null, nameField: null });

  const selectedChartId = useMemo(() => {
    if (!builderMode || builderMode === 'new') return 'draft';
    return builderMode.id;
  }, [builderMode]);

  const displayCharts = useMemo(() => {
    if (!builderMode || !draftPayload) return charts;
    if (builderMode === 'new') {
      return [{
        id: 'draft',
        userId: user?.id,
        name: draftPayload.name || 'New chart',
        visibility: draftPayload.visibility,
        config: draftPayload.config,
      }, ...charts];
    }
    return charts.map((chart) => (
      chart.id === builderMode.id
        ? { ...chart, name: draftPayload.name, visibility: draftPayload.visibility, config: draftPayload.config }
        : chart
    ));
  }, [charts, builderMode, draftPayload, user?.id]);

  const chartsForFetch = useMemo(() => {
    if (!builderMode || !draftPayload) return charts;
    if (builderMode === 'new') {
      return [{
        id: 'draft',
        userId: user?.id,
        config: draftPayload.config,
      }, ...charts];
    }
    return charts.map((chart) => (
      chart.id === builderMode.id
        ? { ...chart, config: draftPayload.config }
        : chart
    ));
  }, [charts, builderMode, draftPayload, user?.id]);

  // Keep-alive: useChartData doet de lichte /bi/revision-check normaal alleen bij mount. Omdat de
  // BI-pagina gemount blijft (keep-alive), bumpen we bij elke terugkeer een nonce zodat die check
  // opnieuw draait; alleen bij een gewijzigde revisie herladen de charts, anders instant uit cache.
  const pageActive = usePageActive();
  const [revisionNonce, setRevisionNonce] = useState(0);
  const prevActiveRef = useRef(pageActive);
  useEffect(() => {
    const prev = prevActiveRef.current;
    prevActiveRef.current = pageActive;
    if (prev === false && pageActive === true) setRevisionNonce((n) => n + 1);
  }, [pageActive]);

  // Debounce alleen tijdens live-bewerken in de builder: elke wijziging aan de draft-config geeft
  // meteen een nieuwe fetch-key, en zonder debounce vuurt dat per toetsaanslag/dropdown-wijziging
  // een POST /bi/aggregate. Buiten de builder (normale dashboard-loads, vendor-/datumfilter) blijft
  // het instant.
  const { resultsById, loadingById } = useChartData({
    charts: chartsForFetch,
    // Suppliers sturen geen eigen vendor-filter mee; de backend forceert hun leveranciersaccount.
    externalFilterByColumn: isSupplier ? undefined : vendorFilter.externalFilterByColumn,
    columns: meta.columns,
    dateRange: dateFilter.dateRange,
    checkRevision: true,
    revisionNonce,
    debounceMs: builderMode ? 300 : 0,
  });

  const handleNew = useCallback(() => {
    setDraftPayload(null);
    setBuilderMode('new');
  }, []);
  const handleEdit = useCallback((chart) => {
    if (String(chart.id) === 'draft') return;
    setDraftPayload(null);
    setBuilderMode(chart);
  }, []);
  const handleCancel = useCallback(() => {
    setBuilderMode(null);
    setDraftPayload(null);
  }, []);
  const handleDraftChange = useCallback((payload) => setDraftPayload(payload), []);

  const handleSave = useCallback(async (payload) => {
    setBusy(true);
    try {
      if (builderMode && builderMode !== 'new') {
        await updateChart(builderMode.id, payload);
        notifySuccess('Chart updated');
      } else {
        await createChart({ ...payload, boardKey: BOARD_KEY });
        notifySuccess('Chart created');
      }
      setBuilderMode(null);
      setDraftPayload(null);
    } catch (err) {
      notifyError(err.message || 'Failed to save chart');
    } finally {
      setBusy(false);
    }
  }, [builderMode, updateChart, createChart, notifySuccess, notifyError]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    try {
      await deleteChart(pendingDelete.id);
      notifySuccess('Chart deleted');
      if (builderMode && builderMode !== 'new' && builderMode.id === pendingDelete.id) {
        setBuilderMode(null);
        setDraftPayload(null);
      }
    } catch (err) {
      notifyError(err.message || 'Failed to delete chart');
    } finally {
      setPendingDelete(null);
    }
  }, [pendingDelete, deleteChart, notifySuccess, notifyError, builderMode]);

  const handleSeed = useCallback(async () => {
    setSeeding(true);
    try {
      const count = await seedStarters();
      notifySuccess(`Added ${count} starter charts`);
    } catch (err) {
      notifyError(err.message || 'Failed to add starter charts');
    } finally {
      setSeeding(false);
    }
  }, [seedStarters, notifySuccess, notifyError]);

  useEffect(() => {
    if (!builderMode) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [builderMode, handleCancel]);

  if (meta.loading || chartsLoading) {
    return <div className={styles.loading}><Spinner label="Loading BI…" /></div>;
  }

  const flyoutTitle = builderMode === 'new' ? 'New chart' : 'Edit chart';

  return (
    <div className={styles.pageLayout}>
      <div className={styles.dashboardArea}>
        <BiToolbar
          onNewChart={handleNew}
          onRefresh={reload}
          vendorFilter={vendorFilter}
          dateFilter={dateFilter}
          canManage={!isSupplier}
        />

        {error ? (
          <MessageBar intent="error" className={styles.message}>
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        ) : null}

        {!isSupplier && !charts.length && !builderMode ? (
          <MessageBar intent="info" className={styles.message}>
            <MessageBarBody>Start with a set of ready-made example charts.</MessageBarBody>
            <MessageBarActions>
              <Button size="small" appearance="primary" onClick={handleSeed} disabled={seeding}>
                {seeding ? 'Adding…' : 'Add starter charts'}
              </Button>
            </MessageBarActions>
          </MessageBar>
        ) : null}

        <BiDashboardGrid
          charts={displayCharts}
          resultsById={resultsById}
          loadingById={loadingById}
          currentUserId={user?.id}
          columns={meta.columns}
          selectedChartId={builderMode ? selectedChartId : null}
          onEdit={handleEdit}
          onDelete={setPendingDelete}
        />
      </div>

      {builderMode ? (
        <ChartBuilderFlyout
          title={flyoutTitle}
          onClose={handleCancel}
          actions={flyoutChrome.actions}
          nameField={flyoutChrome.nameField}
        >
          <ChartBuilderPanel
            key={builderMode === 'new' ? 'new' : builderMode.id}
            columns={meta.columns}
            chart={builderMode === 'new' ? null : builderMode}
            onSave={handleSave}
            onCancel={handleCancel}
            onDraftChange={handleDraftChange}
            onFlyoutChromeChange={setFlyoutChrome}
            busy={busy}
            variant="flyout"
          />
        </ChartBuilderFlyout>
      ) : null}

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(_, data) => { if (!data.open) setPendingDelete(null); }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delete chart</DialogTitle>
            <DialogContent>Are you sure you want to delete “{pendingDelete?.name}”? This cannot be undone.</DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setPendingDelete(null)}>Cancel</Button>
              <Button appearance="primary" onClick={confirmDelete}>Delete</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}

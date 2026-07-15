import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle,
  makeStyles, MessageBar, MessageBarBody, shorthands, Spinner,
} from '@fluentui/react-components';
import { useAuth } from '../../context/AuthContext';
import { useAppToast } from '../../hooks/useAppToast';
import BiToolbar from './BiToolbar';
import BiDashboardGrid from './BiDashboardGrid';
import ChartBuilderPanel from './ChartBuilderPanel';
import ChartBuilderFlyout from './ChartBuilderFlyout';
import { useBiMeta } from './hooks/useBiMeta';
import { useBiCharts } from './hooks/useBiCharts';
import { useChartData } from './hooks/useChartData';
import { useStarterCharts } from './hooks/useStarterCharts';
import { BOARD_KEY, createEmptyChartConfig } from './biConstants';

const useStyles = makeStyles({
  pageLayout: {
    display: 'flex',
    alignItems: 'flex-start',
    ...shorthands.gap('16px'),
    minHeight: 0,
  },
  dashboardArea: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  loading: { display: 'flex', justifyContent: 'center', ...shorthands.padding('48px') },
  message: { marginBottom: '12px' },
});

export default function BiPage() {
  const styles = useStyles();
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useAppToast();
  const meta = useBiMeta(BOARD_KEY);
  const { charts, loading: chartsLoading, error, reload, createChart, updateChart, deleteChart } = useBiCharts();
  const seedStarters = useStarterCharts({ columns: meta.columns, createChart });

  const [builderMode, setBuilderMode] = useState(null);
  const [draftPayload, setDraftPayload] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [seeding, setSeeding] = useState(false);

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

  const savedChartsForFetch = useMemo(() => {
    if (!builderMode) return charts;
    if (builderMode === 'new') return charts;
    return charts.filter((chart) => chart.id !== builderMode.id);
  }, [charts, builderMode]);

  const activeChartForFetch = useMemo(() => {
    if (!builderMode) return null;
    if (draftPayload) {
      if (builderMode === 'new') {
        return {
          id: 'draft',
          userId: user?.id,
          name: draftPayload.name,
          visibility: draftPayload.visibility,
          config: draftPayload.config,
        };
      }
      return {
        ...builderMode,
        name: draftPayload.name,
        visibility: draftPayload.visibility,
        config: draftPayload.config,
      };
    }
    if (builderMode !== 'new') return builderMode;
    return {
      id: 'draft',
      userId: user?.id,
      name: 'New chart',
      visibility: 'private',
      config: createEmptyChartConfig(),
    };
  }, [builderMode, draftPayload, user?.id]);

  const { resultsById: savedResults, loadingById: savedLoading } = useChartData({
    charts: builderMode ? savedChartsForFetch : charts,
  });
  const { resultsById: activeResults, loadingById: activeLoading } = useChartData({
    charts: activeChartForFetch ? [activeChartForFetch] : [],
  });

  const resultsById = useMemo(() => {
    if (!builderMode) return savedResults;
    return { ...savedResults, ...activeResults };
  }, [builderMode, savedResults, activeResults]);

  const loadingById = useMemo(() => {
    if (!builderMode) return savedLoading;
    return { ...savedLoading, ...activeLoading };
  }, [builderMode, savedLoading, activeLoading]);

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
        <BiToolbar chartCount={charts.length} onNewChart={handleNew} onRefresh={reload} />

        {error ? (
          <MessageBar intent="error" className={styles.message}>
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        ) : null}

        {!charts.length && !builderMode ? (
          <MessageBar intent="info" className={styles.message}>
            <MessageBarBody>Start with a set of ready-made example charts.</MessageBarBody>
            <Button size="small" appearance="primary" onClick={handleSeed} disabled={seeding}>
              {seeding ? 'Adding…' : 'Add starter charts'}
            </Button>
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
        <ChartBuilderFlyout title={flyoutTitle} onClose={handleCancel}>
          <ChartBuilderPanel
            key={builderMode === 'new' ? 'new' : builderMode.id}
            columns={meta.columns}
            chart={builderMode === 'new' ? null : builderMode}
            onSave={handleSave}
            onCancel={handleCancel}
            onDraftChange={handleDraftChange}
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

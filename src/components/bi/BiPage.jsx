import React, { useCallback, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle,
  makeStyles, MessageBar, MessageBarBody, shorthands, Spinner,
} from '@fluentui/react-components';
import { useAuth } from '../../context/AuthContext';
import { useAppToast } from '../../hooks/useAppToast';
import BiToolbar from './BiToolbar';
import BiDashboardGrid from './BiDashboardGrid';
import ChartBuilderPanel from './ChartBuilderPanel';
import { useBiMeta } from './hooks/useBiMeta';
import { useBiCharts } from './hooks/useBiCharts';
import { useChartData } from './hooks/useChartData';
import { useStarterCharts } from './hooks/useStarterCharts';
import { BOARD_KEY } from './biConstants';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', minHeight: 0 },
  loading: { display: 'flex', justifyContent: 'center', ...shorthands.padding('48px') },
  message: { marginBottom: '12px' },
});

export default function BiPage() {
  const styles = useStyles();
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useAppToast();
  const meta = useBiMeta(BOARD_KEY);
  const { charts, loading: chartsLoading, error, reload, createChart, updateChart, deleteChart } = useBiCharts();
  const { resultsById, loading: dataLoading } = useChartData({ charts });
  const seedStarters = useStarterCharts({ columns: meta.columns, createChart });

  const [builderMode, setBuilderMode] = useState(null); // null | 'new' | chart
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const handleNew = useCallback(() => setBuilderMode('new'), []);
  const handleEdit = useCallback((chart) => setBuilderMode(chart), []);
  const handleCancel = useCallback(() => setBuilderMode(null), []);

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
    } catch (err) {
      notifyError(err.message || 'Failed to delete chart');
    } finally {
      setPendingDelete(null);
    }
  }, [pendingDelete, deleteChart, notifySuccess, notifyError]);

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

  if (meta.loading || chartsLoading) {
    return <div className={styles.loading}><Spinner label="Loading BI…" /></div>;
  }

  return (
    <div className={styles.root}>
      <BiToolbar chartCount={charts.length} onNewChart={handleNew} onRefresh={reload} />

      {error ? (
        <MessageBar intent="error" className={styles.message}>
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}

      {builderMode ? (
        <ChartBuilderPanel
          key={builderMode === 'new' ? 'new' : builderMode.id}
          columns={meta.columns}
          chart={builderMode === 'new' ? null : builderMode}
          onSave={handleSave}
          onCancel={handleCancel}
          busy={busy}
        />
      ) : (
        <>
          {!charts.length ? (
            <MessageBar intent="info" className={styles.message}>
              <MessageBarBody>Start with a set of ready-made example charts.</MessageBarBody>
              <Button size="small" appearance="primary" onClick={handleSeed} disabled={seeding}>
                {seeding ? 'Adding…' : 'Add starter charts'}
              </Button>
            </MessageBar>
          ) : null}
          <BiDashboardGrid
            charts={charts}
            resultsById={resultsById}
            loading={dataLoading}
            currentUserId={user?.id}
            columns={meta.columns}
            onEdit={handleEdit}
            onDelete={setPendingDelete}
          />
        </>
      )}

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

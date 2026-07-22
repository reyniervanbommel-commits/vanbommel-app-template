import React, { useCallback, useEffect, useState } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { TopSpeedRegular, Dismiss24Regular } from '@fluentui/react-icons';
import { getApiTimings, subscribePerf, getNavigationTiming, getResourceTransferKB } from '../../utils/perf';
import { loadPerfBaseline, buildBaselineCompareRows } from '../../utils/perfBaseline';

// Dev/preview-only performance-HUD: laadtijd (Navigation Timing), backend-sync-KPI's
// (Fase D metrics via /refresh/progress) en de duur van recente API-calls. Off-by-default;
// klik de badge om te openen. Zie ook de Server-Timing-header in DevTools → Network → Timing.

const useStyles = makeStyles({
  badge: {
    position: 'fixed',
    left: '16px',
    bottom: '16px',
    zIndex: 9998,
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('6px'),
    ...shorthands.padding('5px', '10px'),
    ...shorthands.borderRadius('20px'),
    ...shorthands.border('1px', 'solid', tokens.colorBrandStroke1),
    backgroundColor: tokens.colorNeutralBackground3,
    cursor: 'pointer',
    userSelect: 'none',
  },
  badgeText: { fontSize: '11px', fontWeight: 700, color: tokens.colorBrandForeground1 },
  panel: {
    position: 'fixed',
    left: '16px',
    bottom: '52px',
    width: '320px',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9999,
    ...shorthands.padding('12px'),
    ...shorthands.borderRadius('10px'),
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow16,
    fontSize: '11px',
    color: tokens.colorNeutralForeground1,
  },
  panelScroll: {
    flexGrow: 1,
    minHeight: 0,
    overflowY: 'scroll',
    overflowX: 'hidden',
    paddingRight: '4px',
    scrollbarWidth: 'thin',
    scrollbarColor: `${tokens.colorNeutralStroke1} transparent`,
    '::-webkit-scrollbar': { width: '8px' },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: tokens.colorNeutralStroke1,
      ...shorthands.borderRadius('4px'),
    },
    '::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  title: { fontSize: '12px', fontWeight: 700 },
  close: { cursor: 'pointer', color: tokens.colorNeutralForeground3 },
  section: { marginBottom: '10px' },
  sectionTitle: {
    fontSize: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: tokens.colorNeutralForeground3,
    marginBottom: '4px',
  },
  row: { display: 'flex', justifyContent: 'space-between', ...shorthands.gap('8px'), lineHeight: '1.6' },
  mono: { fontFamily: 'ui-monospace, Consolas, monospace' },
  path: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 },
  empty: { color: tokens.colorNeutralForeground3, fontStyle: 'italic' },
});

function durColor(ms) {
  if (ms == null) return tokens.colorNeutralForeground3;
  if (ms < 300) return tokens.colorPaletteGreenForeground1;
  if (ms < 1000) return tokens.colorPaletteYellowForeground1;
  return tokens.colorPaletteRedForeground1;
}

function fmtMs(ms) {
  if (ms == null) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function fmtDelta(ms) {
  if (ms == null) return '—';
  const sign = ms > 0 ? '+' : '';
  return `${sign}${ms}ms`;
}

function deltaColor(ms) {
  if (ms == null) return tokens.colorNeutralForeground3;
  if (ms <= -50) return tokens.colorPaletteGreenForeground1;
  if (ms >= 50) return tokens.colorPaletteRedForeground1;
  return tokens.colorNeutralForeground2;
}

export default function DevPerfOverlay() {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [, forceRender] = useState(0);
  const [nav, setNav] = useState(null);
  const [transferKB, setTransferKB] = useState(null);
  const [syncMetrics, setSyncMetrics] = useState(null);
  const [baseline, setBaseline] = useState(null);

  // Her-render bij elke nieuwe API-timing.
  useEffect(() => subscribePerf(() => forceRender((n) => n + 1)), []);

  // Navigatie-timing pas aflezen ná load (loadEventEnd is dan gevuld).
  useEffect(() => {
    const read = () => {
      setNav(getNavigationTiming());
      setTransferKB(getResourceTransferKB());
    };
    if (document.readyState === 'complete') read();
    else {
      window.addEventListener('load', read, { once: true });
      return () => window.removeEventListener('load', read);
    }
    return undefined;
  }, []);

  // Backend-sync-KPI's ophalen zolang het paneel open is (raw fetch, buiten apiRequest zodat
  // deze poll de API-timinglijst niet vervuilt).
  const pollSync = useCallback(async () => {
    try {
      const res = await fetch('/api/purchase-orders/refresh/progress', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setSyncMetrics(data?.metrics || null);
    } catch {
      /* niet-kritiek */
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    loadPerfBaseline().then(setBaseline).catch(() => setBaseline(null));
    pollSync();
    const t = window.setInterval(pollSync, 5000);
    return () => window.clearInterval(t);
  }, [open, pollSync]);

  const timings = getApiTimings();
  const lastApi = timings[0];
  const baselineRows = buildBaselineCompareRows(baseline, timings);

  if (!open) {
    return (
      <div className={styles.badge} onClick={() => setOpen(true)} title="Open performance HUD">
        <TopSpeedRegular fontSize={14} color={tokens.colorBrandForeground1} />
        <span className={styles.badgeText}>
          {lastApi ? `${fmtMs(lastApi.ms)}` : 'PERF'}
        </span>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>⚡ Performance</span>
        <Dismiss24Regular className={styles.close} fontSize={16} onClick={() => setOpen(false)} />
      </div>

      <div className={styles.panelScroll}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Load time (this page)</div>
        {nav ? (
          <>
            <div className={styles.row}><span>TTFB</span><span className={styles.mono}>{fmtMs(nav.ttfb)}</span></div>
            <div className={styles.row}><span>DOMContentLoaded</span><span className={styles.mono}>{fmtMs(nav.domContentLoaded)}</span></div>
            <div className={styles.row}><span>Fully loaded</span><span className={styles.mono} style={{ color: durColor(nav.load) }}>{fmtMs(nav.load)}</span></div>
            <div className={styles.row}><span>JS/CSS transferred</span><span className={styles.mono}>{transferKB != null ? `${transferKB} KB` : '—'}</span></div>
          </>
        ) : (
          <div className={styles.empty}>no navigation timing yet…</div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Latest D365 sync (server)</div>
        {syncMetrics ? (
          <>
            <div className={styles.row}><span>Fetch (D365)</span><span className={styles.mono} style={{ color: durColor(syncMetrics.fetchMs) }}>{fmtMs(syncMetrics.fetchMs)}</span></div>
            <div className={styles.row}><span>Save (SQL)</span><span className={styles.mono} style={{ color: durColor(syncMetrics.saveMs) }}>{fmtMs(syncMetrics.saveMs)}</span></div>
            <div className={styles.row}><span>Total</span><span className={styles.mono}>{fmtMs(syncMetrics.totalMs)}</span></div>
            <div className={styles.row}><span>Written / skipped</span><span className={styles.mono}>{syncMetrics.writtenOrders} / {syncMetrics.skippedOrders}</span></div>
            <div className={styles.row}><span>Orders/sec</span><span className={styles.mono}>{syncMetrics.ordersPerSec ?? '—'}</span></div>
          </>
        ) : (
          <div className={styles.empty}>no sync in this server process yet…</div>
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          Vs baseline (pre-fix)
          {baseline?.updatedAt ? ` · ${baseline.updatedAt}` : ''}
        </div>
        {!baseline?.hudWatch?.length ? (
          <div className={styles.empty}>no baseline — run scout or add public/perf-baseline.json</div>
        ) : (
          baselineRows.map((row) => (
            <div className={styles.row} key={row.id}>
              <span className={styles.path} title={row.matchedPath || row.label}>{row.label}</span>
              <span className={styles.mono}>
                {row.currentMs != null ? fmtMs(row.currentMs) : '—'}
                {' / '}
                {row.baselineMs != null ? fmtMs(row.baselineMs) : '—'}
                {' '}
                <span style={{ color: deltaColor(row.delta) }}>({fmtDelta(row.delta)})</span>
              </span>
            </div>
          ))
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Recent API calls ({timings.length})</div>
        {timings.length === 0 ? (
          <div className={styles.empty}>no calls yet</div>
        ) : (
          timings.map((t, i) => (
            <div className={styles.row} key={`${t.at}-${t.path}-${i}`}>
              <span className={styles.path} title={`${t.method} ${t.path}`}>
                <span className={styles.mono}>{t.method}</span> {t.path}
              </span>
              <span className={styles.mono} style={{ color: durColor(t.ms) }}>{fmtMs(t.ms)}</span>
            </div>
          ))
        )}
      </div>
      </div>
    </div>
  );
}

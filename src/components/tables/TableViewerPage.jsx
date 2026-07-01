import React from 'react';
import { useParams } from 'react-router-dom';
import { Badge, Button, makeStyles, Spinner, tokens } from '@fluentui/react-components';
import { ArrowClockwiseRegular, CheckmarkRegular } from '@fluentui/react-icons';
import EmptyState from '../shared/EmptyState';
import GenericBoardTable from './GenericBoardTable';
import { useTableGrid } from '../../hooks/useTableGrid';
import { formatSyncedAt } from '../../utils/purchaseOrderFormat';

// Generieke tabel-viewer (#139). tableKey komt via de route /tables/:tableKey binnen
// (useParams) en wordt aan useTableGrid gevoerd; die praat met /api/data/:tableKey.
// Kolommen, label en hasDetail komen dynamisch uit het contract — niets is hardcoded,
// dus elke via de TableBuilder gepubliceerde tabel verschijnt hier zonder codewijziging.

const useStyles = makeStyles({
  page: { paddingTop: '24px', paddingBottom: '24px', paddingLeft: '24px', paddingRight: '24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  titleWrap: { display: 'flex', flexDirection: 'column', gap: '4px' },
  title: { fontSize: '24px', fontWeight: 600 },
  subtitle: { color: tokens.colorNeutralForeground3 },
  toolbar: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' },
  freshness: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  toolbarSpacer: { flexGrow: 1 },
  error: { color: tokens.colorPaletteRedForeground1, marginBottom: '16px' },
});

export default function TableViewerPage() {
  const styles = useStyles();
  const { tableKey } = useParams();

  const {
    label,
    hasDetail,
    rows,
    masterColumns,
    detailColumns,
    syncedAt,
    stale,
    hasCache,
    total,
    newCount,
    changedCount,
    loading,
    refreshing,
    markingViewed,
    error,
    refresh,
    markViewed,
    saveValue,
  } = useTableGrid(tableKey);

  const relativeSynced = formatSyncedAt(syncedAt);
  const pageTitle = label || 'Tabel';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleWrap}>
          <div className={styles.title}>{pageTitle}</div>
          <div className={styles.subtitle}>Totaal: {total}</div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.freshness}>
          {!hasCache ? (
            <Badge color="warning" appearance="tint">Nog niet gesynchroniseerd</Badge>
          ) : (
            <>
              <span>Laatst ververst: {relativeSynced || 'onbekend'}</span>
              {stale ? (
                <Badge color="warning" appearance="tint">Verouderd</Badge>
              ) : (
                <Badge color="success" appearance="tint">Actueel</Badge>
              )}
            </>
          )}
        </div>

        {(newCount > 0 || changedCount > 0) ? (
          <div className={styles.freshness}>
            {newCount > 0 ? <Badge color="success" appearance="filled">{newCount} nieuw</Badge> : null}
            {changedCount > 0 ? <Badge color="warning" appearance="filled">{changedCount} gewijzigd</Badge> : null}
            <Button
              appearance="subtle"
              size="small"
              icon={<CheckmarkRegular />}
              onClick={markViewed}
              disabled={markingViewed}
            >
              {markingViewed ? 'Bezig...' : 'Markeer als gezien'}
            </Button>
          </div>
        ) : null}

        <div className={styles.toolbarSpacer} />

        <Button
          appearance="primary"
          icon={refreshing ? <Spinner size="tiny" /> : <ArrowClockwiseRegular />}
          onClick={refresh}
          disabled={refreshing}
        >
          {refreshing ? 'Vernieuwen...' : 'Vernieuwen'}
        </Button>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}

      {loading ? (
        <Spinner label="Gegevens laden..." />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Geen gegevens gevonden"
          description="Vernieuw de gegevens of controleer de bron-synchronisatie."
        />
      ) : (
        <GenericBoardTable
          rows={rows}
          masterColumns={masterColumns}
          detailColumns={detailColumns}
          hasDetail={hasDetail}
          onSaveValue={saveValue}
        />
      )}
    </div>
  );
}

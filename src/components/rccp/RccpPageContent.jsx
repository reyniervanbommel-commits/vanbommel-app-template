import React, { useCallback, useState } from 'react';
import {
  Button, Field, Input, Spinner, Text, makeStyles, tokens, shorthands,
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
import RccpCapacityEditor from './RccpCapacityEditor';
import RccpImportDialog from './RccpImportDialog';
import RccpSettingsFlyout from './RccpSettingsFlyout';
import RccpVendorFilter from './RccpVendorFilter';
import { useRccpVendorOptions } from '../../hooks/useRccpVendorOptions';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalXL) },
  subtitle: { color: tokens.colorNeutralForeground3 },
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
  const [vendorAccount, setVendorAccount] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    vendors, vendorNames, loading: vendorsLoading, error: vendorsError,
  } = useRccpVendorOptions();
  const {
    window, setWindow, analysis, loading, error, readOnly,
    measureRows, periods, cellMap, reload,
  } = useRccpPage({ vendorAccount: isSupplier ? undefined : vendorAccount });

  const [drillCell, setDrillCell] = useState(null);

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

  return (
    <div className={styles.root}>
      <Text size={700} weight="semibold">Rough Cut Capacity Planning</Text>
      <Text className={styles.subtitle}>
        Compare planned vendor capacity against live purchase order load.
      </Text>

      <div className={styles.toolbar}>
        {!isSupplier && (
          <RccpVendorFilter
            value={vendorAccount}
            onChange={setVendorAccount}
            vendors={vendors}
            vendorNames={vendorNames}
            loading={vendorsLoading}
            error={vendorsError}
          />
        )}
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
        <Button icon={<ArrowClockwise24Regular />} onClick={reload}>Refresh</Button>
        {isAdmin && (
          <Button icon={<Settings24Regular />} onClick={handleOpenSettings}>Settings</Button>
        )}
        <RccpCapacityEditor readOnly={readOnly} onSaved={reload} />
        <RccpImportDialog readOnly={readOnly} onImported={reload} />
      </div>

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
        />
      )}
    </div>
  );
}

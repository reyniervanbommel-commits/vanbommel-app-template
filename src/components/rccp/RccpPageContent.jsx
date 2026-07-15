import React, { useCallback, useState } from 'react';
import {
  Button, Field, Input, Spinner, Text, makeStyles, tokens, shorthands,
} from '@fluentui/react-components';
import { ArrowClockwise24Regular } from '@fluentui/react-icons';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { useRccpPage } from '../../hooks/useRccpPage';
import RccpKpiCards from './RccpKpiCards';
import RccpMatrixTable from './RccpMatrixTable';
import RccpChart from './RccpChart';
import RccpMissingDateCard from './RccpMissingDateCard';
import RccpDrillDownPanel from './RccpDrillDownPanel';
import RccpCapacityEditor from './RccpCapacityEditor';
import RccpImportDialog from './RccpImportDialog';

const useStyles = makeStyles({
  root: { display: 'flex', flexDirection: 'column', ...shorthands.gap('20px') },
  toolbar: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', ...shorthands.gap('12px') },
  error: { color: tokens.colorPaletteRedForeground1 },
});

export default function RccpPageContent() {
  const styles = useStyles();
  const { user } = useAuth();
  const isSupplier = user?.role === ROLES.SUPPLIER;
  const [vendorAccount, setVendorAccount] = useState('');
  const {
    window, setWindow, analysis, loading, error, readOnly,
    categories, periods, cellMap, reload,
  } = useRccpPage({ vendorAccount: isSupplier ? undefined : vendorAccount });

  const [drillCell, setDrillCell] = useState(null);

  const handleWindowChange = useCallback((field, value) => {
    setWindow((prev) => ({ ...prev, [field]: Number(value) }));
  }, [setWindow]);

  const handleCellClick = useCallback((cell) => {
    if (cell) setDrillCell(cell);
  }, []);

  const handleCloseDrill = useCallback(() => setDrillCell(null), []);

  return (
    <div className={styles.root}>
      <Text size={700} weight="semibold">Rough Cut Capacity Planning</Text>
      <Text style={{ color: tokens.colorNeutralForeground3 }}>
        Compare planned vendor capacity against live purchase order load.
      </Text>

      <div className={styles.toolbar}>
        {!isSupplier && (
          <Field label="Vendor filter">
            <Input value={vendorAccount} placeholder="All vendors" onChange={(e) => setVendorAccount(e.target.value)} />
          </Field>
        )}
        <Field label="From year"><Input type="number" value={String(window.fromYear)} onChange={(e) => handleWindowChange('fromYear', e.target.value)} /></Field>
        <Field label="From week"><Input type="number" value={String(window.fromWeek)} onChange={(e) => handleWindowChange('fromWeek', e.target.value)} /></Field>
        <Field label="To year"><Input type="number" value={String(window.toYear)} onChange={(e) => handleWindowChange('toYear', e.target.value)} /></Field>
        <Field label="To week"><Input type="number" value={String(window.toWeek)} onChange={(e) => handleWindowChange('toWeek', e.target.value)} /></Field>
        <Button icon={<ArrowClockwise24Regular />} onClick={reload}>Refresh</Button>
        <RccpCapacityEditor readOnly={readOnly} onSaved={reload} />
        <RccpImportDialog readOnly={readOnly} onImported={reload} />
      </div>

      {loading && <Spinner label="Loading RCCP dashboard..." />}
      {error && <Text className={styles.error}>{error}</Text>}

      {!loading && !error && analysis && (
        <>
          <RccpKpiCards kpis={analysis.kpis} />
          <RccpChart chart={analysis.chart} />
          <RccpMissingDateCard items={analysis.missingDates} />
          <RccpMatrixTable
            categories={categories}
            periods={periods}
            cellMap={cellMap}
            onCellClick={handleCellClick}
          />
        </>
      )}

      <RccpDrillDownPanel
        open={Boolean(drillCell)}
        cell={drillCell}
        window={window}
        onClose={handleCloseDrill}
      />
    </div>
  );
}

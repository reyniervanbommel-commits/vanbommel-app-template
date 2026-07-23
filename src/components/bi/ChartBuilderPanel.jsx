import React, { useCallback, useEffect, useLayoutEffect } from 'react';
import {
  Button, Input, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import ChartBuilderFlyoutForm from './ChartBuilderFlyoutForm';
import ChartBuilderPageForm from './ChartBuilderPageForm';
import { useChartBuilder } from './hooks/useChartBuilder';

const useStyles = makeStyles({
  nameInputFlyout: {
    width: '100%',
    // Brand-gekleurde underline op de eigen root i.p.v. een Fluent-intern part-selector.
    '::after': { ...shorthands.borderColor(tokens.colorBrandStroke1) },
  },
  // De tekst-slot van de naam-input stylen via de officiële `input`-slot className.
  nameInputFlyoutInner: {
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
    ...shorthands.padding(tokens.spacingVerticalXXS, '0'),
  },
});

/**
 * Router tussen de twee varianten van de chart builder:
 * - `flyout`: compacte vorm in het rechter side-panel (naam + acties leveren we als chrome aan).
 * - `page`: los paneel op de BI-pagina.
 */
export default function ChartBuilderPanel({
  columns, chart, onSave, onCancel, onDraftChange, onFlyoutChromeChange,
  busy = false, variant = 'page',
}) {
  const styles = useStyles();
  const isFlyout = variant === 'flyout';
  const builder = useChartBuilder(chart, columns);
  const {
    config, measureColumns, isDateDimension, isValid, multiMeasureMode, selectedMeasures,
  } = builder;
  const countMode = config.aggregation === 'count';

  useEffect(() => {
    onDraftChange?.(builder.payload);
  }, [builder.payload, onDraftChange]);

  const handleSave = useCallback(() => {
    if (!isValid || busy) return;
    onSave(builder.payload);
  }, [isValid, busy, onSave, builder.payload]);

  const handleNameChange = useCallback((_, data) => {
    builder.setName(data.value);
  }, [builder]);

  useLayoutEffect(() => {
    if (!isFlyout) {
      onFlyoutChromeChange?.({ actions: null, nameField: null });
      return undefined;
    }
    onFlyoutChromeChange?.({
      nameField: (
        <Input
          className={styles.nameInputFlyout}
          input={{ className: styles.nameInputFlyoutInner }}
          appearance="underline"
          size="medium"
          value={builder.name}
          onChange={handleNameChange}
          placeholder="Chart name"
          aria-label="Chart name"
        />
      ),
      actions: (
        <>
          <Button size="small" appearance="primary" onClick={handleSave} disabled={!isValid || busy}>
            {busy ? 'Saving…' : 'Save chart'}
          </Button>
          <Button size="small" appearance="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        </>
      ),
    });
    return () => onFlyoutChromeChange?.({ actions: null, nameField: null });
  }, [
    isFlyout, isValid, busy, handleSave, onCancel, onFlyoutChromeChange,
    builder.name, handleNameChange, styles.nameInputFlyout, styles.nameInputFlyoutInner,
  ]);

  if (isFlyout) {
    return (
      <ChartBuilderFlyoutForm
        builder={builder}
        columns={columns}
        config={config}
        measureColumns={measureColumns}
        isDateDimension={isDateDimension}
        multiMeasureMode={multiMeasureMode}
        selectedMeasures={selectedMeasures}
        countMode={countMode}
      />
    );
  }

  return (
    <ChartBuilderPageForm
      builder={builder}
      columns={columns}
      config={config}
      measureColumns={measureColumns}
      isDateDimension={isDateDimension}
      multiMeasureMode={multiMeasureMode}
      selectedMeasures={selectedMeasures}
      chart={chart}
      onSave={onSave}
      onCancel={onCancel}
      busy={busy}
      isValid={isValid}
    />
  );
}

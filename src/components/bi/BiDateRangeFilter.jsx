import React, { memo, useCallback } from 'react';
import {
  Dropdown, Field, Input, makeStyles, Option, shorthands, tokens,
} from '@fluentui/react-components';

const ALL_DATES = '__all__';

const useStyles = makeStyles({
  root: { display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', ...shorthands.gap(tokens.spacingHorizontalM) },
  dateField: { minWidth: '180px', maxWidth: '220px' },
  yearInput: { width: '96px' },
  weekInput: { width: '76px' },
});

/**
 * Week/jaar-datumfilter (zelfde velden als RCCP): datumkolom + From/To jaar & week.
 * De week/jaar-velden verschijnen zodra er een datumkolom is gekozen.
 */
function BiDateRangeFilter({ dateColumns, dateColumnKey, onDateColumnChange, isoWindow, onWindowChange }) {
  const styles = useStyles();

  const handleColumnSelect = useCallback((_, data) => {
    onDateColumnChange(data.optionValue === ALL_DATES ? '' : (data.optionValue || ''));
  }, [onDateColumnChange]);

  const handleField = useCallback((field) => (_, data) => {
    onWindowChange(field, data.value);
  }, [onWindowChange]);

  const selectedColumn = dateColumns.find((col) => col.key === dateColumnKey);
  const selectedLabel = selectedColumn ? selectedColumn.label : 'All dates';

  return (
    <div className={styles.root}>
      <Field label="Date field" className={styles.dateField}>
        <Dropdown
          selectedOptions={[dateColumnKey || ALL_DATES]}
          value={selectedLabel}
          onOptionSelect={handleColumnSelect}
        >
          <Option value={ALL_DATES} text="All dates">All dates</Option>
          {dateColumns.map((col) => (
            <Option key={col.key} value={col.key} text={col.label}>{col.label}</Option>
          ))}
        </Dropdown>
      </Field>
      {dateColumnKey ? (
        <>
          <Field label="From year">
            <Input className={styles.yearInput} type="number" value={String(isoWindow.fromYear)} onChange={handleField('fromYear')} />
          </Field>
          <Field label="From week">
            <Input className={styles.weekInput} type="number" min={1} max={53} value={String(isoWindow.fromWeek)} onChange={handleField('fromWeek')} />
          </Field>
          <Field label="To year">
            <Input className={styles.yearInput} type="number" value={String(isoWindow.toYear)} onChange={handleField('toYear')} />
          </Field>
          <Field label="To week">
            <Input className={styles.weekInput} type="number" min={1} max={53} value={String(isoWindow.toWeek)} onChange={handleField('toWeek')} />
          </Field>
        </>
      ) : null}
    </div>
  );
}

export default memo(BiDateRangeFilter);

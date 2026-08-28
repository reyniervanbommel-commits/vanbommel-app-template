import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Button, Popover, PopoverSurface, PopoverTrigger, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { CalendarWeekStart24Regular, ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import {
  applyIsoWeekPickerClick,
  compareIsoWeekParts,
  currentIsoWindow,
  currentIsoWeekParts,
  formatIsoWindowLabel,
  hasRccpDataWindow,
  isSameIsoWindow,
  isoYearPickerYears,
  isoWeekPickerYearBounds,
  RCCP_WEEK_PICKER_DEFAULT_HEIGHT,
  clampWeekPickerListHeight,
} from './rccpUtils';
import RccpIsoWeekCalendarGrid from './RccpIsoWeekCalendarGrid';

const useStyles = makeStyles({
  trigger: { minWidth: '220px', maxWidth: '280px' },
  surface: {
    ...shorthands.padding('8px'),
    width: 'max-content',
    boxSizing: 'border-box',
    overflow: 'visible',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  title: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase300 },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    marginBottom: '4px',
  },
  yearGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 52px)',
    ...shorthands.gap('4px'),
  },
  yearButton: { minWidth: '52px' },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px',
    ...shorthands.gap('4px'),
  },
  presets: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('4px'),
  },
  footerActions: {
    display: 'flex',
    ...shorthands.gap('4px'),
  },
});

function YearPickerGrid({ years, viewYear, onSelectYear, styles }) {
  return (
    <div className={styles.yearGrid} role="listbox" aria-label="Choose year">
      {years.map((year) => (
        <YearPickerButton
          key={year}
          year={year}
          selected={year === viewYear}
          onSelectYear={onSelectYear}
          styles={styles}
        />
      ))}
    </div>
  );
}

function YearPickerButton({ year, selected, onSelectYear, styles }) {
  const handleClick = useCallback(() => onSelectYear(year), [onSelectYear, year]);
  return (
    <Button
      appearance={selected ? 'primary' : 'subtle'}
      size="small"
      className={styles.yearButton}
      aria-label={String(year)}
      aria-selected={selected}
      onClick={handleClick}
    >
      {year}
    </Button>
  );
}

function RccpIsoWeekRangePicker({
  window: isoWindow, onReplaceWindow, analysis, onShowDataWindow,
}) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(isoWindow.fromYear);
  const [yearAnchor, setYearAnchor] = useState(isoWindow.fromYear);
  const [pickingYear, setPickingYear] = useState(false);
  const [pending, setPending] = useState(null);
  const [locked, setLocked] = useState(null);
  const [listHeight, setListHeight] = useState(RCCP_WEEK_PICKER_DEFAULT_HEIGHT);
  const [scrollYear, setScrollYear] = useState(null);
  const displayWindow = isoWindow;
  const label = formatIsoWindowLabel(isoWindow);
  const now = currentIsoWeekParts();
  const canShowDataWeeks = hasRccpDataWindow(analysis);
  const alreadyOnDataWeeks = isSameIsoWindow(isoWindow, analysis?.dataWindow);
  const yearSpan = useMemo(() => isoWeekPickerYearBounds({
    focusYear: isoWindow.fromYear,
    viewYear,
    nowYear: now.year,
    dataFromYear: analysis?.dataWindow?.fromYear,
    dataToYear: analysis?.dataWindow?.toYear,
  }), [isoWindow.fromYear, viewYear, now.year, analysis?.dataWindow?.fromYear, analysis?.dataWindow?.toYear]);
  const years = useMemo(() => isoYearPickerYears(yearAnchor), [yearAnchor]);
  const from = useMemo(
    () => ({ year: displayWindow.fromYear, week: displayWindow.fromWeek }),
    [displayWindow.fromYear, displayWindow.fromWeek],
  );
  const to = useMemo(
    () => ({ year: displayWindow.toYear, week: displayWindow.toWeek }),
    [displayWindow.toYear, displayWindow.toWeek],
  );
  const focusWeek = useMemo(
    () => ({ year: isoWindow.fromYear, week: isoWindow.fromWeek }),
    [isoWindow.fromYear, isoWindow.fromWeek],
  );

  const showYear = useCallback((year) => {
    setViewYear(year);
    setYearAnchor(year);
    setPickingYear(false);
  }, []);

  const handleOpenChange = useCallback((_, data) => {
    const nextOpen = Boolean(data.open);
    setOpen(nextOpen);
    if (nextOpen) {
      setPending(null);
      setScrollYear(null);
      showYear(isoWindow.fromYear);
    }
  }, [isoWindow.fromYear, showYear]);

  const goPrev = useCallback(() => {
    if (pickingYear) {
      setYearAnchor((year) => year - 12);
      return;
    }
    const next = viewYear - 1;
    setViewYear(next);
    setScrollYear(next);
  }, [pickingYear, viewYear]);

  const goNext = useCallback(() => {
    if (pickingYear) {
      setYearAnchor((year) => year + 12);
      return;
    }
    const next = viewYear + 1;
    setViewYear(next);
    setScrollYear(next);
  }, [pickingYear, viewYear]);

  const openYearPicker = useCallback(() => {
    setYearAnchor(viewYear);
    setPickingYear(true);
  }, [viewYear]);

  const handleListHeight = useCallback((next) => {
    setListHeight(clampWeekPickerListHeight(next));
  }, []);

  const handleSelectYear = useCallback((year) => {
    showYear(year);
    setScrollYear(year);
  }, [showYear]);

  const handleSelectWeek = useCallback((parts) => {
    const result = applyIsoWeekPickerClick({
      pending, locked, window: displayWindow,
    }, parts);
    setPending(result.pending);
    setLocked(result.locked);
    if (result.apply && result.window) onReplaceWindow(result.window);
  }, [pending, locked, displayWindow, onReplaceWindow]);

  const handleNow = useCallback(() => {
    const nextTo = currentIsoWeekParts();
    const pinned = locked || from;
    const nextFrom = compareIsoWeekParts(pinned, nextTo) <= 0 ? pinned : nextTo;
    onReplaceWindow({
      fromYear: nextFrom.year,
      fromWeek: nextFrom.week,
      toYear: nextTo.year,
      toWeek: nextTo.week,
    });
    setPending(null);
    showYear(nextTo.year);
    setScrollYear(nextTo.year);
  }, [from, locked, onReplaceWindow, showYear]);

  const handleShowDataWeeks = useCallback(() => {
    onShowDataWindow?.();
    setPending(null);
    setLocked(null);
  }, [onShowDataWindow]);

  const handleClearAll = useCallback(() => {
    const next = currentIsoWindow(8);
    onReplaceWindow(next);
    setPending(null);
    setLocked(null);
    setScrollYear(null);
    showYear(next.fromYear);
  }, [onReplaceWindow, showYear]);

  const title = pickingYear ? `${years[0]} – ${years[years.length - 1]}` : String(viewYear);
  const prevLabel = pickingYear ? 'Previous years' : 'Previous year';
  const nextLabel = pickingYear ? 'Next years' : 'Next year';

  return (
    <Popover open={open} onOpenChange={handleOpenChange} positioning="below-start" trapFocus withArrow>
      <PopoverTrigger disableButtonEnhancement>
        <Button
          className={styles.trigger}
          appearance="outline"
          icon={<CalendarWeekStart24Regular />}
          aria-label={`Period ${label}`}
        >
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverSurface className={styles.surface} aria-label="Week period picker">
        <div className={styles.header}>
          <Button appearance="subtle" size="small" icon={<ChevronLeftRegular />} aria-label={prevLabel} onClick={goPrev} />
          {pickingYear ? (
            <span className={styles.title}>{title}</span>
          ) : (
            <Button appearance="transparent" className={styles.title} aria-label={`Choose year ${viewYear}`} onClick={openYearPicker}>
              {title}
            </Button>
          )}
          <Button appearance="subtle" size="small" icon={<ChevronRightRegular />} aria-label={nextLabel} onClick={goNext} />
        </div>
        <div className={styles.hint}>
          {pickingYear ? 'Select a year.' : 'Click a week twice to lock it, then pick the other end.'}
        </div>
        {pickingYear ? (
          <YearPickerGrid years={years} viewYear={viewYear} onSelectYear={handleSelectYear} styles={styles} />
        ) : (
          <RccpIsoWeekCalendarGrid
            yearSpan={yearSpan}
            from={from}
            to={to}
            now={now}
            locked={locked}
            onSelectWeek={handleSelectWeek}
            listHeight={listHeight}
            onListHeightChange={handleListHeight}
            focusWeek={focusWeek}
            scrollYear={scrollYear}
          />
        )}
        <div className={styles.footer}>
          <div className={styles.presets}>
            <Button
              size="small"
              disabled={!canShowDataWeeks || alreadyOnDataWeeks}
              title={canShowDataWeeks ? undefined : 'No weeks with data for this vendor'}
              onClick={handleShowDataWeeks}
            >
              Show weeks with data
            </Button>
          </div>
          <div className={styles.footerActions}>
            <Button appearance="transparent" size="small" onClick={handleClearAll}>Clear all</Button>
            <Button appearance="transparent" size="small" onClick={handleNow}>Now</Button>
          </div>
        </div>
      </PopoverSurface>
    </Popover>
  );
}

export default memo(RccpIsoWeekRangePicker);

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Button, Popover, PopoverSurface, PopoverTrigger, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { CalendarWeekStart24Regular, ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import { MONTH_LABELS } from '../supplier/weekNumberCalendarUtils';
import {
  compareIsoWeekParts,
  currentIsoWindow,
  currentIsoWeekParts,
  formatIsoWindowLabel,
  isoWeekStartUtc,
  isoWindowFromWeekClicks,
} from './rccpUtils';
import RccpIsoWeekCalendarGrid from './RccpIsoWeekCalendarGrid';

const PRESETS = [
  { weeks: 8, label: '8 weeks' },
  { weeks: 13, label: '13 weeks' },
  { weeks: 26, label: '26 weeks' },
];

const useStyles = makeStyles({
  trigger: { minWidth: '220px', maxWidth: '280px' },
  surface: {
    ...shorthands.padding('10px'),
    width: 'max-content',
    boxSizing: 'border-box',
    overflow: 'visible',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  title: { fontWeight: tokens.fontWeightSemibold, fontSize: tokens.fontSizeBase300 },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginBottom: '8px',
  },
  footer: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    ...shorthands.gap('6px'),
  },
  presets: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('4px'),
  },
});

function RccpIsoWeekRangePicker({ window: isoWindow, onReplaceWindow }) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(isoWindow.fromYear);
  const [viewMonth, setViewMonth] = useState(0);
  const [anchor, setAnchor] = useState(null);
  const [draft, setDraft] = useState(null);
  const displayWindow = draft || isoWindow;
  const label = formatIsoWindowLabel(isoWindow);
  const now = currentIsoWeekParts();
  const from = useMemo(
    () => ({ year: displayWindow.fromYear, week: displayWindow.fromWeek }),
    [displayWindow.fromYear, displayWindow.fromWeek],
  );
  const to = useMemo(
    () => ({ year: displayWindow.toYear, week: displayWindow.toWeek }),
    [displayWindow.toYear, displayWindow.toWeek],
  );

  const showMonth = useCallback((year, week) => {
    const monday = isoWeekStartUtc(year, week);
    setViewYear(monday.getUTCFullYear());
    setViewMonth(monday.getUTCMonth());
  }, []);

  const handleOpenChange = useCallback((_, data) => {
    const nextOpen = Boolean(data.open);
    setOpen(nextOpen);
    if (nextOpen) {
      setAnchor(null);
      setDraft(null);
      showMonth(isoWindow.fromYear, isoWindow.fromWeek);
    }
  }, [isoWindow.fromYear, isoWindow.fromWeek, showMonth]);

  const goPrevMonth = useCallback(() => {
    setViewMonth((month) => {
      if (month === 0) {
        setViewYear((year) => year - 1);
        return 11;
      }
      return month - 1;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setViewMonth((month) => {
      if (month === 11) {
        setViewYear((year) => year + 1);
        return 0;
      }
      return month + 1;
    });
  }, []);

  const handleSelectWeek = useCallback((parts) => {
    const result = isoWindowFromWeekClicks(anchor, parts);
    setAnchor(result.nextAnchor);
    if (!result.window) return;
    setDraft(result.window);
    if (!result.nextAnchor) {
      onReplaceWindow(result.window);
      setDraft(null);
    }
  }, [anchor, onReplaceWindow]);

  const handleNow = useCallback(() => {
    const nextTo = currentIsoWeekParts();
    const nextFrom = compareIsoWeekParts(from, nextTo) <= 0 ? from : nextTo;
    onReplaceWindow({
      fromYear: nextFrom.year,
      fromWeek: nextFrom.week,
      toYear: nextTo.year,
      toWeek: nextTo.week,
    });
    setAnchor(null);
    setDraft(null);
    showMonth(nextTo.year, nextTo.week);
  }, [from, onReplaceWindow, showMonth]);

  const handlePreset = useCallback((event) => {
    const next = currentIsoWindow(Number(event.currentTarget.dataset.weeks));
    onReplaceWindow(next);
    setAnchor(null);
    setDraft(null);
    showMonth(next.fromYear, next.fromWeek);
  }, [onReplaceWindow, showMonth]);

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
          <Button appearance="subtle" size="small" icon={<ChevronLeftRegular />} aria-label="Previous month" onClick={goPrevMonth} />
          <span className={styles.title}>{`${MONTH_LABELS[viewMonth]} ${viewYear}`}</span>
          <Button appearance="subtle" size="small" icon={<ChevronRightRegular />} aria-label="Next month" onClick={goNextMonth} />
        </div>
        <div className={styles.hint}>Select a start week, then an end week.</div>
        <RccpIsoWeekCalendarGrid
          viewYear={viewYear}
          viewMonth={viewMonth}
          from={from}
          to={to}
          now={now}
          onSelectWeek={handleSelectWeek}
        />
        <div className={styles.footer}>
          <div className={styles.presets}>
            {PRESETS.map((preset) => (
              <Button key={preset.weeks} size="small" data-weeks={preset.weeks} onClick={handlePreset}>
                {preset.label}
              </Button>
            ))}
          </div>
          <Button appearance="transparent" size="small" onClick={handleNow}>Now</Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
}

export default memo(RccpIsoWeekRangePicker);

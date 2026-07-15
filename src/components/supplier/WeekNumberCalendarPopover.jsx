import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Button,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ChevronLeftRegular, ChevronRightRegular } from '@fluentui/react-icons';
import {
  MONTH_LABELS,
  WEEKDAY_LABELS,
  buildCalendarWeeks,
  formatIsoDate,
  parseIsoDate,
  sameCalendarDay,
} from './weekNumberCalendarUtils';

const useStyles = makeStyles({
  triggerWrap: {
    display: 'block',
    minWidth: 0,
    width: '100%',
  },
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
  title: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase300,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '36px repeat(7, 32px)',
    columnGap: '2px',
    rowGap: '2px',
    alignItems: 'center',
  },
  weekHeader: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    textAlign: 'center',
    fontWeight: tokens.fontWeightSemibold,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('4px'),
    ...shorthands.padding('4px', '0'),
  },
  dayHeader: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    fontWeight: tokens.fontWeightSemibold,
    ...shorthands.padding('4px', '0'),
  },
  weekNumber: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
    textAlign: 'center',
    fontWeight: tokens.fontWeightSemibold,
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius('4px'),
    minHeight: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    minWidth: '32px',
    width: '32px',
    height: '28px',
    ...shorthands.padding('0'),
    fontSize: tokens.fontSizeBase200,
  },
  outsideMonth: {
    color: tokens.colorNeutralForeground4,
  },
  today: {
    outlineStyle: 'solid',
    outlineWidth: '1px',
    outlineColor: tokens.colorBrandStroke1,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
});

/**
 * Calendar popover with ISO week numbers in a left column.
 * Opens controlled; call onSelect with yyyy-mm-dd when a day is chosen.
 */
export default function WeekNumberCalendarPopover({
  open,
  onOpenChange,
  value,
  onSelect,
  children,
}) {
  const styles = useStyles();
  const selected = useMemo(() => parseIsoDate(value), [value]);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const [viewYear, setViewYear] = useState(() => (selected || today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selected || today).getMonth());

  useEffect(() => {
    if (!open) return;
    const anchor = selected || today;
    setViewYear(anchor.getFullYear());
    setViewMonth(anchor.getMonth());
  }, [open, selected, today]);

  const weeks = useMemo(() => buildCalendarWeeks(viewYear, viewMonth), [viewYear, viewMonth]);

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

  const goToday = useCallback(() => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelect(formatIsoDate(today));
    onOpenChange(false);
  }, [today, onSelect, onOpenChange]);

  const handleSelectDay = useCallback((date) => {
    onSelect(formatIsoDate(date));
    onOpenChange(false);
  }, [onSelect, onOpenChange]);

  const handleOpenChange = useCallback((_, data) => {
    onOpenChange(Boolean(data.open));
  }, [onOpenChange]);

  const handleTriggerClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleTriggerDoubleClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenChange(true);
  }, [onOpenChange]);

  const dayButtonClass = useCallback((isOutside, isToday, isSelected) => {
    const parts = [styles.dayButton];
    if (isOutside) parts.push(styles.outsideMonth);
    if (isToday && !isSelected) parts.push(styles.today);
    return parts.join(' ');
  }, [styles.dayButton, styles.outsideMonth, styles.today]);

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
      positioning="below-start"
      trapFocus
      withArrow
    >
      <PopoverTrigger disableButtonEnhancement>
        <span
          className={styles.triggerWrap}
          onClick={handleTriggerClick}
          onDoubleClick={handleTriggerDoubleClick}
        >
          {children}
        </span>
      </PopoverTrigger>
      <PopoverSurface className={styles.surface} aria-label="Date picker with week numbers">
        <div className={styles.header}>
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronLeftRegular />}
            aria-label="Previous month"
            onClick={goPrevMonth}
          />
          <span className={styles.title}>
            {MONTH_LABELS[viewMonth]}
            {' '}
            {viewYear}
          </span>
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronRightRegular />}
            aria-label="Next month"
            onClick={goNextMonth}
          />
        </div>
        <div className={styles.grid} role="grid" aria-label="Calendar">
          <div className={styles.weekHeader} role="columnheader" aria-label="Week">
            Wk
          </div>
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className={styles.dayHeader} role="columnheader">
              {label}
            </div>
          ))}
          {weeks.map((week) => (
            <React.Fragment key={`${viewYear}-${viewMonth}-w${week.weekNumber}-${week.days[0].getDate()}`}>
              <div className={styles.weekNumber} role="rowheader" aria-label={`Week ${week.weekNumber}`}>
                {week.weekNumber}
              </div>
              {week.days.map((date) => {
                const isOutside = date.getMonth() !== viewMonth;
                const isSelected = sameCalendarDay(date, selected);
                const isToday = sameCalendarDay(date, today);
                return (
                  <Button
                    key={formatIsoDate(date)}
                    appearance={isSelected ? 'primary' : 'subtle'}
                    size="small"
                    className={dayButtonClass(isOutside, isToday, isSelected)}
                    aria-label={formatIsoDate(date)}
                    aria-current={isToday ? 'date' : undefined}
                    aria-pressed={isSelected}
                    onClick={() => handleSelectDay(date)}
                  >
                    {date.getDate()}
                  </Button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <div className={styles.footer}>
          <Button appearance="transparent" size="small" onClick={goToday}>
            Today
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
}

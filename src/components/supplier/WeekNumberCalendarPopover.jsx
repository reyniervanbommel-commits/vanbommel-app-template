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
    width: '288px',
    maxWidth: '288px',
    boxSizing: 'border-box',
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
    width: '268px',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  headCell: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    ...shorthands.padding('4px', '0'),
    fontWeight: tokens.fontWeightSemibold,
  },
  weekCell: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    textAlign: 'center',
    width: '28px',
    ...shorthands.padding('2px'),
  },
  dayCell: {
    textAlign: 'center',
    ...shorthands.padding('2px'),
  },
  dayButton: {
    minWidth: '28px',
    width: '28px',
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
        <table className={styles.grid} role="grid" aria-label="Calendar">
          <thead>
            <tr>
              <th className={styles.headCell} scope="col" aria-label="Week">Wk</th>
              {WEEKDAY_LABELS.map((label) => (
                <th key={label} className={styles.headCell} scope="col">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={`${viewYear}-${viewMonth}-w${week.weekNumber}-${week.days[0].getDate()}`}>
                <td className={styles.weekCell}>{week.weekNumber}</td>
                {week.days.map((date) => {
                  const isOutside = date.getMonth() !== viewMonth;
                  const isSelected = sameCalendarDay(date, selected);
                  const isToday = sameCalendarDay(date, today);
                  return (
                    <td key={formatIsoDate(date)} className={styles.dayCell}>
                      <Button
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
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className={styles.footer}>
          <Button appearance="transparent" size="small" onClick={goToday}>
            Today
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
}

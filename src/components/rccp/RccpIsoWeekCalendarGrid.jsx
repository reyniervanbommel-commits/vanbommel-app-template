import React, { memo, useCallback, useMemo } from 'react';
import { Button, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { buildCalendarWeeks, WEEKDAY_LABELS } from '../supplier/weekNumberCalendarUtils';
import { compareIsoWeekParts, isoWeekPartsFromLocalDate } from './rccpUtils';

const useStyles = makeStyles({
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
    fontWeight: tokens.fontWeightSemibold,
    textAlign: 'center',
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
    minWidth: '36px',
    width: '36px',
    minHeight: '28px',
    ...shorthands.padding('0'),
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  dayButton: {
    minWidth: '32px',
    width: '32px',
    height: '28px',
    ...shorthands.padding('0'),
    fontSize: tokens.fontSizeBase200,
  },
  inRange: { backgroundColor: tokens.colorBrandBackground2 },
  outsideMonth: { color: tokens.colorNeutralForeground4 },
  currentWeek: {
    outlineStyle: 'solid',
    outlineWidth: '1px',
    outlineColor: tokens.colorBrandStroke1,
  },
});

function WeekDayCell({ date, viewMonth, selected, current, onSelect, styles }) {
  const outside = date.getMonth() !== viewMonth;
  return (
    <Button
      appearance="subtle"
      size="small"
      className={mergeClasses(
        styles.dayButton,
        selected && styles.inRange,
        outside && styles.outsideMonth,
        current && !selected && styles.currentWeek,
      )}
      aria-hidden
      tabIndex={-1}
      onClick={onSelect}
    >
      {date.getDate()}
    </Button>
  );
}

function WeekCalendarRow({ week, viewMonth, from, to, now, onSelectWeek, styles }) {
  const parts = isoWeekPartsFromLocalDate(week.days[0]);
  const selected = compareIsoWeekParts(parts, from) >= 0 && compareIsoWeekParts(parts, to) <= 0;
  const current = compareIsoWeekParts(parts, now) === 0;
  const year = parts.year;
  const weekNo = parts.week;
  const handleClick = useCallback(() => {
    onSelectWeek({ year, week: weekNo });
  }, [onSelectWeek, year, weekNo]);

  return (
    <>
      <Button
        appearance={selected ? 'primary' : 'subtle'}
        size="small"
        className={mergeClasses(styles.weekNumber, current && !selected && styles.currentWeek)}
        aria-label={`Week ${weekNo}, ${year}`}
        aria-pressed={selected}
        onClick={handleClick}
      >
        {weekNo}
      </Button>
      {week.days.map((date) => (
        <WeekDayCell
          key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
          date={date}
          viewMonth={viewMonth}
          selected={selected}
          current={current}
          onSelect={handleClick}
          styles={styles}
        />
      ))}
    </>
  );
}

function RccpIsoWeekCalendarGrid({ viewYear, viewMonth, from, to, now, onSelectWeek }) {
  const styles = useStyles();
  const weeks = useMemo(() => buildCalendarWeeks(viewYear, viewMonth), [viewYear, viewMonth]);

  return (
    <div className={styles.grid} role="grid" aria-label="ISO weeks">
      <div className={styles.weekHeader} role="columnheader">Wk</div>
      {WEEKDAY_LABELS.map((day) => (
        <div key={day} className={styles.dayHeader} role="columnheader">{day}</div>
      ))}
      {weeks.map((week) => (
        <WeekCalendarRow
          key={`${viewYear}-${viewMonth}-${week.weekNumber}-${week.days[0].getDate()}`}
          week={week}
          viewMonth={viewMonth}
          from={from}
          to={to}
          now={now}
          onSelectWeek={onSelectWeek}
          styles={styles}
        />
      ))}
    </div>
  );
}

export default memo(RccpIsoWeekCalendarGrid);

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import { MONTH_LABELS } from '../supplier/weekNumberCalendarUtils';
import {
  buildIsoYearWeeks,
  clampWeekPickerListHeight,
  compareIsoWeekParts,
  groupIsoWeeksByMonth,
} from './rccpUtils';

const useStyles = makeStyles({
  wrap: {
    display: 'flex',
    flexDirection: 'column',
    width: '248px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('2px'),
    overflowY: 'auto',
    overflowX: 'hidden',
    overscrollBehavior: 'contain',
  },
  yearLabel: {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase300,
    ...shorthands.padding('2px', '0'),
  },
  monthLabel: {
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground3,
    lineHeight: tokens.lineHeightBase100,
  },
  weeks: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap('2px'),
  },
  weekButton: {
    minWidth: '36px',
    width: '36px',
    height: '24px',
    minHeight: '24px',
    ...shorthands.padding('0'),
    fontSize: tokens.fontSizeBase200,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
  },
  lockedWeek: {
    backgroundColor: tokens.colorPaletteRedForeground1,
    color: tokens.colorNeutralForegroundOnBrand,
    ...shorthands.border('1px', 'solid', tokens.colorPaletteRedForeground1),
    ':hover': {
      backgroundColor: tokens.colorPaletteRedForeground1,
      color: tokens.colorNeutralForegroundOnBrand,
    },
    ':active': {
      backgroundColor: tokens.colorPaletteRedForeground1,
      color: tokens.colorNeutralForegroundOnBrand,
    },
  },
  lockedLabel: {
    color: tokens.colorNeutralForegroundOnBrand,
  },
  currentWeek: {
    outlineStyle: 'solid',
    outlineWidth: '1px',
    outlineColor: tokens.colorBrandStroke1,
  },
  handle: {
    height: '8px',
    marginTop: '4px',
    cursor: 'ns-resize',
    touchAction: 'none',
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralStroke2,
    ...shorthands.borderRadius('4px'),
    ':hover': { backgroundColor: tokens.colorBrandStroke1 },
  },
  dragging: { backgroundColor: tokens.colorBrandBackground2 },
});

function ListResizeHandle({ height, onResize, styles }) {
  const [dragging, setDragging] = useState(false);
  const handlePointerDown = useCallback((event) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setDragging(true);
    const handleMove = (moveEvent) => {
      onResize(clampWeekPickerListHeight(startHeight + (moveEvent.clientY - startY)));
    };
    const handleUp = () => {
      setDragging(false);
      if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('pointercancel', handleUp);
    };
    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('pointercancel', handleUp);
  }, [height, onResize]);
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      onResize(clampWeekPickerListHeight(height + 24));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      onResize(clampWeekPickerListHeight(height - 24));
    }
  }, [height, onResize]);

  return (
    <div
      className={mergeClasses(styles.handle, dragging && styles.dragging)}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize week list"
      aria-valuenow={height}
      tabIndex={0}
      title="Drag to show more weeks"
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    />
  );
}

function IsoWeekButton({ item, selected, current, locked, onSelectWeek, styles }) {
  const handleClick = useCallback(() => {
    onSelectWeek({ year: item.year, week: item.week });
  }, [onSelectWeek, item.year, item.week]);

  return (
    <Button
      appearance={selected && !locked ? 'primary' : 'subtle'}
      size="small"
      className={mergeClasses(
        styles.weekButton,
        locked && styles.lockedWeek,
        current && !selected && !locked && styles.currentWeek,
      )}
      data-iso-week={`${item.year}-W${item.week}`}
      title={`Week ${item.week} · ${item.mondayLabel}`}
      aria-label={`Week ${item.week}, ${item.year}, starts ${item.mondayLabel}${locked ? ', locked' : ''}`}
      aria-pressed={selected}
      onClick={handleClick}
    >
      {locked ? <span className={styles.lockedLabel}>{item.week}</span> : item.week}
    </Button>
  );
}

function IsoMonthWeekGroup({ group, from, to, now, locked, onSelectWeek, styles }) {
  const monthName = MONTH_LABELS[group.month];
  const label = group.monthYear === group.weeks[0].year
    ? monthName
    : `${monthName} ${group.monthYear}`;

  return (
    <div>
      <div className={styles.monthLabel}>{label}</div>
      <div className={styles.weeks}>
        {group.weeks.map((item) => (
          <IsoWeekButton
            key={`${item.year}-W${item.week}`}
            item={item}
            selected={compareIsoWeekParts(item, from) >= 0 && compareIsoWeekParts(item, to) <= 0}
            current={compareIsoWeekParts(item, now) === 0}
            locked={Boolean(locked && compareIsoWeekParts(item, locked) === 0)}
            onSelectWeek={onSelectWeek}
            styles={styles}
          />
        ))}
      </div>
    </div>
  );
}

function IsoYearBlock({ year, from, to, now, locked, onSelectWeek, styles }) {
  const groups = useMemo(
    () => groupIsoWeeksByMonth(buildIsoYearWeeks(year)),
    [year],
  );
  return (
    <div data-iso-year={year}>
      <div className={styles.yearLabel}>{year}</div>
      {groups.map((group) => (
        <IsoMonthWeekGroup
          key={`${year}-${group.monthYear}-${group.month}`}
          group={group}
          from={from}
          to={to}
          now={now}
          locked={locked}
          onSelectWeek={onSelectWeek}
          styles={styles}
        />
      ))}
    </div>
  );
}

function RccpIsoWeekCalendarGrid({
  yearSpan, from, to, now, locked, onSelectWeek, listHeight, onListHeightChange, focusWeek, scrollYear,
}) {
  const styles = useStyles();
  const listRef = useRef(null);
  const years = useMemo(() => {
    const start = Number(yearSpan?.fromYear);
    const end = Number(yearSpan?.toYear);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [yearSpan?.fromYear, yearSpan?.toYear]);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return undefined;
    const target = scrollYear != null
      ? root.querySelector(`[data-iso-year="${scrollYear}"]`)
      : (focusWeek
        ? root.querySelector(`[data-iso-week="${focusWeek.year}-W${focusWeek.week}"]`)
        : null);
    if (!target) return undefined;
    const block = scrollYear != null ? 'start' : 'center';
    const scroll = () => target.scrollIntoView({ block, inline: 'nearest' });
    const frame = requestAnimationFrame(scroll);
    const timer = window.setTimeout(scroll, 50);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [scrollYear, focusWeek?.year, focusWeek?.week, listHeight, yearSpan?.fromYear, yearSpan?.toYear]);

  return (
    <div className={styles.wrap}>
      <div
        ref={listRef}
        className={styles.list}
        style={{ height: `${listHeight}px` }}
        role="list"
        aria-label={`ISO weeks ${years[0] || ''} to ${years[years.length - 1] || ''}`}
      >
        {years.map((year) => (
          <IsoYearBlock
            key={year}
            year={year}
            from={from}
            to={to}
            now={now}
            locked={locked}
            onSelectWeek={onSelectWeek}
            styles={styles}
          />
        ))}
      </div>
      <ListResizeHandle height={listHeight} onResize={onListHeightChange} styles={styles} />
    </div>
  );
}

export default memo(RccpIsoWeekCalendarGrid);

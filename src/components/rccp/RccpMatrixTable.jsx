import React, { memo, useCallback, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow,
  Text, Switch, makeStyles, mergeClasses, tokens, shorthands,
} from '@fluentui/react-components';
import {
  buildMatrixPeriodHeaders,
  formatMatrixCellValue,
  formatMatrixPeriodAria,
  formatMatrixQty,
  matrixPeriodToken,
  RCCP_CAPACITY_MEASURE_KEY,
  RCCP_OVERCAPACITY_MEASURE_KEY,
  RCCP_ROW_LABEL_WIDTH,
  RCCP_WEEK_COL_WIDTH,
  statusToken,
} from './rccpUtils';
import { isCurrentMatrixPeriod } from './rccpPoStack';
import { rccpPlanningDateModeList } from './rccpPeriodGrain';
import {
  isRccpLoadDateRow,
  rccpMatrixCellAriaValue,
  rccpMatrixCellFontSize,
  rccpMatrixCellLength,
  rccpMatrixCellParts,
} from './rccpMatrixLoadDateCells';

const useStyles = makeStyles({
  wrapper: {
    boxShadow: `0 0 0 1px ${tokens.colorNeutralStroke2}`,
    borderRadius: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
    overflow: 'visible',
    width: '100%',
    boxSizing: 'border-box',
  },
  table: {
    tableLayout: 'fixed',
    width: 'max-content',
    borderCollapse: 'separate',
    borderSpacing: 0,
    boxSizing: 'border-box',
  },
  sticky: {
    position: 'sticky',
    left: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    zIndex: 1,
    boxSizing: 'border-box',
    width: `${RCCP_ROW_LABEL_WIDTH}px`,
    minWidth: `${RCCP_ROW_LABEL_WIDTH}px`,
    maxWidth: `${RCCP_ROW_LABEL_WIDTH}px`,
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.padding('4px', '8px'),
    textAlign: 'left',
    verticalAlign: 'middle',
  },
  bodySticky: {
    ...shorthands.padding('1px', '8px'),
    height: '22px',
    maxHeight: '22px',
  },
  headerSticky: {
    backgroundColor: tokens.colorNeutralBackground2,
    zIndex: 3,
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase300,
  },
  weekCol: {
    width: `${RCCP_WEEK_COL_WIDTH}px`,
    minWidth: `${RCCP_WEEK_COL_WIDTH}px`,
    maxWidth: `${RCCP_WEEK_COL_WIDTH}px`,
    boxSizing: 'border-box',
    ...shorthands.padding('4px', '2px'),
    textAlign: 'center',
    verticalAlign: 'middle',
    ...shorthands.borderRight('1px', 'solid', tokens.colorNeutralStroke2),
    ...shorthands.borderBottom('1px', 'solid', tokens.colorNeutralStroke2),
  },
  bodyWeekCol: {
    ...shorthands.padding('1px', '2px'),
    height: '22px',
    maxHeight: '22px',
  },
  bodyWeekColTall: { height: 'auto', maxHeight: 'none' },
  weekHeader: {
    backgroundColor: tokens.colorNeutralBackground2,
    fontWeight: tokens.fontWeightRegular,
    fontSize: tokens.fontSizeBase300,
  },
  weekColInner: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1.2,
  },
  yearHeader: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
    minHeight: '14px',
    lineHeight: '14px',
  },
  weekHeaderLabel: { fontWeight: tokens.fontWeightSemibold },
  mondayHeader: { fontSize: tokens.fontSizeBase100, color: tokens.colorNeutralForeground3 },
  rowLabel: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalSNudge),
    minWidth: 0,
  },
  rowName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  switchWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    transform: 'scale(0.7)',
    transformOrigin: 'center left',
    marginRight: '-10px',
  },
  qty: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  },
  qtyMuted: { color: tokens.colorNeutralForegroundDisabled },
  // Beide leverdatums: requested linksboven, confirmed rechtsonder — zo blijft de oorspronkelijke
  // lettergrootte leesbaar zonder dat de twee getallen elkaar in de weg zitten.
  dualStack: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    lineHeight: 1.05,
  },
  dualFirst: { textAlign: 'left' },
  dualSecond: { textAlign: 'right' },
  marker: {
    fontSize: '0.7em',
    fontWeight: tokens.fontWeightRegular,
    verticalAlign: 'super',
    lineHeight: 0,
    marginLeft: '1px',
  },
  cellInteractive: { cursor: 'pointer' },
  highlightCell: {
    boxShadow: `inset 0 0 0 2px ${tokens.colorBrandStroke1}`,
  },
  currentHeader: {
    backgroundColor: tokens.colorBrandBackground2,
    boxShadow: `inset 0 -3px 0 0 ${tokens.colorBrandStroke1}`,
  },
  bodyRow: {
    ':hover td:first-child': { backgroundColor: tokens.colorNeutralBackground1Hover },
  },
});

function MatrixVisibilitySwitch({ styles, measureKey, label, checked, onToggle }) {
  const handleChange = useCallback((_, data) => {
    onToggle(measureKey, Boolean(data.checked));
  }, [measureKey, onToggle]);
  return (
    <span className={styles.switchWrap}>
      <Switch
        checked={Boolean(checked)}
        onChange={handleChange}
        size="small"
        aria-label={`Show ${label} in chart`}
      />
    </span>
  );
}

function MatrixQuantity({ styles, part, muted, className }) {
  return (
    <span
      className={mergeClasses(styles.qty, muted && styles.qtyMuted, className)}
      style={{ fontSize: `${rccpMatrixCellFontSize(rccpMatrixCellLength([part]))}px` }}
    >
      {part.text}
      <span className={styles.marker}>{part.marker}</span>
    </span>
  );
}

/**
 * Quantity with its load-date superscript. With both load dates on, requested sits top-left and
 * confirmed bottom-right so both keep their normal size.
 */
function MatrixLoadDateValue({ styles, parts, muted }) {
  if (!parts.length) return null;
  if (parts.length === 1) {
    return <MatrixQuantity styles={styles} part={parts[0]} muted={muted} />;
  }
  return (
    <span className={styles.dualStack}>
      {parts.map((part, index) => (
        <MatrixQuantity
          key={part.mode}
          styles={styles}
          part={part}
          muted={muted}
          className={index === 0 ? styles.dualFirst : styles.dualSecond}
        />
      ))}
    </span>
  );
}

function RccpMatrixTable({
  measureRows,
  periods,
  cellMap,
  cellMapSecondary = null,
  planningDateModes = null,
  visibleKeys,
  onToggleVisible,
  onCellClick,
  interactive,
  gridWidth,
  kpiHighlight = null,
  colorFillEnabled = true,
}) {
  const styles = useStyles();
  const isInteractive = interactive ?? Boolean(onCellClick);
  const [primaryMode, secondaryMode] = useMemo(
    () => rccpPlanningDateModeList(planningDateModes),
    [planningDateModes],
  );
  const highlightWeeks = useMemo(() => new Set(kpiHighlight?.weeks || []), [kpiHighlight]);
  const highlightMeasures = useMemo(() => new Set(kpiHighlight?.measureKeys || []), [kpiHighlight]);
  const periodHeaders = useMemo(() => buildMatrixPeriodHeaders(periods), [periods]);
  const showYearRow = useMemo(
    () => periodHeaders.some((period) => period.yearLabel),
    [periodHeaders],
  );

  const handleClick = useCallback((cell) => {
    if (cell && onCellClick) onCellClick(cell);
  }, [onCellClick]);

  if (!measureRows.length || !periodHeaders.length) {
    return <Text>No matrix data for the selected window.</Text>;
  }

  return (
    <div className={styles.wrapper}>
    <Table
      size="small"
      className={styles.table}
      style={{ width: gridWidth || undefined, minWidth: gridWidth || undefined }}
    >
      <TableHeader>
        <TableRow>
          <TableHeaderCell className={mergeClasses(styles.sticky, styles.headerSticky)}>Measure</TableHeaderCell>
          {periodHeaders.map((period) => (
            <TableHeaderCell
              key={period.key}
              className={mergeClasses(
                styles.weekCol,
                styles.weekHeader,
                isCurrentMatrixPeriod(period) && styles.currentHeader,
              )}
            >
              <div className={styles.weekColInner}>
                {showYearRow ? (
                  <div className={styles.yearHeader}>{period.yearLabel || '\u00a0'}</div>
                ) : null}
                <div className={styles.weekHeaderLabel}>{period.weekLabel}</div>
                <div className={styles.mondayHeader}>{period.mondayLabel}</div>
              </div>
            </TableHeaderCell>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {measureRows.map((row) => {
          const isCapacity = row.measureKey === RCCP_CAPACITY_MEASURE_KEY;
          const isOvercapacity = row.measureKey === RCCP_OVERCAPACITY_MEASURE_KEY;
          const isDerived = isCapacity || isOvercapacity;
          // Rij uitgezet met de toggle: die reeks staat ook niet in de grafiek, dus toont de
          // matrix er geen waarden (en geen kleurvlak) voor.
          const rowHidden = visibleKeys ? visibleKeys[row.measureKey] === false : false;
          return (
            <TableRow key={row.measureKey} className={styles.bodyRow}>
              <TableCell className={mergeClasses(styles.sticky, styles.bodySticky)}>
                <div className={styles.rowLabel}>
                  {onToggleVisible ? (
                    <MatrixVisibilitySwitch
                      styles={styles}
                      measureKey={row.measureKey}
                      label={row.label}
                      checked={Boolean(visibleKeys?.[row.measureKey])}
                      onToggle={onToggleVisible}
                    />
                  ) : null}
                  <span className={styles.rowName} title={row.label}>{row.label}</span>
                </div>
              </TableCell>
              {periodHeaders.map((period) => {
                const periodToken = matrixPeriodToken(period);
                const cellKey = `${row.measureKey}|${period.year}|${periodToken}`;
                const cell = cellMap.get(cellKey);
                const isLoadDateRow = isRccpLoadDateRow(row);
                const secondaryCell = (isLoadDateRow && secondaryMode)
                  ? cellMapSecondary?.get(cellKey)
                  : null;
                const parts = isLoadDateRow
                  ? rccpMatrixCellParts(
                    {
                      [primaryMode]: cell?.confirmedQty ?? 0,
                      ...(secondaryMode ? { [secondaryMode]: secondaryCell?.confirmedQty ?? 0 } : {}),
                    },
                    secondaryCell ? planningDateModes : primaryMode,
                  )
                  : [];
                const periodLabel = formatMatrixPeriodAria(period);
                const rawValue = isCapacity ? (cell?.availableQty ?? 0) : (cell?.confirmedQty ?? 0);
                const value = isLoadDateRow
                  ? Math.max(rawValue, Number(secondaryCell?.confirmedQty) || 0)
                  : rawValue;
                const statusColor = cell ? cell.statusColor : 'grey';
                const canColor = colorFillEnabled && row.isOrdered && value;
                const fill = isCapacity
                  ? (value ? tokens.colorNeutralBackground3 : undefined)
                  : (canColor
                    ? statusToken(statusColor)
                    : (value ? tokens.colorNeutralBackground3 : undefined));
                const bg = rowHidden ? undefined : fill;
                const clickable = isInteractive && !isDerived && !period.month && !rowHidden;
                const highlighted = highlightWeeks.has(period.key)
                  && highlightMeasures.has(row.measureKey);
                return (
                  <TableCell
                    key={period.key}
                    className={mergeClasses(
                      styles.weekCol,
                      styles.bodyWeekCol,
                      parts.length > 1 && styles.bodyWeekColTall,
                      clickable && styles.cellInteractive,
                      highlighted && styles.highlightCell,
                    )}
                    style={bg ? { backgroundColor: bg } : undefined}
                    {...(clickable ? {
                      role: 'button',
                      tabIndex: 0,
                      'aria-label': `${row.label}, ${periodLabel}: ${isLoadDateRow ? rccpMatrixCellAriaValue(parts) : formatMatrixQty(cell?.confirmedQty ?? 0)} of ${formatMatrixQty(cell?.availableQty ?? 0)}. Show purchase order lines.`,
                      onClick: () => handleClick(cell),
                      onKeyDown: (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleClick(cell);
                        }
                      },
                    } : {})}
                  >
                    {isLoadDateRow ? (
                      <MatrixLoadDateValue styles={styles} parts={parts} muted={rowHidden} />
                    ) : (
                      <span
                        className={mergeClasses(styles.qty, rowHidden && styles.qtyMuted)}
                        style={{
                          fontSize: `${rccpMatrixCellFontSize(
                            formatMatrixCellValue(value, isCapacity).length,
                          )}px`,
                        }}
                      >
                        {formatMatrixCellValue(value, isCapacity)}
                      </span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
    </div>
  );
}

export default memo(RccpMatrixTable);

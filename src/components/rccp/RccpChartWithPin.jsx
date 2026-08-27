import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import RccpChartMatrixPanel from './RccpChartMatrixPanel';
import RccpPoSegmentPinCard from './RccpPoSegmentPinCard';
import { RccpSegmentHoverContext } from './RccpPoStackBar';
import { overlayConfirmedHistory } from './rccpConfirmedOverlay';
import { useRccpSegmentPin } from './useRccpSegmentPin';
import { useRccpConfirmedHistory } from '../../hooks/useRccpConfirmedHistory';

/**
 * Owns pin + item-filter sync and history overlay. Panel stays at 10 props.
 */
function RccpChartWithPin({
  chart,
  measureRows,
  periods,
  cellMap,
  chartWeekRanges,
  onCellClick,
  interactive,
  visibility,
  itemFilter,
  historyScope,
}) {
  const itemNumber = itemFilter?.itemNumber || '';
  const onItemChange = itemFilter?.onChange;
  const { pin, closePin, onSegmentClick } = useRccpSegmentPin({
    itemNumber,
    onItemChange,
  });
  const [selectedDate, setSelectedDate] = useState('');
  const [showAll, setShowAll] = useState(false);
  const pinnedItem = pin?.itemNumber || '';

  const history = useRccpConfirmedHistory({
    itemNumber: pinnedItem,
    vendorAccount: historyScope?.vendorAccount || '',
    window: historyScope?.window,
    enabled: Boolean(pinnedItem),
  });

  useEffect(() => {
    setSelectedDate('');
    setShowAll(false);
  }, [pinnedItem]);

  const overlayChart = useMemo(() => overlayConfirmedHistory(chart, {
    itemNumber: pinnedItem,
    selectedDate,
    versions: history.versions,
    showAll,
  }), [chart, pinnedItem, selectedDate, history.versions, showAll]);

  const hoverValue = useMemo(() => ({ onClick: onSegmentClick }), [onSegmentClick]);

  const handleClose = useCallback(() => {
    closePin();
    setSelectedDate('');
    setShowAll(false);
    onItemChange?.('');
  }, [closePin, onItemChange]);

  const handleSelectedDate = useCallback((value) => {
    setSelectedDate(value);
    setShowAll(false);
  }, []);

  const handleShowAll = useCallback((checked) => {
    setShowAll(Boolean(checked));
  }, []);

  return (
    <RccpSegmentHoverContext.Provider value={hoverValue}>
      <RccpChartMatrixPanel
        chart={overlayChart}
        measureRows={measureRows}
        periods={periods}
        cellMap={cellMap}
        chartWeekRanges={chartWeekRanges}
        onCellClick={onCellClick}
        interactive={interactive}
        visibility={visibility}
      />
      <RccpPoSegmentPinCard
        pin={pin}
        onClose={handleClose}
        versions={history.versions}
        selectedDate={selectedDate}
        onSelectedDateChange={handleSelectedDate}
        showAll={showAll}
        onShowAllChange={handleShowAll}
      />
    </RccpSegmentHoverContext.Provider>
  );
}

export default memo(RccpChartWithPin);

import React, { memo, useCallback, useState } from 'react';
import {
  Button, Input, Popover, PopoverSurface, PopoverTrigger, Text,
} from '@fluentui/react-components';
import {
  ArrowDownRegular, ArrowResetRegular, ArrowUpRegular,
} from '@fluentui/react-icons';
import { useRccpCapacityColumnMenuStyles } from './rccpCapacityColumnMenuStyles';

function RccpCapacityColumnMenu({
  columnKey,
  columnLabel,
  filterValue,
  sortKey,
  sortDirection,
  onSetFilter,
  onClearFilter,
  onSetSortAsc,
  onSetSortDesc,
  onClearSort,
}) {
  const styles = useRccpCapacityColumnMenuStyles();
  const [open, setOpen] = useState(false);
  const filterActive = Boolean(String(filterValue || '').trim());
  const sortActive = sortKey === columnKey && sortDirection !== 'none';

  const triggerClassName = [
    styles.trigger,
    filterActive ? styles.triggerFilterActive : '',
    !filterActive && sortActive ? styles.triggerActive : '',
  ].filter(Boolean).join(' ');

  const handleFilterChange = useCallback((event) => {
    onSetFilter(columnKey, event.target.value);
  }, [columnKey, onSetFilter]);

  const handleClearFilter = useCallback(() => {
    onClearFilter(columnKey);
  }, [columnKey, onClearFilter]);

  const handleSortAsc = useCallback(() => {
    onSetSortAsc(columnKey);
    setOpen(false);
  }, [columnKey, onSetSortAsc]);

  const handleSortDesc = useCallback(() => {
    onSetSortDesc(columnKey);
    setOpen(false);
  }, [columnKey, onSetSortDesc]);

  const handleClearSort = useCallback(() => {
    onClearSort();
    setOpen(false);
  }, [onClearSort]);

  return (
    <Popover open={open} onOpenChange={(_, data) => setOpen(data.open)} positioning="below-start">
      <PopoverTrigger disableButtonEnhancement>
        <Button
          className={triggerClassName}
          appearance="subtle"
          size="small"
          aria-label={`Sort and filter ${columnLabel}`}
          data-column-menu-trigger="true"
          data-column-menu-trigger-active={filterActive || sortActive ? 'true' : undefined}
          onMouseDown={(event) => event.stopPropagation()}
        >
          ...
        </Button>
      </PopoverTrigger>
      <PopoverSurface className={styles.surface}>
        <div className={styles.mainPane}>
          <Text className={styles.sectionTitle}>Sort</Text>
          <div className={styles.sortActions}>
            <Button className={styles.menuButton} appearance="subtle" size="small" onClick={handleSortAsc}>
              <span className={styles.menuItemContent}>
                <ArrowDownRegular />
                Sort ascending
              </span>
            </Button>
            <Button className={styles.menuButton} appearance="subtle" size="small" onClick={handleSortDesc}>
              <span className={styles.menuItemContent}>
                <ArrowUpRegular />
                Sort descending
              </span>
            </Button>
            <Button className={styles.menuButton} appearance="subtle" size="small" onClick={handleClearSort}>
              <span className={styles.menuItemContent}>
                <ArrowResetRegular />
                Clear sort
              </span>
            </Button>
          </div>

          <Text className={styles.sectionTitle}>Filter</Text>
          <div className={styles.filterBlock}>
            <Input
              className={styles.filterValueField}
              size="small"
              value={filterValue || ''}
              placeholder="Contains..."
              onChange={handleFilterChange}
              aria-label={`Filter ${columnLabel}`}
            />
            <Button appearance="subtle" size="small" disabled={!filterActive} onClick={handleClearFilter}>
              Clear filter
            </Button>
          </div>
        </div>
      </PopoverSurface>
    </Popover>
  );
}

export default memo(RccpCapacityColumnMenu);

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Menu,
  MenuItem,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ArrowSyncRegular, ChevronRightRegular } from '@fluentui/react-icons';
import PurchaseOrderViewStateDiffCard from './PurchaseOrderViewStateDiffCard';

const HIDE_DELAY_MS = 180;

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: tokens.spacingHorizontalS,
  },
  label: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
    minWidth: 0,
  },
  chevron: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
    flexShrink: 0,
    padding: '0',
    ...shorthands.border('0'),
    backgroundColor: 'transparent',
    color: tokens.colorNeutralForeground3,
    cursor: 'default',
    lineHeight: 0,
  },
  popover: {
    ...shorthands.padding('0'),
    ...shorthands.border('0'),
    backgroundColor: 'transparent',
    boxShadow: 'none',
  },
});

/**
 * "Update current view" with a trailing chevron. Diff is computed only on chevron hover.
 */
export default function PurchaseOrderUpdateCurrentViewItem({
  getUnsavedViewDiff,
  onClick,
}) {
  const styles = useStyles();
  const [hover, setHover] = useState(null);
  const hideTimerRef = useRef(null);

  const clearHide = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHide();
    hideTimerRef.current = setTimeout(() => setHover(null), HIDE_DELAY_MS);
  }, [clearHide]);

  useEffect(() => () => clearHide(), [clearHide]);

  const handleChevronEnter = useCallback(() => {
    if (typeof getUnsavedViewDiff !== 'function') return;
    clearHide();
    setHover({
      diff: getUnsavedViewDiff({ maxRows: 250 }) || { rows: [], moreCount: 0 },
    });
  }, [clearHide, getUnsavedViewDiff]);

  const handleChevronLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const handleCardEnter = useCallback(() => {
    clearHide();
  }, [clearHide]);

  const ignoreChevronClick = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleSubmenuOpenChange = useCallback((_, data) => {
    if (!data.open) scheduleHide();
  }, [scheduleHide]);

  return (
    <MenuItem icon={<ArrowSyncRegular />} onClick={onClick}>
      <span className={styles.row}>
        <span className={styles.label}>Update current view</span>
        <Menu
          open={Boolean(hover)}
          onOpenChange={handleSubmenuOpenChange}
          positioning="after"
          persistOnItemClick
        >
          <MenuTrigger disableButtonEnhancement>
            <button
              type="button"
              className={styles.chevron}
              aria-label="Show unsaved view changes"
              onMouseEnter={handleChevronEnter}
              onMouseLeave={handleChevronLeave}
              onClick={ignoreChevronClick}
              onMouseDown={ignoreChevronClick}
            >
              <ChevronRightRegular />
            </button>
          </MenuTrigger>
          <MenuPopover
            className={styles.popover}
            onMouseEnter={handleCardEnter}
            onMouseLeave={handleChevronLeave}
          >
            {hover ? (
              <PurchaseOrderViewStateDiffCard
                rows={hover.diff.rows}
                onMouseEnter={handleCardEnter}
                onMouseLeave={handleChevronLeave}
              />
            ) : null}
          </MenuPopover>
        </Menu>
      </span>
    </MenuItem>
  );
}

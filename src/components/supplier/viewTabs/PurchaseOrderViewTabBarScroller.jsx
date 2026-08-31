import React from 'react';
import {
  Button,
  makeStyles,
  mergeClasses,
  tokens,
} from '@fluentui/react-components';
import { ChevronLeft20Regular, ChevronRight20Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  row: {
    display: 'flex',
    alignItems: 'flex-end',
    minWidth: 0,
    flex: 1,
  },
  scrollerWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'flex-end',
    minWidth: 0,
    flex: 1,
  },
  scroller: {
    display: 'flex',
    alignItems: 'flex-end',
    minWidth: 0,
    flex: 1,
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingTop: tokens.spacingVerticalXS,
    userSelect: 'none',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
    '::-webkit-scrollbar': {
      display: 'none',
      height: 0,
      width: 0,
    },
  },
  scrollerGrab: {
    cursor: 'grab',
  },
  scrollerDragging: {
    cursor: 'grabbing',
    '& *': {
      cursor: 'grabbing',
    },
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '36px',
    pointerEvents: 'none',
    zIndex: 1,
  },
  fadeLeft: {
    left: 0,
    backgroundImage: `linear-gradient(to right, ${tokens.colorNeutralBackground1} 35%, transparent)`,
  },
  fadeRight: {
    right: 0,
    backgroundImage: `linear-gradient(to left, ${tokens.colorNeutralBackground1} 35%, transparent)`,
  },
  chevron: {
    minWidth: '20px',
    padding: 0,
    flexShrink: 0,
    alignSelf: 'center',
    color: tokens.colorNeutralForeground2,
  },
  chevronLeft: {
    marginLeft: `calc(-1 * ${tokens.spacingHorizontalM})`,
    marginRight: tokens.spacingHorizontalXXS,
  },
  chevronRight: {
    marginRight: `calc(-1 * ${tokens.spacingHorizontalM})`,
    marginLeft: tokens.spacingHorizontalXXS,
  },
});

/**
 * Horizontally scrollable tab strip with fade edges and chevrons when content overflows.
 */
export default function PurchaseOrderViewTabBarScroller({
  overflow,
  isDragging,
  canScrollLeft,
  canScrollRight,
  scrollerRef,
  onScrollLeft,
  onScrollRight,
  children,
}) {
  const styles = useStyles();

  return (
    <div className={styles.row}>
      {canScrollLeft ? (
        <Button
          appearance="transparent"
          size="small"
          icon={<ChevronLeft20Regular />}
          aria-label="Scroll tabs left"
          className={mergeClasses(styles.chevron, styles.chevronLeft)}
          onClick={onScrollLeft}
        />
      ) : null}
      <div className={styles.scrollerWrap}>
        {canScrollLeft ? <div className={mergeClasses(styles.fade, styles.fadeLeft)} aria-hidden /> : null}
        <div
          className={mergeClasses(
            styles.scroller,
            overflow && styles.scrollerGrab,
            isDragging && styles.scrollerDragging,
          )}
          ref={scrollerRef}
        >
          {children}
        </div>
        {canScrollRight ? <div className={mergeClasses(styles.fade, styles.fadeRight)} aria-hidden /> : null}
      </div>
      {canScrollRight ? (
        <Button
          appearance="transparent"
          size="small"
          icon={<ChevronRight20Regular />}
          aria-label="Scroll tabs right"
          className={mergeClasses(styles.chevron, styles.chevronRight)}
          onClick={onScrollRight}
        />
      ) : null}
    </div>
  );
}

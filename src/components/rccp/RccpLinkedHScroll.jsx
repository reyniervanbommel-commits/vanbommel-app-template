import React, { memo, useCallback, useRef } from 'react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { applySyncedScrollLeft } from './rccpSyncedScroll';

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    minWidth: 0,
    overflow: 'visible',
  },
  pane: {
    width: '100%',
    overflowX: 'auto',
    overflowY: 'hidden',
    flexShrink: 0,
    scrollbarWidth: 'none',
    '::-webkit-scrollbar': { display: 'none', height: 0 },
  },
  inner: { boxSizing: 'border-box' },
  scrollbar: {
    width: '100%',
    height: '8px',
    overflowX: 'auto',
    overflowY: 'hidden',
    flexShrink: 0,
    scrollbarWidth: 'thin',
    scrollbarColor: `${tokens.colorNeutralStrokeAccessible} ${tokens.colorNeutralBackground3}`,
    '::-webkit-scrollbar': { height: '5px' },
    '::-webkit-scrollbar-thumb': {
      backgroundColor: tokens.colorNeutralStrokeAccessible,
      ...shorthands.borderRadius(tokens.borderRadiusMedium),
    },
    '::-webkit-scrollbar-track': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
    '::-webkit-scrollbar-button': { display: 'none', width: 0, height: 0 },
  },
  spacer: { height: '1px', pointerEvents: 'none' },
  // Buiten de scroll-panes: blijft gecentreerd op de zichtbare breedte, scrollt niet mee.
  middle: { width: '100%', flexShrink: 0 },
});

function RccpLinkedHScroll({ contentWidth, top, middle = null, bottom }) {
  const styles = useStyles();
  const topRef = useRef(null);
  const barRef = useRef(null);
  const bottomRef = useRef(null);

  const handleScroll = useCallback((event) => {
    applySyncedScrollLeft(
      [topRef.current, barRef.current, bottomRef.current],
      event.currentTarget,
      event.currentTarget.scrollLeft,
    );
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.pane} ref={topRef} onScroll={handleScroll}>
        <div className={styles.inner} style={{ width: contentWidth, minWidth: contentWidth }}>{top}</div>
      </div>
      {middle ? <div className={styles.middle}>{middle}</div> : null}
      <div
        className={styles.scrollbar}
        ref={barRef}
        onScroll={handleScroll}
        aria-label="Scroll weeks"
      >
        <div className={styles.spacer} style={{ width: contentWidth }} />
      </div>
      <div className={styles.pane} ref={bottomRef} onScroll={handleScroll}>
        <div className={styles.inner} style={{ width: contentWidth, minWidth: contentWidth }}>{bottom}</div>
      </div>
    </div>
  );
}

export default memo(RccpLinkedHScroll);

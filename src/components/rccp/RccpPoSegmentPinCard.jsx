import React, { memo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  card: {
    position: 'fixed',
    zIndex: 2000000,
    pointerEvents: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    boxShadow: tokens.shadow8,
  },
});

/**
 * Interactive pin overlay shell. Empty body; Escape and click-outside call onClose.
 */
function RccpPoSegmentPinCard({ pin, onClose }) {
  const styles = useStyles();
  const boxRef = useRef(null);

  const handleKey = useCallback((event) => {
    if (event.key === 'Escape') onClose?.();
  }, [onClose]);

  const handlePointerDown = useCallback((event) => {
    if (!boxRef.current?.contains(event.target)) onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!pin) return undefined;
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [pin, handleKey, handlePointerDown]);

  if (!pin || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={boxRef}
      className={styles.card}
      style={{
        left: pin.x,
        top: pin.y,
        pointerEvents: 'auto',
      }}
      role="dialog"
      aria-label="Segment details"
    />,
    document.body,
  );
}

export default memo(RccpPoSegmentPinCard);

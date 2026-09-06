import React, { memo, useCallback, useState } from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

// Alleen zichtbaar bij hover/focus/drag: een onopvallende lijn tussen de RCCP-grafiek en de
// matrix, die verschijnt zodra de gebruiker met de muis in de buurt komt.
const useStyles = makeStyles({
  wrapper: {
    position: 'relative',
    height: '10px',
    marginTop: '-2px',
    marginBottom: '-2px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'ns-resize',
    touchAction: 'none',
    zIndex: 2,
  },
  line: {
    width: '100%',
    height: '3px',
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'transparent',
    transition: 'background-color 0.12s ease-out',
  },
  lineVisible: {
    backgroundColor: tokens.colorNeutralStroke2,
  },
  lineDragging: {
    backgroundColor: tokens.colorBrandStroke1,
  },
});

function RccpChartResizeHandle({ height, onResize }) {
  const styles = useStyles();
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [focused, setFocused] = useState(false);

  const handlePointerDown = useCallback((event) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = height;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    setDragging(true);

    const handleMove = (moveEvent) => {
      // Naar onder slepen geeft de grafiek meer hoogte, naar boven minder.
      onResize(startHeight + (moveEvent.clientY - startY));
    };
    const handleUp = () => {
      setDragging(false);
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
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
      onResize(height + 16);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      onResize(height - 16);
    }
  }, [height, onResize]);

  const visible = hovering || dragging || focused;

  return (
    <div
      className={styles.wrapper}
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize chart height"
      aria-valuenow={height}
      tabIndex={0}
      title="Drag to resize the chart"
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    >
      <div
        className={mergeClasses(
          styles.line,
          visible && styles.lineVisible,
          dragging && styles.lineDragging,
        )}
      />
    </div>
  );
}

export default memo(RccpChartResizeHandle);

import React from 'react';
import { makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  dot: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    backgroundColor: tokens.colorPaletteMarigoldBackground3,
    boxShadow: `0 0 0 1px ${tokens.colorNeutralBackground1}`,
    flexShrink: 0,
    display: 'inline-block',
    pointerEvents: 'none',
  },
});

export default function UnsavedYellowDot({ className, testId }) {
  const styles = useStyles();
  return (
    <span
      className={mergeClasses(styles.dot, className)}
      data-testid={testId}
      aria-hidden
    />
  );
}

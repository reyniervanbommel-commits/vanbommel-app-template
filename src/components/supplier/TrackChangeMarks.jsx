import React, { memo, useMemo } from 'react';
import { tokens } from '@fluentui/react-components';

/**
 * TrackChangeMarks — pure weergave van maximaal vijf "track changes"-stippen onderin een cel.
 *
 * Eén wrapper-div met per bucket een gekleurde stip. Geen Tooltip (deze cel wordt
 * vaak herhaald); toegankelijkheid via title + aria-label als niet-kleur-cue.
 *
 * @param {{ pattern?: string, mode?: string }} props - pattern = 5-tekenstring van r/g/y.
 */
const COLOR_BY_MARK = {
  r: tokens.colorPaletteRedBackground3,
  y: tokens.colorPaletteYellowBackground3,
  g: tokens.colorNeutralBackground5,
};

const DOT_SIZE = 8;

function TrackChangeMarks({ pattern, mode }) {
  const marks = typeof pattern === 'string' && pattern.length > 0 ? pattern.split('') : null;

  const label = useMemo(() => {
    if (!marks) return '';
    const bucket = mode === 'week' ? 'week' : 'session';
    const changed = marks.filter((m) => m === 'r').length;
    return changed > 0
      ? `Changed in ${changed} recent ${bucket}${changed === 1 ? '' : 's'}`
      : `No recent changes per ${bucket}`;
  }, [marks, mode]);

  if (!marks) return null;

  return (
    <div
      aria-label={label}
      title={label}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '1px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '3px',
        pointerEvents: 'none',
      }}
    >
      {marks.map((mark, i) => (
        <span
          key={i}
          style={{
            width: `${DOT_SIZE}px`,
            height: `${DOT_SIZE}px`,
            borderRadius: '50%',
            backgroundColor: COLOR_BY_MARK[mark] || COLOR_BY_MARK.g,
          }}
        />
      ))}
    </div>
  );
}

export default memo(TrackChangeMarks);

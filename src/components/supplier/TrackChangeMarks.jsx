import React, { memo, useMemo } from 'react';
import { tokens } from '@fluentui/react-components';

/**
 * TrackChangeMarks — pure weergave van maximaal vijf "track changes"-streepjes onderin een cel.
 *
 * Eén DOM-node: een div met een linear-gradient van vijf segmenten. Geen Tooltip (deze cel wordt
 * vaak herhaald); toegankelijkheid via title + aria-label als niet-kleur-cue.
 *
 * @param {{ pattern?: string, mode?: string }} props - pattern = 5-tekenstring van r/g/y.
 */
const COLOR_BY_MARK = {
  r: tokens.colorPaletteRedBackground3,
  y: tokens.colorPaletteYellowBackground3,
  g: tokens.colorNeutralBackground5,
};

const LABEL_BY_MARK = { r: 'gewijzigd', y: 'geen wijziging', g: 'geen wijziging' };

function TrackChangeMarks({ pattern, mode }) {
  const marks = typeof pattern === 'string' && pattern.length > 0 ? pattern.split('') : null;

  const gradient = useMemo(() => {
    if (!marks) return null;
    const step = 100 / marks.length;
    const stops = marks.map((mark, i) => {
      const color = COLOR_BY_MARK[mark] || COLOR_BY_MARK.g;
      const from = (step * i).toFixed(3);
      const to = (step * (i + 1)).toFixed(3);
      return `${color} ${from}%, ${color} ${to}%`;
    });
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, [marks]);

  const label = useMemo(() => {
    if (!marks) return '';
    const bucket = mode === 'week' ? 'week' : 'sessie';
    const changed = marks.filter((m) => m === 'r').length;
    return changed > 0
      ? `Gewijzigd in ${changed} recente ${bucket}${changed === 1 ? '' : 's'}`
      : `Geen recente wijzigingen per ${bucket}`;
  }, [marks, mode]);

  if (!gradient) return null;

  return (
    <div
      aria-label={label}
      title={label}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: '3px',
        backgroundImage: gradient,
        pointerEvents: 'none',
      }}
    />
  );
}

export default memo(TrackChangeMarks);

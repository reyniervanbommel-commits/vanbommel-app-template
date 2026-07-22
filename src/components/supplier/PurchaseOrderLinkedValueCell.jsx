import React, { memo } from 'react';
import { Badge, Tooltip, makeStyles } from '@fluentui/react-components';
import { FORMATTED_CELL_TEXT_COLOR } from './columnTextStyleUtils';

const useStyles = makeStyles({
  root: {
    display: 'inline-flex',
    alignItems: 'center',
    columnGap: '6px',
    maxWidth: '100%',
  },
  firstValue: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

/**
 * Toont de eerste unieke waarde van een "Push values to header column"-koppeling met een
 * "+N"-badge zodra er meer unieke regelwaarden zijn — zelfde patroon als de "+N"-badge bij
 * de productafbeelding-kolom. Hover op de badge toont de volledige, kant-en-klare lijst.
 */
function PurchaseOrderLinkedValueCell({
  firstValue = '-',
  additionalCount = 0,
  allValuesLabel = '-',
  isConditionalFormat = false,
}) {
  const styles = useStyles();
  const textStyle = isConditionalFormat ? { color: FORMATTED_CELL_TEXT_COLOR } : undefined;

  if (additionalCount <= 0) {
    return <span style={textStyle}>{firstValue}</span>;
  }

  return (
    <Tooltip content={allValuesLabel} relationship="description" positioning="above">
      <span className={styles.root}>
        <span className={styles.firstValue} style={textStyle}>{firstValue}</span>
        <Badge
          appearance="tint"
          color="informative"
          size="small"
          aria-label={`${additionalCount} additional unique values`}
        >
          +{additionalCount}
        </Badge>
      </span>
    </Tooltip>
  );
}

export default memo(PurchaseOrderLinkedValueCell);

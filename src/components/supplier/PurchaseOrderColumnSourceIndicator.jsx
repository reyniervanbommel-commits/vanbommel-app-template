import React, { memo } from 'react';
import { Tooltip, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import {
  ArrowUploadRegular,
  BoxRegular,
  BuildingRegular,
  EditRegular,
  LinkRegular,
  TextBulletListLtrRegular,
} from '@fluentui/react-icons';
import D365LogoIcon from './D365LogoIcon';
import { formatColumnClusterTooltip, getColumnConnectionTooltip } from '../../utils/columnOriginMeta';

const useStyles = makeStyles({
  wrap: {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    ...shorthands.gap('4px'),
  },
  icon: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase300,
    width: '16px',
    minWidth: '16px',
    lineHeight: 1,
    flexShrink: 0,
  },
  iconHit: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '16px',
    minWidth: '16px',
    height: '16px',
    lineHeight: 1,
    flexShrink: 0,
  },
  formulaIcon: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    width: '16px',
    minWidth: '16px',
    lineHeight: 1,
    textAlign: 'center',
    flexShrink: 0,
  },
  tooltipBody: {
    whiteSpace: 'pre-line',
  },
});

function renderSourceGlyph(sourceKey, styles) {
  switch (sourceKey) {
    case 'purchase-orders':
    case 'd365':
      return <D365LogoIcon alt="" />;
    case 'vendors':
      return <BuildingRegular className={styles.icon} />;
    case 'items':
      return <BoxRegular className={styles.icon} />;
    case 'lines':
    case 'receipt-lines':
      return <TextBulletListLtrRegular className={styles.icon} />;
    case 'excel':
      return <ArrowUploadRegular className={styles.icon} />;
    case 'formula':
      return <span className={styles.formulaIcon} aria-hidden>fx</span>;
    case 'user':
    default:
      return <EditRegular className={styles.icon} />;
  }
}

function PurchaseOrderColumnSourceIndicator({
  sourceMeta,
  columnLevel = 'header',
  connectionTargets = [],
}) {
  const styles = useStyles();
  const sourceKey = sourceMeta?.key || 'user';
  const originLabel = sourceMeta?.label || 'Custom';
  const normalizedTargets = Array.isArray(connectionTargets)
    ? connectionTargets.filter((target) => String(target || '').trim())
    : [];
  const hasConnections = normalizedTargets.length > 0;
  const connectionTooltip = getColumnConnectionTooltip(
    { level: columnLevel },
    normalizedTargets
  );
  const clusterTooltip = formatColumnClusterTooltip(originLabel, connectionTooltip);

  return (
    <Tooltip
      content={<span className={styles.tooltipBody}>{clusterTooltip}</span>}
      relationship="label"
    >
      <span className={styles.wrap} data-testid="column-source-cluster" data-tooltip={clusterTooltip}>
        <span className={styles.iconHit} data-testid="column-source-icon">
          {renderSourceGlyph(sourceKey, styles)}
        </span>
        {hasConnections ? (
          <span className={styles.iconHit} data-testid="column-connection-icon" aria-hidden>
            <LinkRegular className={styles.icon} />
          </span>
        ) : null}
      </span>
    </Tooltip>
  );
}

export default memo(PurchaseOrderColumnSourceIndicator);

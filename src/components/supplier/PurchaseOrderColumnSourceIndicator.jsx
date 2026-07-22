import React, { memo } from 'react';
import { Tooltip, makeStyles, tokens } from '@fluentui/react-components';
import { EditRegular, LinkRegular } from '@fluentui/react-icons';
import D365LogoIcon from './D365LogoIcon';

const useStyles = makeStyles({
  wrap: {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  icon: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase300,
    width: '16px',
    minWidth: '16px',
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
  connectionButton: {
    minWidth: '16px',
    width: '16px',
    height: '16px',
    padding: 0,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.colorBrandForeground1,
  },
});

function PurchaseOrderColumnSourceIndicator({
  sourceMeta,
  connectionTargets = [],
  connectionsExpanded = false,
  onToggleConnections,
}) {
  const styles = useStyles();
  const sourceKey = sourceMeta?.key || 'user';
  const normalizedTargets = Array.isArray(connectionTargets)
    ? connectionTargets.filter((target) => String(target || '').trim())
    : [];
  const hasExpandableConnections = sourceKey === 'connected' && normalizedTargets.length > 0;

  const renderIcon = () => {
    switch (sourceKey) {
      case 'd365':
        return <D365LogoIcon alt="" />;
      case 'connected':
        return <LinkRegular className={styles.icon} />;
      case 'formula':
        return <span className={styles.formulaIcon} aria-hidden>fx</span>;
      case 'user':
      default:
        return <EditRegular className={styles.icon} />;
    }
  };

  const icon = (
    <Tooltip content={sourceMeta?.label || 'Custom'} relationship="label">
      {renderIcon()}
    </Tooltip>
  );

  if (!hasExpandableConnections) {
    return <span className={styles.wrap}>{icon}</span>;
  }

  return (
    <span className={styles.wrap}>
      <Tooltip content={connectionsExpanded ? 'Hide connected columns' : 'Show connected columns'} relationship="label">
        <button
          type="button"
          className={styles.connectionButton}
          aria-label={connectionsExpanded ? 'Hide connected columns' : 'Show connected columns'}
          aria-expanded={connectionsExpanded}
          onClick={onToggleConnections}
        >
          <LinkRegular className={styles.icon} />
        </button>
      </Tooltip>
    </span>
  );
}

export default memo(PurchaseOrderColumnSourceIndicator);

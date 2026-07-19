import React, { useCallback, useState } from 'react';
import { mergeClasses, Text } from '@fluentui/react-components';
import { CheckmarkRegular, LinkRegular, LockClosedRegular } from '@fluentui/react-icons';
import PurchaseOrderColumnFilterMenuButton from './PurchaseOrderColumnFilterMenuButton';
import { renderColumnTypeIcon } from './purchaseOrderColumnFilterMenuMainPaneUtils';

export default function PurchaseOrderColumnFilterMenuTitleRow({
  styles,
  columnLabel,
  columnTypeMeta,
  connectionTargets = [],
  canRenameColumn,
  handleRenameColumn,
  showWritebackLocked = false,
  closeSubmenu,
}) {
  const resolvedTypeMeta = columnTypeMeta || { key: 'text', label: 'Text' };
  const normalizedConnectionTargets = Array.isArray(connectionTargets)
    ? connectionTargets.filter((target) => String(target || '').trim())
    : [];
  const [connectionsExpanded, setConnectionsExpanded] = useState(false);

  const toggleConnections = useCallback(() => {
    setConnectionsExpanded((prev) => !prev);
  }, []);

  return (
    <>
      <div className={styles.titleRow}>
        <span className={styles.titleLabelWrap}>
          {canRenameColumn ? (
            <PurchaseOrderColumnFilterMenuButton
              className={styles.titleLabelButton}
              appearance="transparent"
              size="small"
              closeSubmenu={closeSubmenu}
              onClick={handleRenameColumn}
              aria-label={`Rename column ${columnLabel}`}
            >
              <Text className={styles.fieldTitle}>{columnLabel}</Text>
            </PurchaseOrderColumnFilterMenuButton>
          ) : (
            <Text className={styles.fieldTitle}>{columnLabel}</Text>
          )}
          {showWritebackLocked ? (
            <LockClosedRegular className={styles.titleLockIcon} aria-label="Write-back not available" />
          ) : null}
        </span>
        <span className={styles.typeMeta}>
          <span className={styles.typeIcon} aria-hidden>
            {renderColumnTypeIcon(resolvedTypeMeta.key)}
          </span>
          <span className={styles.typeText} data-testid="column-type-label">{resolvedTypeMeta.label}</span>
          {normalizedConnectionTargets.length ? (
            <PurchaseOrderColumnFilterMenuButton
              className={mergeClasses(styles.typeMetaConnectionButton, connectionsExpanded && styles.typeMetaConnectionButtonActive)}
              appearance="transparent"
              size="small"
              closeSubmenu={closeSubmenu}
              icon={<LinkRegular />}
              aria-label={`Show connected columns for ${columnLabel}`}
              aria-expanded={connectionsExpanded}
              onClick={toggleConnections}
            />
          ) : null}
        </span>
      </div>
      {connectionsExpanded && normalizedConnectionTargets.length ? (
        <ul className={styles.inlineConnectionList}>
          {normalizedConnectionTargets.map((target) => <li key={target}>{target}</li>)}
        </ul>
      ) : null}
    </>
  );
}

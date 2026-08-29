import React from 'react';
import { Text } from '@fluentui/react-components';
import { LockClosedRegular } from '@fluentui/react-icons';
import PurchaseOrderColumnFilterMenuButton from './PurchaseOrderColumnFilterMenuButton';
import { renderColumnTypeIcon } from './purchaseOrderColumnFilterMenuMainPaneUtils';
import PurchaseOrderColumnSourceIndicator from './PurchaseOrderColumnSourceIndicator';

export default function PurchaseOrderColumnFilterMenuTitleRow({
  styles,
  columnLabel,
  columnTypeMeta,
  columnSourceMeta,
  columnLevel = 'header',
  connectionTargets = [],
  canRenameColumn,
  handleRenameColumn,
  showWritebackLocked = false,
  closeSubmenu,
}) {
  const resolvedTypeMeta = columnTypeMeta || { key: 'text', label: 'Text' };
  const resolvedSourceMeta = columnSourceMeta || { key: 'user', label: 'Custom' };
  const normalizedConnectionTargets = Array.isArray(connectionTargets)
    ? connectionTargets.filter((target) => String(target || '').trim())
    : [];

  return (
    <div className={styles.titleRow}>
      <span className={styles.titleLabelWrap}>
        <PurchaseOrderColumnSourceIndicator
          sourceMeta={resolvedSourceMeta}
          columnLevel={columnLevel}
          connectionTargets={normalizedConnectionTargets}
        />
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
      </span>
    </div>
  );
}

import React, { useMemo } from 'react';
import {
  ArrowDownRegular,
  ArrowResetRegular,
  ArrowUpRegular,
  TextBulletList20Regular,
} from '@fluentui/react-icons';
import PurchaseOrderColumnFilterSubmenuButton from './PurchaseOrderColumnFilterSubmenuButton';
import PurchaseOrderColumnFilterMenuButton from './PurchaseOrderColumnFilterMenuButton';
import { getSortActionLabels, menuLabel } from './purchaseOrderColumnFilterMenuMainPaneUtils';

export default function PurchaseOrderColumnFilterMenuSortSection({
  styles,
  closeSubmenu,
  activeSubmenu,
  openSubmenu,
  showGrouping,
  isDate,
  isNumber,
  setSortAsc,
  setSortDesc,
  clearSort,
}) {
  const sortLabels = useMemo(() => getSortActionLabels(isDate, isNumber), [isDate, isNumber]);

  return (
    <div className={styles.sectionBlock}>
      <div className={styles.sortActions}>
        <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={setSortAsc}>
          {menuLabel(styles, <ArrowDownRegular />, sortLabels.ascending)}
        </PurchaseOrderColumnFilterMenuButton>
        <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={setSortDesc}>
          {menuLabel(styles, <ArrowUpRegular />, sortLabels.descending)}
        </PurchaseOrderColumnFilterMenuButton>
        <PurchaseOrderColumnFilterMenuButton className={styles.sortButton} appearance="subtle" size="small" closeSubmenu={closeSubmenu} onClick={clearSort}>
          {menuLabel(styles, <ArrowResetRegular />, 'Clear sort')}
        </PurchaseOrderColumnFilterMenuButton>
      </div>
      {showGrouping ? (
        <PurchaseOrderColumnFilterSubmenuButton
          styles={styles}
          name="group"
          label="Category / group"
          icon={<TextBulletList20Regular />}
          activeSubmenu={activeSubmenu}
          onOpenSubmenu={openSubmenu}
        />
      ) : null}
    </div>
  );
}

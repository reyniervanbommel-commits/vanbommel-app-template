import React, { memo, useCallback, useState } from 'react';
import { Button, Popover, PopoverSurface, PopoverTrigger } from '@fluentui/react-components';
import { ArrowRightRegular } from '@fluentui/react-icons';
import { usePurchaseOrderColumnFilterMenuStyles } from './purchaseOrderColumnFilterMenuStyles';

function PurchaseOrderProductImageColumnMenu({
  columnKey,
  isStickyColumn = false,
  canPromoteToSticky = false,
  canUnstickSticky = false,
  stickyColumnCount = 0,
  onMakeColumnSticky,
}) {
  const styles = usePurchaseOrderColumnFilterMenuStyles();
  const [open, setOpen] = useState(false);
  const stickyActionDisabled = !canPromoteToSticky && !canUnstickSticky;
  const stickyMenuText = canUnstickSticky
    ? 'Unstick column'
    : isStickyColumn
      ? `Already sticky (${stickyColumnCount})`
      : 'Make this the next sticky column';
  const stickyLabelClassName = `${styles.menuItemContent} ${stickyActionDisabled ? styles.menuItemContentDisabled : ''}`.trim();
  const stickyIconClassName = `${styles.menuItemIcon} ${stickyActionDisabled ? styles.menuItemIconDisabled : ''}`.trim();

  const handleOpenChange = useCallback((_, data) => {
    setOpen(data.open);
  }, []);

  const handleMakeColumnSticky = useCallback(() => {
    if (stickyActionDisabled || typeof onMakeColumnSticky !== 'function') return;
    onMakeColumnSticky(columnKey);
    setOpen(false);
  }, [columnKey, onMakeColumnSticky, stickyActionDisabled]);

  return (
    <Popover open={open} onOpenChange={handleOpenChange} positioning="below-start">
      <PopoverTrigger disableButtonEnhancement>
        <Button
          className={styles.trigger}
          appearance="subtle"
          size="small"
          aria-label="Column options for Image"
          data-column-menu-trigger="true"
          draggable={false}
          onDragStart={(event) => event.preventDefault()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          ...
        </Button>
      </PopoverTrigger>
      <PopoverSurface className={styles.surface}>
        <div className={styles.mainPane}>
          <Button
            className={styles.sortButton}
            appearance="subtle"
            size="small"
            onClick={handleMakeColumnSticky}
            disabled={stickyActionDisabled}
          >
            <span className={stickyLabelClassName}>
              <span className={stickyIconClassName} aria-hidden>
                <ArrowRightRegular />
              </span>
              <span>{stickyMenuText}</span>
            </span>
          </Button>
        </div>
      </PopoverSurface>
    </Popover>
  );
}

export default memo(PurchaseOrderProductImageColumnMenu);

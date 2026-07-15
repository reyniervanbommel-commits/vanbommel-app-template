import React, { memo, useCallback } from 'react';
import { Button } from '@fluentui/react-components';

/**
 * Menu action button that closes any open flyout submenu on hover.
 */
function PurchaseOrderColumnFilterMenuButton({ closeSubmenu, onMouseEnter, ...props }) {
  const handleMouseEnter = useCallback((event) => {
    closeSubmenu?.();
    onMouseEnter?.(event);
  }, [closeSubmenu, onMouseEnter]);

  return <Button {...props} onMouseEnter={handleMouseEnter} />;
}

export default memo(PurchaseOrderColumnFilterMenuButton);

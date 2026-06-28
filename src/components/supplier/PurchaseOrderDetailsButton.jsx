import React, { useCallback } from 'react';
import { Button } from '@fluentui/react-components';

export default function PurchaseOrderDetailsButton({ order, onOpen }) {
  const handleClick = useCallback(() => {
    onOpen(order);
  }, [onOpen, order]);

  return (
    <Button size="small" appearance="subtle" onClick={handleClick}>
      Bekijk
    </Button>
  );
}


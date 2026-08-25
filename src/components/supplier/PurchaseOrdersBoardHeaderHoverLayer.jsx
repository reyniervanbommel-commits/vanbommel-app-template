import React, { memo, useEffect } from 'react';
import PurchaseOrderColumnHeaderHoverCard from './PurchaseOrderColumnHeaderHoverCard';
import { usePoBoardHeaderHover } from './usePoBoardHeaderHover';

function PurchaseOrdersBoardHeaderHoverLayer({ rowRef, disabled = false, hoverInput = {} }) {
  const headerHover = usePoBoardHeaderHover({ ...hoverInput, disabled });

  useEffect(() => {
    const row = rowRef?.current;
    if (!row) return undefined;
    const { onMouseOver, onMouseOut, onMouseDown } = headerHover;
    row.addEventListener('mouseover', onMouseOver);
    row.addEventListener('mouseout', onMouseOut);
    row.addEventListener('mousedown', onMouseDown);
    return () => {
      row.removeEventListener('mouseover', onMouseOver);
      row.removeEventListener('mouseout', onMouseOut);
      row.removeEventListener('mousedown', onMouseDown);
    };
  }, [headerHover.onMouseDown, headerHover.onMouseOut, headerHover.onMouseOver, rowRef]);

  return <PurchaseOrderColumnHeaderHoverCard hover={headerHover.hover} model={headerHover.model} />;
}

export default memo(PurchaseOrdersBoardHeaderHoverLayer);

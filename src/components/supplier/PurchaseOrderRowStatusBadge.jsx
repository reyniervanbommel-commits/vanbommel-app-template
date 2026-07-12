import React, { memo } from 'react';
import { Badge } from '@fluentui/react-components';

function PurchaseOrderRowStatusBadge({ order, className }) {
  if (order?.removedInD365) {
    return (
      <Badge className={className} color="danger" appearance="tint" size="small">
        verwijderd in D365
      </Badge>
    );
  }

  if (order?.isNew || order?.isChanged) {
    return (
      <Badge
        className={className}
        color={order.isNew ? 'success' : 'warning'}
        appearance="tint"
        size="small"
      >
        {order.isNew ? 'nieuw' : 'gewijzigd'}
      </Badge>
    );
  }

  return null;
}

export default memo(PurchaseOrderRowStatusBadge);

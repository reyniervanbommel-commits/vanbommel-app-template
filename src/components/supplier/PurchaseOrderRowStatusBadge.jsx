import React, { memo } from 'react';
import { Badge, makeStyles, mergeClasses, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  compactRoundBadge: {
    borderRadius: tokens.borderRadiusCircular,
    minWidth: '28px',
    minHeight: '18px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '6px',
    paddingRight: '6px',
    fontSize: '10px',
    lineHeight: '10px',
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'lowercase',
  },
});

function PurchaseOrderRowStatusBadge({ order, className }) {
  const styles = useStyles();
  const badgeClassName = mergeClasses(styles.compactRoundBadge, className);

  if (order?.removedInD365) {
    return (
      <Badge className={badgeClassName} color="danger" appearance="tint" size="small">
        rem
      </Badge>
    );
  }

  if (order?.isNew || order?.isChanged) {
    return (
      <Badge
        className={badgeClassName}
        color={order.isNew ? 'success' : 'warning'}
        appearance="tint"
        size="small"
      >
        {order.isNew ? 'new' : 'adj'}
      </Badge>
    );
  }

  return null;
}

export default memo(PurchaseOrderRowStatusBadge);

import React, { memo } from 'react';
import { Badge, Button, makeStyles } from '@fluentui/react-components';
import { CheckmarkRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterBadgeButton: {
    backgroundColor: 'transparent',
    border: 0,
    padding: 0,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  },
});

function PurchaseOrderChangeActivityBar({
  newCount,
  changedCount,
  markViewed,
  markingViewed,
  changedOnlyFilter,
  toggleChangedOnlyFilter,
}) {
  if (!(newCount > 0 || changedCount > 0)) return null;
  const styles = useStyles();
  return (
    <div className={styles.wrap}>
      {newCount > 0 ? <Badge color="success" appearance="filled">{newCount} nieuw</Badge> : null}
      {changedCount > 0 ? (
        <button
          type="button"
          onClick={toggleChangedOnlyFilter}
          className={styles.filterBadgeButton}
          title={changedOnlyFilter ? 'Toon alles' : 'Filter op gewijzigde regels'}
        >
          <Badge color="warning" appearance={changedOnlyFilter ? 'filled' : 'tint'}>
            {changedCount} gewijzigd
          </Badge>
        </button>
      ) : null}
      <Button
        appearance="subtle"
        size="small"
        icon={<CheckmarkRegular />}
        onClick={markViewed}
        disabled={markingViewed}
      >
        {markingViewed ? 'Bezig...' : 'Markeer als gezien'}
      </Button>
    </div>
  );
}

export default memo(PurchaseOrderChangeActivityBar);

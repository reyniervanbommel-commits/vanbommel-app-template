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
  removedCount,
  markViewed,
  markingViewed,
  canMarkViewed = true,
  activityFilter,
  toggleActivityFilter,
}) {
  if (!(newCount > 0 || changedCount > 0 || removedCount > 0)) return null;
  const styles = useStyles();
  return (
    <div className={styles.wrap}>
      {newCount > 0 ? (
        <button
          type="button"
          onClick={() => toggleActivityFilter('new')}
          className={styles.filterBadgeButton}
          title={activityFilter === 'new' ? 'Show all' : 'Filter new lines'}
        >
          <Badge color="success" appearance={activityFilter === 'new' ? 'filled' : 'tint'}>
            {newCount} new
          </Badge>
        </button>
      ) : null}
      {changedCount > 0 ? (
        <button
          type="button"
          onClick={() => toggleActivityFilter('changed')}
          className={styles.filterBadgeButton}
          title={activityFilter === 'changed' ? 'Show all' : 'Filter changed lines'}
        >
          <Badge color="warning" appearance={activityFilter === 'changed' ? 'filled' : 'tint'}>
            {changedCount} changed
          </Badge>
        </button>
      ) : null}
      {removedCount > 0 ? (
        <button
          type="button"
          onClick={() => toggleActivityFilter('removed')}
          className={styles.filterBadgeButton}
          title={activityFilter === 'removed' ? 'Show all' : 'Filter removed lines'}
        >
          <Badge color="danger" appearance={activityFilter === 'removed' ? 'filled' : 'tint'}>
            {removedCount} removed
          </Badge>
        </button>
      ) : null}
      <Button
        appearance="subtle"
        size="small"
        icon={<CheckmarkRegular />}
        onClick={markViewed}
        disabled={markingViewed || !canMarkViewed}
        title={canMarkViewed ? 'Mark changes as seen' : 'Only admin can mark as seen'}
      >
        {markingViewed ? 'Working...' : 'Mark as seen'}
      </Button>
    </div>
  );
}

export default memo(PurchaseOrderChangeActivityBar);

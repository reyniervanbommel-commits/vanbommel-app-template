import React from 'react';
import { Button, TableHeaderCell, makeStyles, shorthands } from '@fluentui/react-components';
import AdminInfoHint from './AdminInfoHint';

const useStyles = makeStyles({
  headerBulkCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    ...shorthands.gap('4px'),
  },
  headerLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    ...shorthands.gap('2px'),
  },
  headerBulkButtons: { display: 'flex', ...shorthands.gap('4px') },
  headerBulkButton: { minWidth: 'auto' },
});

export default function EntityConfigBulkToggleHeader({ label, info, action, className }) {
  const styles = useStyles();
  return (
    <TableHeaderCell className={className}>
      <div className={styles.headerBulkCell}>
        <span className={styles.headerLabel}>
          {label}
          {info ? <AdminInfoHint text={info} label={`About ${label}`} /> : null}
        </span>
        {action ? (
          <div className={styles.headerBulkButtons} title={`${action.affectedCount} columns affected`}>
            <Button
              size="small"
              appearance="subtle"
              className={styles.headerBulkButton}
              disabled={action.disableEnable}
              onClick={action.onEnable}
            >
              All on
            </Button>
            <Button
              size="small"
              appearance="subtle"
              className={styles.headerBulkButton}
              disabled={action.disableDisable}
              onClick={action.onDisable}
            >
              All off
            </Button>
          </div>
        ) : null}
      </div>
    </TableHeaderCell>
  );
}

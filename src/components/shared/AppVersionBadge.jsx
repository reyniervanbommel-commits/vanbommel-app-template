import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { APP_VERSION } from '../../config/version';

const useStyles = makeStyles({
  badge: {
    position: 'fixed',
    bottom: '12px',
    left: '12px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    zIndex: 9999,
    pointerEvents: 'none',
  },
});

export default function AppVersionBadge() {
  const styles = useStyles();
  return <div className={styles.badge}>{APP_VERSION}</div>;
}

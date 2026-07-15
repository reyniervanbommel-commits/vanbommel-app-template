import React from 'react';
import { makeStyles, tokens } from '@fluentui/react-components';
import { APP_VERSION } from '../../config/version';

const useStyles = makeStyles({
  footer: {
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke2,
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
    paddingTop: '10px',
    paddingBottom: '10px',
    paddingLeft: '16px',
    paddingRight: '16px',
    textAlign: 'right',
  },
});

export default function AppFooter() {
  const styles = useStyles();
  return <footer className={styles.footer}>Version {APP_VERSION}</footer>;
}

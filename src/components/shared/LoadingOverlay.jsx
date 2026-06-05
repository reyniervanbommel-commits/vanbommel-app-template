import React from 'react';
import { Spinner, makeStyles } from '@fluentui/react-components';

const useStyles = makeStyles({
  overlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 100 },
});

export default function LoadingOverlay({ label }) {
  const styles = useStyles();
  return <div className={styles.overlay}><Spinner label={label || 'Laden...'} /></div>;
}

import React from 'react';
import { makeStyles, tokens, Button } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px', color: tokens.colorNeutralForeground3 },
  title: { fontSize: '18px', fontWeight: 600, marginBottom: '8px' },
  description: { fontSize: '14px', marginBottom: '16px' },
});

export default function EmptyState({ title, description, onAction, actionLabel }) {
  const styles = useStyles();
  return (
    <div className={styles.container}>
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.description}>{description}</div>}
      {onAction && actionLabel && <Button appearance="primary" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

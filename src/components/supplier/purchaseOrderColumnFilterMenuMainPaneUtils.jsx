import React from 'react';
import {
  ArrowClockwiseRegular,
  CheckmarkRegular,
  EditRegular,
  LinkRegular,
  NumberSymbolRegular,
  TextBulletList20Regular,
} from '@fluentui/react-icons';

export function menuLabel(styles, icon, text) {
  return (
    <span className={styles.menuItemContent}>
      <span className={styles.menuItemIcon} aria-hidden>{icon}</span>
      <span>{text}</span>
    </span>
  );
}

export function submenuLabel(styles, icon, text) {
  return (
    <span className={styles.submenuItemContent}>
      <span className={styles.submenuItemLabel}>
        <span className={styles.menuItemIcon} aria-hidden>{icon}</span>
        <span>{text}</span>
      </span>
      <span aria-hidden>›</span>
    </span>
  );
}

export function renderColumnTypeIcon(typeKey) {
  switch (typeKey) {
    case 'number':
      return <NumberSymbolRegular />;
    case 'date':
      return <ArrowClockwiseRegular />;
    case 'boolean':
      return <CheckmarkRegular />;
    case 'select':
      return <TextBulletList20Regular />;
    case 'connected':
      return <LinkRegular />;
    case 'formula':
      return <span>fx</span>;
    case 'text':
    default:
      return <EditRegular />;
  }
}

import React from 'react';
import {
  CalendarLtrRegular,
  Chat20Regular,
  CheckmarkRegular,
  EditRegular,
  Image20Regular,
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
    case 'date_period':
    case 'date_wm':
      return <CalendarLtrRegular />;
    case 'boolean':
      return <CheckmarkRegular />;
    case 'select':
      return <TextBulletList20Regular />;
    case 'status':
      return <TextBulletList20Regular />;
    case 'image':
      return <Image20Regular />;
    case 'remarks':
      return <Chat20Regular />;
    case 'connected':
      return <LinkRegular />;
    case 'formula':
      return <span>fx</span>;
    case 'text':
    default:
      return <EditRegular />;
  }
}

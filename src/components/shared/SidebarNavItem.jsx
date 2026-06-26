import React from 'react';
import { Text, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '9px 14px 9px 13px',
    background: 'none',
    border: 'none',
    borderLeft: '3px solid transparent',
    borderRadius: '0 6px 6px 0',
    cursor: 'pointer',
    textAlign: 'left',
    color: tokens.colorNeutralForeground1,
    transitionProperty: 'background-color, border-color',
    transitionDuration: '0.12s',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground3,
    },
  },
  itemActive: {
    borderLeftColor: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    fontSize: '20px',
  },
  iconActive: {
    color: tokens.colorBrandForeground1,
  },
  label: {
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  labelActive: {
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorBrandForeground1,
  },
  // Compacte rail-versie (alleen icoon)
  itemCompact: {
    justifyContent: 'center',
    padding: '9px 0',
    borderRadius: '0',
    borderLeft: '3px solid transparent',
  },
  itemCompactActive: {
    borderLeftColor: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
  },
});

export default function SidebarNavItem({ icon: Icon, label, active = false, onClick, compact = false }) {
  const styles = useStyles();

  const itemClass = [
    styles.item,
    compact ? styles.itemCompact : '',
    active ? (compact ? styles.itemCompactActive : styles.itemActive) : '',
  ].filter(Boolean).join(' ');

  return (
    <button type="button" className={itemClass} onClick={onClick} aria-label={label} aria-current={active ? 'page' : undefined}>
      <span className={`${styles.icon} ${active ? styles.iconActive : ''}`}>
        <Icon />
      </span>
      {!compact && (
        <Text className={`${styles.label} ${active ? styles.labelActive : ''}`}>
          {label}
        </Text>
      )}
    </button>
  );
}

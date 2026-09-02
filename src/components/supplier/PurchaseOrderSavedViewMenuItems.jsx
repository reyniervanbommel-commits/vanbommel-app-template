import React, { useCallback } from 'react';
import {
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
  Switch,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { ClockRegular } from '@fluentui/react-icons';
import { viewVendorAccount } from '../../utils/viewTabs';

const useStyles = makeStyles({
  viewMenuItem: {
    ...shorthands.padding('0'),
    maxWidth: '100%',
    minWidth: 0,
    overflow: 'hidden',
  },
  viewMenuItemContent: {
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
  },
  viewMenuItemActive: {
    backgroundColor: tokens.colorNeutralBackground1Selected,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
  },
  viewMenuItemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    ...shorthands.gap('12px'),
  },
  viewMenuItemLabel: {
    display: 'block',
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  viewMenuItemLabelActive: {
    fontWeight: tokens.fontWeightSemibold,
  },
  vendorSuffix: {
    marginLeft: '6px',
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightRegular,
    textDecorationLine: 'underline',
  },
  historyControl: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    ...shorthands.gap('0'),
  },
  historyIcon: {
    fontSize: '14px',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
    marginLeft: '4px',
    marginRight: '-2px',
  },
  historySwitch: {
    flexShrink: 0,
    transform: 'scale(0.72)',
    transformOrigin: 'center center',
    marginLeft: '-6px',
  },
});

function canToggleViewHistory(view, canManageGlobal) {
  if (view.scope === 'personal') return true;
  return canManageGlobal;
}

export function SavedViewMenuItem({
  view,
  activeViewId,
  onApplyView,
  onToggleShowHistory,
  canManageGlobal,
}) {
  const styles = useStyles();
  const isActive = view.id === activeViewId;
  const showHistory = view.viewState?.showHistoryIndicators !== false;
  const canToggleHistory = canToggleViewHistory(view, canManageGlobal);

  const handleToggleHistory = useCallback((event, data) => {
    event.stopPropagation();
    onToggleShowHistory(view, data.checked);
  }, [onToggleShowHistory, view]);

  const handleSwitchClick = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleApply = useCallback(() => {
    onApplyView(view);
  }, [onApplyView, view]);

  const vendorAccount = viewVendorAccount(view);
  const labelText = `${view.name}${vendorAccount ? ` ${vendorAccount}` : ''}${view.isDefault ? ' (default)' : ''}`;

  return (
    <MenuItem
      className={mergeClasses(styles.viewMenuItem, isActive && styles.viewMenuItemActive)}
      content={{ className: styles.viewMenuItemContent }}
      aria-current={isActive ? 'true' : undefined}
      onClick={handleApply}
    >
      <span className={styles.viewMenuItemRow}>
        <span
          className={mergeClasses(styles.viewMenuItemLabel, isActive && styles.viewMenuItemLabelActive)}
          title={labelText}
        >
          {view.name}
          {vendorAccount ? <span className={styles.vendorSuffix}>{vendorAccount}</span> : null}
          {view.isDefault ? ' (default)' : ''}
        </span>
        <span className={styles.historyControl} title="Show history indicators">
          <ClockRegular className={styles.historyIcon} aria-hidden />
          <Switch
            className={styles.historySwitch}
            checked={showHistory}
            disabled={!canToggleHistory}
            aria-label="Show history indicators"
            onClick={handleSwitchClick}
            onChange={handleToggleHistory}
          />
        </span>
      </span>
    </MenuItem>
  );
}

export function SavedViewScopeGroup({
  title,
  views,
  activeViewId,
  onApplyView,
  onToggleShowHistory,
  canManageGlobal,
}) {
  if (!views.length) return null;
  return (
    <MenuGroup>
      <MenuGroupHeader>{title}</MenuGroupHeader>
      {views.map((view) => (
        <SavedViewMenuItem
          key={view.id}
          view={view}
          activeViewId={activeViewId}
          onApplyView={onApplyView}
          onToggleShowHistory={onToggleShowHistory}
          canManageGlobal={canManageGlobal}
        />
      ))}
    </MenuGroup>
  );
}

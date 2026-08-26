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
import { ClockRegular, BuildingRegular, PeopleRegular, PersonRegular, TableRegular } from '@fluentui/react-icons';
import { viewVendorAccount } from '../../utils/viewTabs';

const useStyles = makeStyles({
  viewMenuItem: {
    ...shorthands.padding('0'),
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
    ...shorthands.gap('12px'),
  },
  viewMenuItemLabel: {
    flex: 1,
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

function viewItemIcon(view) {
  if (view.id == null) return <TableRegular />;
  if (view.scope === 'vendor') return <BuildingRegular />;
  if (view.scope === 'global') return <PeopleRegular />;
  return <PersonRegular />;
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

  return (
    <MenuItem
      icon={viewItemIcon(view)}
      className={mergeClasses(styles.viewMenuItem, isActive && styles.viewMenuItemActive)}
      aria-current={isActive ? 'true' : undefined}
      onClick={handleApply}
    >
      <span className={styles.viewMenuItemRow}>
        <span className={mergeClasses(styles.viewMenuItemLabel, isActive && styles.viewMenuItemLabelActive)}>
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

import React, { useCallback } from 'react';
import {
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
  Switch,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { CheckmarkRegular, ClockRegular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  viewMenuItem: {
    ...shorthands.padding('0'),
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
  historyControl: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    ...shorthands.gap('4px'),
  },
  historyIcon: {
    fontSize: '14px',
    color: tokens.colorNeutralForeground3,
    flexShrink: 0,
  },
  historySwitch: {
    flexShrink: 0,
    transform: 'scale(0.72)',
    transformOrigin: 'center center',
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

  return (
    <MenuItem
      icon={isActive ? <CheckmarkRegular /> : undefined}
      className={styles.viewMenuItem}
      onClick={() => onApplyView(view)}
    >
      <span className={styles.viewMenuItemRow}>
        <span className={styles.viewMenuItemLabel}>
          {view.name}{view.isDefault ? ' (default)' : ''}
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

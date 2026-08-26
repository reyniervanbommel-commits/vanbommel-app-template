import React, { useCallback, useMemo, useState } from 'react';
import {
  Button,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowSyncRegular,
  ChevronDownRegular,
  DeleteRegular,
  EditRegular,
  EyeRegular,
  SaveRegular,
  StarRegular,
} from '@fluentui/react-icons';
import PurchaseOrderSavedViewDialog from './PurchaseOrderSavedViewDialog';
import PurchaseOrderExportMenu from './PurchaseOrderExportMenu';
import { SavedViewMenuItem, SavedViewScopeGroup } from './PurchaseOrderSavedViewMenuItems';

const useStyles = makeStyles({
  trigger: {
    maxWidth: '240px',
  },
  triggerLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  titleTrigger: {
    maxWidth: '260px',
    minWidth: 0,
    flexShrink: 0,
    height: 'auto',
    ...shorthands.padding('0'),
    ...shorthands.border('none'),
    justifyContent: 'flex-start',
    ...shorthands.gap('4px'),
    color: tokens.colorNeutralForeground1,
    backgroundColor: 'transparent',
  },
  titleName: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: '1.1',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  titleChevron: {
    fontSize: '20px',
    flexShrink: 0,
  },
  unsavedIndicator: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightBold,
    verticalAlign: 'super',
    marginLeft: '4px',
    fontSize: '18px',
    lineHeight: '1',
  },
  menuPopover: {
    minWidth: '240px',
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
  },
  empty: {
    ...shorthands.padding('4px', '10px'),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  updateActionLabel: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  deleteAction: {
    color: tokens.colorPaletteRedForeground1,
  },
});

const NO_VIEW_LABEL = 'All orders (no view)';

/**
 * View picker: All orders, then saved views, then manage/create, then tabs, then export.
 */
export default function PurchaseOrderSavedViewsControl({
  views,
  activeViewId,
  canManageGlobal,
  canManageViews = true,
  saving,
  hasUnsavedChanges = false,
  titleMode = false,
  onApplyView,
  onResetView,
  onSaveAsNew,
  onUpdateActive,
  onRenameView,
  onSetDefault,
  onDeleteView,
  onToggleShowHistory = () => {},
  onExportExcel = null,
  allOrdersShowHistoryIndicators = true,
  tabMenu = null,
}) {
  const styles = useStyles();
  const [dialogMode, setDialogMode] = useState(null);

  const personalViews = useMemo(() => views.filter((view) => view.scope === 'personal'), [views]);
  const vendorViews = useMemo(() => views.filter((view) => view.scope === 'vendor'), [views]);
  const globalViews = useMemo(() => views.filter((view) => view.scope === 'global'), [views]);
  const hasSavedViews = personalViews.length + vendorViews.length + globalViews.length > 0;

  const activeView = useMemo(
    () => views.find((view) => view.id === activeViewId) || null,
    [views, activeViewId]
  );

  const activeCanManage = canManageViews && activeView
    ? (activeView.scope === 'personal' || canManageGlobal)
    : false;

  const handleSaveAsNew = useCallback(async (payload) => {
    await onSaveAsNew(payload);
  }, [onSaveAsNew]);

  const handleRename = useCallback(async ({ name }) => {
    if (!activeView) return;
    await onRenameView(activeView, name);
  }, [activeView, onRenameView]);

  const triggerLabel = activeView ? activeView.name : (titleMode ? 'All orders' : NO_VIEW_LABEL);
  const allOrdersView = useMemo(() => ({
    id: null,
    name: NO_VIEW_LABEL,
    scope: 'personal',
    viewState: { showHistoryIndicators: allOrdersShowHistoryIndicators },
  }), [allOrdersShowHistoryIndicators]);

  return (
    <>
      <Menu positioning="below-start">
        <MenuTrigger disableButtonEnhancement>
          {titleMode ? (
            <Button
              appearance="subtle"
              className={styles.titleTrigger}
              disabled={saving}
            >
              <span className={styles.titleName}>
                {triggerLabel}
                {hasUnsavedChanges ? <span className={styles.unsavedIndicator} aria-hidden>*</span> : null}
              </span>
              <ChevronDownRegular className={styles.titleChevron} />
            </Button>
          ) : (
            <Button
              appearance="secondary"
              icon={<EyeRegular />}
              iconPosition="before"
              className={styles.trigger}
              disabled={saving}
            >
              <span className={styles.triggerLabel}>{triggerLabel}</span>
              <ChevronDownRegular />
            </Button>
          )}
        </MenuTrigger>
        <MenuPopover className={styles.menuPopover}>
          <MenuList>
            <SavedViewMenuItem
              view={allOrdersView}
              activeViewId={activeViewId}
              onApplyView={onResetView}
              onToggleShowHistory={onToggleShowHistory}
              canManageGlobal
            />
            <MenuDivider />
            <SavedViewScopeGroup
              title="Vendor"
              views={vendorViews}
              activeViewId={activeViewId}
              onApplyView={onApplyView}
              onToggleShowHistory={onToggleShowHistory}
              canManageGlobal={canManageGlobal}
            />
            <SavedViewScopeGroup
              title="Shared"
              views={globalViews}
              activeViewId={activeViewId}
              onApplyView={onApplyView}
              onToggleShowHistory={onToggleShowHistory}
              canManageGlobal={canManageGlobal}
            />
            <SavedViewScopeGroup
              title="Personal"
              views={personalViews}
              activeViewId={activeViewId}
              onApplyView={onApplyView}
              onToggleShowHistory={onToggleShowHistory}
              canManageGlobal={canManageGlobal}
            />
            {!hasSavedViews ? (
              <div className={styles.empty}>No saved views yet</div>
            ) : null}

            {activeCanManage ? (
              <>
                <MenuDivider />
                <MenuGroup>
                  <MenuGroupHeader>Manage view</MenuGroupHeader>
                  {hasUnsavedChanges ? (
                    <MenuItem
                      icon={<ArrowSyncRegular />}
                      onClick={() => onUpdateActive(activeView)}
                    >
                      <span className={styles.updateActionLabel}>Update current view</span>
                    </MenuItem>
                  ) : null}
                  <MenuItem
                    icon={<EditRegular />}
                    onClick={() => setDialogMode('rename')}
                  >
                    Rename…
                  </MenuItem>
                  {!activeView.isDefault ? (
                    <MenuItem
                      icon={<StarRegular />}
                      onClick={() => onSetDefault(activeView)}
                    >
                      Set as default
                    </MenuItem>
                  ) : null}
                  <MenuItem
                    icon={<DeleteRegular className={styles.deleteAction} />}
                    className={styles.deleteAction}
                    onClick={() => onDeleteView(activeView)}
                  >
                    Delete view
                  </MenuItem>
                </MenuGroup>
              </>
            ) : null}

            {canManageViews ? (
              <>
                <MenuDivider />
                <MenuItem icon={<SaveRegular />} onClick={() => setDialogMode('create')}>
                  Save as new view…
                </MenuItem>
              </>
            ) : null}

            {tabMenu}

            {onExportExcel ? (
              <>
                <MenuDivider />
                <PurchaseOrderExportMenu onExportExcel={onExportExcel} />
              </>
            ) : null}
          </MenuList>
        </MenuPopover>
      </Menu>

      {canManageViews ? (
        <PurchaseOrderSavedViewDialog
          open={dialogMode !== null}
          mode={dialogMode || 'create'}
          canManageGlobal={canManageGlobal}
          initialName={dialogMode === 'rename' && activeView ? activeView.name : ''}
          onOpenChange={(next) => setDialogMode(next ? dialogMode : null)}
          onSubmit={dialogMode === 'rename' ? handleRename : handleSaveAsNew}
        />
      ) : null}
    </>
  );
}

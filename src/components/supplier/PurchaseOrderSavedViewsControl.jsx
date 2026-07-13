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
  ChevronDownRegular,
  SaveRegular,
  EyeRegular,
  StarFilled,
} from '@fluentui/react-icons';
import PurchaseOrderSavedViewDialog from './PurchaseOrderSavedViewDialog';

const useStyles = makeStyles({
  trigger: {
    maxWidth: '240px',
  },
  triggerLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  // D365-stijl: grote viewnaam als paginatitel, zonder rand.
  titleTrigger: {
    maxWidth: '420px',
    minWidth: 0,
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
  defaultViewIndicator: {
    color: tokens.colorPaletteMarigoldForeground2,
    marginLeft: '6px',
    verticalAlign: 'middle',
  },
  updateActionLabel: {
    color: tokens.colorBrandForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  menuPopover: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke2),
  },
  empty: {
    ...shorthands.padding('4px', '10px'),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

const NO_VIEW_LABEL = 'Alle orders (geen view)';

/**
 * D365-achtige view-control voor de Purchase Orders toolbar: kies/pas een view toe,
 * sla de huidige state op als nieuwe view, of beheer (bijwerken/hernoemen/standaard/
 * verwijderen) de actieve view. Personal-views zijn altijd beheerbaar door de eigenaar;
 * global-views alleen wanneer canManageGlobal true is (admin/employee).
 */
export default function PurchaseOrderSavedViewsControl({
  views,
  activeViewId,
  canManageGlobal,
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
}) {
  const styles = useStyles();
  const [dialogMode, setDialogMode] = useState(null); // 'create' | 'rename' | null

  const personalViews = useMemo(() => views.filter((view) => view.scope === 'personal'), [views]);
  const globalViews = useMemo(() => views.filter((view) => view.scope === 'global'), [views]);

  const activeView = useMemo(
    () => views.find((view) => view.id === activeViewId) || null,
    [views, activeViewId]
  );

  const activeCanManage = activeView
    ? (activeView.scope === 'personal' || canManageGlobal)
    : false;

  const handleSaveAsNew = useCallback(async (payload) => {
    await onSaveAsNew(payload);
  }, [onSaveAsNew]);

  const handleRename = useCallback(async ({ name }) => {
    if (!activeView) return;
    await onRenameView(activeView, name);
  }, [activeView, onRenameView]);

  const triggerLabel = activeView ? activeView.name : (titleMode ? 'Alle orders' : NO_VIEW_LABEL);

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
                {activeView?.isDefault ? (
                  <StarFilled className={styles.defaultViewIndicator} aria-label="Default view" />
                ) : null}
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
            {activeView && activeCanManage ? (
              <>
                <MenuItem onClick={() => onUpdateActive(activeView)}>
                  <span className={styles.updateActionLabel}>Huidige view bijwerken</span>
                </MenuItem>
                <MenuDivider />
              </>
            ) : null}

            <MenuItem
              icon={!activeView ? <span aria-hidden>✓</span> : undefined}
              onClick={onResetView}
            >
              {NO_VIEW_LABEL}
            </MenuItem>

            {personalViews.length ? (
              <MenuGroup>
                <MenuGroupHeader>Persoonlijk</MenuGroupHeader>
                {personalViews.map((view) => (
                  <MenuItem
                    key={view.id}
                    icon={view.id === activeViewId ? <span aria-hidden>✓</span> : undefined}
                    onClick={() => onApplyView(view)}
                  >
                    {view.name}{view.isDefault ? ' (standaard)' : ''}
                  </MenuItem>
                ))}
              </MenuGroup>
            ) : null}

            {globalViews.length ? (
              <MenuGroup>
                <MenuGroupHeader>Gedeeld</MenuGroupHeader>
                {globalViews.map((view) => (
                  <MenuItem
                    key={view.id}
                    icon={view.id === activeViewId ? <span aria-hidden>✓</span> : undefined}
                    onClick={() => onApplyView(view)}
                  >
                    {view.name}{view.isDefault ? ' (standaard)' : ''}
                  </MenuItem>
                ))}
              </MenuGroup>
            ) : null}

            {!personalViews.length && !globalViews.length ? (
              <div className={styles.empty}>Nog geen opgeslagen views</div>
            ) : null}

            <MenuDivider />

            <MenuItem icon={<SaveRegular />} onClick={() => setDialogMode('create')}>
              Opslaan als nieuwe view…
            </MenuItem>
            {activeView && activeCanManage ? (
              <>
                <MenuItem onClick={() => setDialogMode('rename')}>
                  Hernoemen…
                </MenuItem>
                {!activeView.isDefault ? (
                  <MenuItem onClick={() => onSetDefault(activeView)}>
                    Als standaard instellen
                  </MenuItem>
                ) : null}
                <MenuItem onClick={() => onDeleteView(activeView)}>
                  Verwijderen
                </MenuItem>
              </>
            ) : null}
          </MenuList>
        </MenuPopover>
      </Menu>

      <PurchaseOrderSavedViewDialog
        open={dialogMode !== null}
        mode={dialogMode || 'create'}
        canManageGlobal={canManageGlobal}
        initialName={dialogMode === 'rename' && activeView ? activeView.name : ''}
        onOpenChange={(next) => setDialogMode(next ? dialogMode : null)}
        onSubmit={dialogMode === 'rename' ? handleRename : handleSaveAsNew}
      />
    </>
  );
}

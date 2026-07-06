import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Menu,
  MenuDivider,
  MenuGroup,
  MenuGroupHeader,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Radio,
  RadioGroup,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import {
  ChevronDownRegular,
  SaveRegular,
  EyeRegular,
} from '@fluentui/react-icons';

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
  form: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
  },
  empty: {
    ...shorthands.padding('4px', '10px'),
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
});

const NO_VIEW_LABEL = 'Alle orders (geen view)';

// Dialog voor "opslaan als nieuwe view" en "hernoemen". mode bepaalt de velden.
function SavedViewDialog({ open, mode, canManageGlobal, initialName, onOpenChange, onSubmit }) {
  const styles = useStyles();
  const [name, setName] = useState('');
  const [scope, setScope] = useState('personal');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initialName || '');
      setScope('personal');
      setIsDefault(false);
      setSaving(false);
      setError('');
    }
  }, [open, initialName]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Geef een naam op.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ name: trimmed, scope, isDefault });
      onOpenChange(false);
    } catch (err) {
      setError(err.message || 'Opslaan mislukt.');
    } finally {
      setSaving(false);
    }
  }, [name, scope, isDefault, onSubmit, onOpenChange]);

  const title = mode === 'rename' ? 'View hernoemen' : 'Opslaan als nieuwe view';

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <div className={styles.form}>
              <Field label="Naam" required>
                <Input
                  value={name}
                  onChange={(_, data) => setName(data.value)}
                  placeholder="Bijv. Openstaand deze week"
                />
              </Field>

              {mode === 'create' && canManageGlobal ? (
                <Field label="Zichtbaarheid">
                  <RadioGroup
                    layout="horizontal"
                    value={scope}
                    onChange={(_, data) => setScope(data.value)}
                  >
                    <Radio value="personal" label="Persoonlijk" />
                    <Radio value="global" label="Gedeeld (iedereen)" />
                  </RadioGroup>
                </Field>
              ) : null}

              {mode === 'create' ? (
                <Checkbox
                  checked={isDefault}
                  onChange={(_, data) => setIsDefault(Boolean(data.checked))}
                  label="Als standaard-view instellen"
                />
              ) : null}

              {error ? <Field validationState="error" validationMessage={error} /> : null}
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuleren
            </Button>
            <Button appearance="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

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
              <span className={styles.titleName}>{triggerLabel}</span>
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
        <MenuPopover>
          <MenuList>
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
                <MenuItem onClick={() => onUpdateActive(activeView)}>
                  Huidige view bijwerken
                </MenuItem>
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

      <SavedViewDialog
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

import React, { useCallback } from 'react';
import {
  Button, Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerHeaderTitle,
  Spinner, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { Dismiss24Regular, Save24Regular } from '@fluentui/react-icons';
import { useRccpSettings } from '../../hooks/useRccpSettings';
import RccpCapacityEditor from './RccpCapacityEditor';
import RccpImportDialog from './RccpImportDialog';
import RccpSettingsForm from './RccpSettingsForm';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalL) },
  dataSection: {
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusXLarge),
    ...shorthands.padding(tokens.spacingVerticalL),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  dataActions: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    flexWrap: 'wrap',
  },
  hint: { color: tokens.colorNeutralForeground3 },
  error: { color: tokens.colorPaletteRedForeground1 },
});

export default function RccpSettingsFlyout({ open, onClose, onSaved, readOnly }) {
  const styles = useStyles();
  const settings = useRccpSettings();
  const handleClose = useCallback(() => onClose?.(), [onClose]);
  const handleSave = useCallback(async () => {
    const ok = await settings.save();
    if (ok) onSaved?.();
  }, [onSaved, settings]);

  return (
    <Drawer open={open} position="end" size="medium" onOpenChange={(_, data) => { if (!data.open) handleClose(); }}>
      <DrawerHeader>
        <DrawerHeaderTitle
          action={(
            <Button
              appearance="subtle"
              icon={<Dismiss24Regular />}
              aria-label="Close settings"
              onClick={handleClose}
            />
          )}
        >
          RCCP settings
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        <div className={styles.body}>
          <div className={styles.dataSection}>
            <Text weight="semibold">Capacity data</Text>
            <Text className={styles.hint}>Add or import vendor capacity records.</Text>
            <div className={styles.dataActions}>
              <RccpCapacityEditor readOnly={readOnly} onSaved={onSaved} />
              <RccpImportDialog readOnly={readOnly} onImported={onSaved} />
            </div>
          </div>
          {settings.loading ? <Spinner label="Loading RCCP settings..." /> : (
            <RccpSettingsForm
              variant="flyout"
              config={settings.config}
              columns={settings.columns}
              statusOptions={settings.statusOptions}
              onUpdateField={settings.updateField}
            />
          )}
        </div>
      </DrawerBody>
      {!settings.loading && settings.config && (
        <DrawerFooter>
          <div className={styles.footer}>
            <Button appearance="primary" icon={<Save24Regular />} onClick={handleSave} disabled={settings.saving}>
              Save settings
            </Button>
            {settings.saving && <Spinner size="tiny" />}
            {settings.saved && <Text className={styles.hint}>Saved</Text>}
            {settings.error && <Text className={styles.error}>{settings.error}</Text>}
          </div>
        </DrawerFooter>
      )}
    </Drawer>
  );
}

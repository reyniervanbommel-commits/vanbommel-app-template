import React, { useCallback } from 'react';
import {
  Button, Drawer, DrawerBody, DrawerFooter, DrawerHeader, DrawerHeaderTitle,
  Spinner, Text, makeStyles, shorthands, tokens,
} from '@fluentui/react-components';
import { Dismiss24Regular, Save24Regular } from '@fluentui/react-icons';
import { useRccpSettings } from '../../hooks/useRccpSettings';
import RccpSettingsForm from './RccpSettingsForm';

const useStyles = makeStyles({
  body: { display: 'flex', flexDirection: 'column', ...shorthands.gap(tokens.spacingVerticalL) },
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

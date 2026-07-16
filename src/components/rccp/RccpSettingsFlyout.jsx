import React, { useCallback } from 'react';
import {
  Drawer, DrawerBody, DrawerHeader, DrawerHeaderTitle, Spinner,
} from '@fluentui/react-components';
import { Dismiss24Regular } from '@fluentui/react-icons';
import { useRccpSettings } from '../../hooks/useRccpSettings';
import RccpSettingsForm from './RccpSettingsForm';

export default function RccpSettingsFlyout({ open, onClose, onSaved }) {
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
          action={<Dismiss24Regular onClick={handleClose} aria-label="Close settings" role="button" />}
        >
          RCCP settings
        </DrawerHeaderTitle>
      </DrawerHeader>
      <DrawerBody>
        {settings.loading ? <Spinner label="Loading RCCP settings..." /> : (
          <RccpSettingsForm
            variant="flyout"
            config={settings.config}
            columns={settings.columns}
            saving={settings.saving}
            error={settings.error}
            saved={settings.saved}
            statusOptions={settings.statusOptions}
            onUpdateField={settings.updateField}
            onSave={handleSave}
          />
        )}
      </DrawerBody>
    </Drawer>
  );
}

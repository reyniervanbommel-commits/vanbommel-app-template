import React, { useCallback } from 'react';
import { Spinner, makeStyles } from '@fluentui/react-components';
import { useRccpSettings } from '../../hooks/useRccpSettings';
import RccpSettingsForm from '../rccp/RccpSettingsForm';

const useStyles = makeStyles({
  root: { maxWidth: '920px' },
});

export default function AdminRccpSettings() {
  const styles = useStyles();
  const settings = useRccpSettings();
  const handleSave = useCallback(async () => { await settings.save(); }, [settings]);

  if (settings.loading) return <Spinner label="Loading RCCP settings..." />;

  return (
    <div className={styles.root}>
      <RccpSettingsForm
        variant="page"
        config={settings.config}
        columns={settings.columns}
        saving={settings.saving}
        error={settings.error}
        saved={settings.saved}
        statusOptions={settings.statusOptions}
        onUpdateField={settings.updateField}
        onSave={handleSave}
      />
    </div>
  );
}

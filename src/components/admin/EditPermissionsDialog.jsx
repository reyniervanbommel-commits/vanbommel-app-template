import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Text,
  Checkbox,
  MessageBar,
  MessageBarBody,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  makeStyles,
  tokens,
  shorthands,
} from '@fluentui/react-components';
import { Shield24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';
import { PAGE_PERMISSIONS } from '../../constants/pagePermissions';

const useStyles = makeStyles({
  permissionsList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('8px'),
    marginTop: '8px',
  },
  permissionDescription: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginLeft: '28px',
    marginTop: '-4px',
  },
});

export default function EditPermissionsDialog({ user, open, onOpenChange, onSaved }) {
  const styles = useStyles();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const loadPermissions = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest(`/admin/users/${user.id}/permissions`);
      setPermissions((Array.isArray(data) ? data : []).map((p) => p.page_name));
    } catch {
      setError('Rechten laden mislukt');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (open && user?.id) {
      setSuccess(false);
      loadPermissions();
    }
  }, [open, user?.id, loadPermissions]);

  const handlePermissionToggle = useCallback((pageName) => {
    setPermissions((prev) =>
      prev.includes(pageName) ? prev.filter((p) => p !== pageName) : [...prev, pageName]
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiRequest(`/admin/users/${user.id}/permissions`, {
        method: 'PATCH',
        body: { permissions: permissions.map((page_name) => ({ page_name })) },
      });
      setSuccess(true);
      onSaved();
      setTimeout(() => onOpenChange(false), 1200);
    } catch (err) {
      setError(err.message || 'Rechten opslaan mislukt');
    } finally {
      setSaving(false);
    }
  }, [user?.id, permissions, onSaved, onOpenChange]);

  const handleOpenChange = useCallback((_, data) => {
    onOpenChange(data.open);
  }, [onOpenChange]);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Rechten voor {user.email}</DialogTitle>
          <DialogContent>
            {error && (
              <MessageBar intent="error" style={{ marginBottom: '8px' }}>
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}
            {success && (
              <MessageBar intent="success" style={{ marginBottom: '8px' }}>
                <MessageBarBody>Rechten opgeslagen</MessageBarBody>
              </MessageBar>
            )}
            {loading ? (
              <Text>Laden...</Text>
            ) : (
              <div className={styles.permissionsList}>
                {PAGE_PERMISSIONS.map((page) => (
                  <div key={page.id}>
                    <Checkbox
                      label={page.label}
                      checked={permissions.includes(page.id)}
                      onChange={() => handlePermissionToggle(page.id)}
                    />
                    <Text className={styles.permissionDescription}>{page.description}</Text>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Annuleren</Button>
            </DialogTrigger>
            <Button
              appearance="primary"
              icon={<Shield24Regular />}
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

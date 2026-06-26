import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogTrigger, DialogSurface, DialogTitle, DialogBody,
  DialogActions, DialogContent, Button, Input, Field, Select,
  MessageBar, MessageBarBody,
} from '@fluentui/react-components';
import { PersonAdd24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';

export default function CreateUserDialog({ open, onOpenChange, onUserCreated }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await apiRequest('/admin/users', { method: 'POST', body: { email, role } });
      setEmail('');
      setRole('user');
      onOpenChange(false);
      if (onUserCreated) onUserCreated();
    } catch (err) {
      setError(err.message || 'Aanmaken mislukt');
    } finally {
      setLoading(false);
    }
  }, [email, role, onOpenChange, onUserCreated]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="primary" icon={<PersonAdd24Regular />}>Gebruiker aanmaken</Button>
      </DialogTrigger>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Nieuwe gebruiker</DialogTitle>
          <DialogContent>
            {error && (
              <MessageBar intent="error" style={{ marginBottom: '12px' }}>
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}
            <Field label="E-mailadres" required style={{ marginBottom: '12px' }}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@bedrijf.nl" disabled={loading} />
            </Field>
            <Field label="Rol">
              <Select value={role} onChange={(e) => setRole(e.target.value)} disabled={loading}>
                <option value="user">Gebruiker</option>
                <option value="employee">Medewerker</option>
                <option value="admin">Admin</option>
                <option value="superuser">Superuser</option>
              </Select>
            </Field>
          </DialogContent>
          <DialogActions>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary" disabled={loading}>Annuleren</Button>
            </DialogTrigger>
            <Button appearance="primary" onClick={handleSubmit} disabled={loading || !email}>
              {loading ? 'Bezig...' : 'Aanmaken'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

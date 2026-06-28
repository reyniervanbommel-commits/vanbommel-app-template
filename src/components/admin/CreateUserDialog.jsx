import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Input,
  Field,
  Select,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { PersonAdd24Regular } from '@fluentui/react-icons';
import { apiRequest } from '../../utils/api';
import { ROLES } from '../../constants/roles';

export default function CreateUserDialog({ open, onOpenChange, onUserCreated }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLES.SUPPLIER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await apiRequest('/admin/users', { method: 'POST', body: { email, role } });
      setEmail('');
      setRole(ROLES.SUPPLIER);
      onOpenChange(false);
      if (onUserCreated) onUserCreated();
    } catch (err) {
      setError(err.message || 'Gebruiker aanmaken mislukt');
    } finally {
      setLoading(false);
    }
  }, [email, role, onOpenChange, onUserCreated]);

  const handleOpenChange = useCallback((_, data) => {
    onOpenChange(data.open);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="primary" icon={<PersonAdd24Regular />}>
          Gebruiker aanmaken
        </Button>
      </DialogTrigger>
      <DialogSurface>
        <DialogTitle>Nieuwe gebruiker</DialogTitle>
        <DialogBody>
          {error && (
            <MessageBar intent="error" style={{ marginBottom: '16px' }}>
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
          )}
          <DialogContent>
            <Field label="E-mailadres" required>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="naam@voorbeeld.nl"
                disabled={loading}
              />
            </Field>
            <Field label="Rol">
              <Select value={role} onChange={(e) => setRole(e.target.value)} disabled={loading}>
                <option value={ROLES.SUPPLIER}>Supplier</option>
                <option value={ROLES.EMPLOYEE}>Employee</option>
                <option value={ROLES.ADMIN}>Admin</option>
              </Select>
            </Field>
          </DialogContent>
        </DialogBody>
        <DialogActions>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="secondary" disabled={loading}>Annuleren</Button>
          </DialogTrigger>
          <Button appearance="primary" onClick={handleSubmit} disabled={loading || !email}>
            {loading ? 'Bezig...' : 'Aanmaken'}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
}

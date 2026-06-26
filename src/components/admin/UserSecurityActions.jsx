import React, { memo, useCallback, useState } from 'react';
import { Select, Field } from '@fluentui/react-components';
import { ChevronDown24Regular } from '@fluentui/react-icons';

function UserSecurityActionsComponent({ user, onEditPermissions, onLockToggle, onMfaRequiredToggle, onForceReset, onDeleteClick }) {
  const [selectedAction, setSelectedAction] = useState('');

  const handleChange = useCallback((event) => {
    const action = event.target.value;
    setSelectedAction(action);
    if (action === 'permissions')  onEditPermissions(user);
    if (action === 'lock-toggle')  onLockToggle(user.id, user.is_locked);
    if (action === 'mfa-toggle')   onMfaRequiredToggle(user.id, user.mfa_required);
    if (action === 'force-reset')  onForceReset(user.id);
    if (action === 'remove')       onDeleteClick(user);
    setSelectedAction('');
  }, [user, onEditPermissions, onLockToggle, onMfaRequiredToggle, onForceReset, onDeleteClick]);

  return (
    <Field validationMessage="">
      <Select value={selectedAction} onChange={handleChange} contentAfter={<ChevronDown24Regular />}>
        <option value="">Actie kiezen</option>
        <option value="permissions">Rechten beheren</option>
        <option value="lock-toggle">{user.is_locked ? 'Deblokkeren' : 'Blokkeren'}</option>
        <option value="mfa-toggle">{user.mfa_required ? 'MFA optioneel maken' : 'MFA verplichten'}</option>
        <option value="force-reset">Wachtwoord reset forceren</option>
        <option value="remove">Verwijderen</option>
      </Select>
    </Field>
  );
}

export const UserSecurityActions = memo(UserSecurityActionsComponent);

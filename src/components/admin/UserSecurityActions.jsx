import React, { memo, useCallback, useState } from 'react';
import { Field, Select } from '@fluentui/react-components';
import { ChevronDown24Regular } from '@fluentui/react-icons';

function UserSecurityActionsComponent({
  user,
  onEditPermissions,
  onLockToggle,
  onMfaRequiredToggle,
  onForceReset,
  onDeleteClick,
}) {
  const [selectedAction, setSelectedAction] = useState('');

  const handleEditPermissions = useCallback(() => onEditPermissions(user), [onEditPermissions, user]);
  const handleLockToggle = useCallback(() => onLockToggle(user.id, user.is_locked), [onLockToggle, user]);
  const handleMfaToggle = useCallback(
    () => onMfaRequiredToggle(user.id, user.mfa_required),
    [onMfaRequiredToggle, user]
  );
  const handleForceReset = useCallback(() => onForceReset(user.id), [onForceReset, user.id]);
  const handleRemove = useCallback(() => onDeleteClick(user), [onDeleteClick, user]);

  const handleActionChange = useCallback((event) => {
    const action = event.target.value;
    setSelectedAction('');
    if (action === 'permissions') handleEditPermissions();
    if (action === 'lock-toggle') handleLockToggle();
    if (action === 'mfa-toggle') handleMfaToggle();
    if (action === 'force-reset') handleForceReset();
    if (action === 'remove') handleRemove();
  }, [handleEditPermissions, handleLockToggle, handleMfaToggle, handleForceReset, handleRemove]);

  return (
    <Field validationMessage="">
      <Select
        value={selectedAction}
        onChange={handleActionChange}
        contentAfter={<ChevronDown24Regular />}
      >
        <option value="">Actie kiezen</option>
        <option value="permissions">Rechten beheren</option>
        <option value="lock-toggle">{user.is_locked ? 'Deblokkeren' : 'Blokkeren'}</option>
        <option value="mfa-toggle">{user.mfa_required ? 'MFA optioneel maken' : 'MFA verplicht maken'}</option>
        <option value="force-reset">Wachtwoord reset forceren</option>
        <option value="remove">Gebruiker verwijderen</option>
      </Select>
    </Field>
  );
}

export const UserSecurityActions = memo(UserSecurityActionsComponent);

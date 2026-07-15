import React, { memo, useCallback, useState } from 'react';
import { Field, Select } from '@fluentui/react-components';
import { ChevronDown24Regular } from '@fluentui/react-icons';

function UserSecurityActionsComponent({
  user,
  onEditPermissions,
  onEditVendorAccount,
  onLockToggle,
  onMfaRequiredToggle,
  onForceReset,
  onDeleteClick,
}) {
  const [selectedAction, setSelectedAction] = useState('');
  const isSupplier = user.role === 'supplier';

  const handleEditPermissions = useCallback(() => onEditPermissions(user), [onEditPermissions, user]);
  const handleEditVendorAccount = useCallback(() => onEditVendorAccount(user), [onEditVendorAccount, user]);
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
    if (action === 'vendor-account') handleEditVendorAccount();
    if (action === 'lock-toggle') handleLockToggle();
    if (action === 'mfa-toggle') handleMfaToggle();
    if (action === 'force-reset') handleForceReset();
    if (action === 'remove') handleRemove();
  }, [handleEditPermissions, handleEditVendorAccount, handleLockToggle, handleMfaToggle, handleForceReset, handleRemove]);

  return (
    <Field validationMessage="">
      <Select
        value={selectedAction}
        onChange={handleActionChange}
        contentAfter={<ChevronDown24Regular />}
      >
        <option value="">Choose action</option>
        <option value="permissions">Manage permissions</option>
        {isSupplier && <option value="vendor-account">Set vendor account</option>}
        <option value="lock-toggle">{user.is_locked ? 'Unlock' : 'Lock'}</option>
        <option value="mfa-toggle">{user.mfa_required ? 'Make MFA optional' : 'Require MFA'}</option>
        <option value="force-reset">Force password reset</option>
        <option value="remove">Delete user</option>
      </Select>
    </Field>
  );
}

export const UserSecurityActions = memo(UserSecurityActionsComponent);

import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
} from '@fluentui/react-components';
import { formatIdleCountdown } from '../../utils/idleSession';

export default function IdleSessionWarningDialog({
  open,
  secondsLeft,
  onStaySignedIn,
  onSignOut,
}) {
  return (
    <Dialog open={open} modalType="alert">
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Still there?</DialogTitle>
          <DialogContent>
            You will be signed out in {formatIdleCountdown(secondsLeft)} due to inactivity.
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onSignOut}>Sign out now</Button>
            <Button appearance="primary" onClick={onStaySignedIn}>Stay signed in</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

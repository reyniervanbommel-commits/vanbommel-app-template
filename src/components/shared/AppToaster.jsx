import React from 'react';
import { Toaster } from '@fluentui/react-components';
import { APP_TOASTER_ID } from '../../hooks/useAppToast';

export default function AppToaster() {
  return <Toaster toasterId={APP_TOASTER_ID} />;
}

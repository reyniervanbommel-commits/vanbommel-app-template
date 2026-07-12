import { Toast, ToastTitle, useToastController } from '@fluentui/react-components';
import { createElement, useCallback } from 'react';

export const APP_TOASTER_ID = 'app-toaster';

export function useAppToast() {
  const { dispatchToast } = useToastController(APP_TOASTER_ID);

  const notify = useCallback((message, options = {}) => {
    const safeMessage = String(message || '').trim();
    if (!safeMessage) return;
    const { timeout = 5000, intent = 'info' } = options;
    dispatchToast(
      createElement(Toast, null, createElement(ToastTitle, null, safeMessage)),
      { position: 'bottom-end', timeout, intent }
    );
  }, [dispatchToast]);

  const notifyError = useCallback((message, options = {}) => {
    notify(message, { intent: 'error', ...options });
  }, [notify]);

  const notifySuccess = useCallback((message, options = {}) => {
    notify(message, { intent: 'success', ...options });
  }, [notify]);

  return { notify, notifyError, notifySuccess };
}

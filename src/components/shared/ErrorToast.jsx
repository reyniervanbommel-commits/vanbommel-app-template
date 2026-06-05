import React, { useEffect } from 'react';
import { Toast, ToastTitle, Toaster, useToastController, useId } from '@fluentui/react-components';

export default function ErrorToast({ message, onDismiss }) {
  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);

  useEffect(() => {
    if (message) {
      dispatchToast(<Toast><ToastTitle>{message}</ToastTitle></Toast>, { position: 'bottom-end', intent: 'error', timeout: 5000 });
      const t = setTimeout(onDismiss, 5000);
      return () => clearTimeout(t);
    }
  }, [message, dispatchToast, onDismiss]);

  return <Toaster toasterId={toasterId} />;
}

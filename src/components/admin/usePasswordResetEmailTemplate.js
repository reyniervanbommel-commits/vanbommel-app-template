import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../utils/api';

const EMPTY_TEMPLATE = {
  subject: '',
  title: '',
  introText: '',
  buttonText: '',
  footerText: '',
  brandName: '',
  backgroundColor: '#F5F3F0',
  buttonColor: '#0F6CBD',
};

/**
 * Manages password reset email template form state.
 * Returns stable handlers and status flags for the admin view.
 */
export function usePasswordResetEmailTemplate() {
  const [form, setForm] = useState(EMPTY_TEMPLATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/admin/settings/password-reset-email-template');
      setForm({ ...EMPTY_TEMPLATE, ...(data.template || {}) });
    } catch (err) {
      setError(err.message || 'Failed to load email template.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  const updateField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage('');
    setError('');
  }, []);

  const createChangeHandler = useCallback(
    (field) => (event) => {
      updateField(field, event.target.value);
    },
    [updateField]
  );

  const handlers = useMemo(
    () => ({
      subject: createChangeHandler('subject'),
      title: createChangeHandler('title'),
      introText: createChangeHandler('introText'),
      buttonText: createChangeHandler('buttonText'),
      footerText: createChangeHandler('footerText'),
      brandName: createChangeHandler('brandName'),
      backgroundColor: createChangeHandler('backgroundColor'),
      buttonColor: createChangeHandler('buttonColor'),
    }),
    [createChangeHandler]
  );

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      setSaving(true);
      setMessage('');
      setError('');
      try {
        const data = await apiRequest('/admin/settings/password-reset-email-template', {
          method: 'PATCH',
          body: form,
        });
        setForm({ ...EMPTY_TEMPLATE, ...(data.template || {}) });
        setMessage('Email template saved.');
      } catch (err) {
        setError(err.message || 'Failed to save email template.');
      } finally {
        setSaving(false);
      }
    },
    [form]
  );

  return useMemo(
    () => ({
      form,
      handlers,
      loading,
      saving,
      message,
      error,
      handleSubmit,
    }),
    [form, handlers, loading, saving, message, error, handleSubmit]
  );
}

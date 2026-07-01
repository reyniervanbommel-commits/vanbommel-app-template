import React from 'react';
import {
  Button,
  Card,
  Field,
  Input,
  Spinner,
  Text,
  Textarea,
  makeStyles,
  shorthands,
  tokens,
} from '@fluentui/react-components';
import { Save24Regular } from '@fluentui/react-icons';
import { usePasswordResetEmailTemplate } from './usePasswordResetEmailTemplate';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('16px'),
    maxWidth: '980px',
  },
  form: {
    display: 'grid',
    gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)',
    ...shorthands.gap('16px'),
  },
  full: { gridColumn: '1 / -1' },
  actions: { display: 'flex', justifyContent: 'flex-end', gridColumn: '1 / -1' },
  success: { color: tokens.colorPaletteGreenForeground1 },
  error: { color: tokens.colorPaletteRedForeground1 },
  previewContainer: {
    ...shorthands.padding('24px'),
    ...shorthands.borderRadius('8px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('10px'),
  },
  previewCard: {
    backgroundColor: '#ffffff',
    ...shorthands.borderRadius('12px'),
    ...shorthands.padding('20px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
  },
  previewButton: {
    display: 'inline-block',
    color: '#ffffff',
    textDecorationLine: 'none',
    ...shorthands.borderRadius('8px'),
    ...shorthands.padding('10px', '16px'),
    fontWeight: tokens.fontWeightSemibold,
    width: 'fit-content',
  },
  hint: {
    color: tokens.colorNeutralForeground3,
  },
});

export default function PasswordResetEmailTemplateSettings() {
  const styles = useStyles();
  const { form, handlers, loading, saving, message, error, handleSubmit } = usePasswordResetEmailTemplate();

  if (loading) {
    return <Spinner label="Loading email template..." />;
  }

  return (
    <div className={styles.container}>
      <Text size={600} weight="semibold">Password reset email template</Text>
      <Text className={styles.hint}>
        Customize the email content users receive when they reset their password.
      </Text>

      {message ? <Text className={styles.success}>{message}</Text> : null}
      {error ? <Text className={styles.error}>{error}</Text> : null}

      <form className={styles.form} onSubmit={handleSubmit}>
        <Field label="Subject" required>
          <Input value={form.subject} onChange={handlers.subject} maxLength={120} />
        </Field>

        <Field label="Brand name" required>
          <Input value={form.brandName} onChange={handlers.brandName} maxLength={80} />
        </Field>

        <Field label="Title" required>
          <Input value={form.title} onChange={handlers.title} maxLength={120} />
        </Field>

        <Field label="Button text" required>
          <Input value={form.buttonText} onChange={handlers.buttonText} maxLength={80} />
        </Field>

        <Field className={styles.full} label="Intro text" required>
          <Textarea value={form.introText} onChange={handlers.introText} maxLength={600} resize="vertical" />
        </Field>

        <Field className={styles.full} label="Footer text" required>
          <Textarea value={form.footerText} onChange={handlers.footerText} maxLength={500} resize="vertical" />
        </Field>

        <Field label="Background color (hex)">
          <Input value={form.backgroundColor} onChange={handlers.backgroundColor} maxLength={7} />
        </Field>

        <Field label="Button color (hex)">
          <Input value={form.buttonColor} onChange={handlers.buttonColor} maxLength={7} />
        </Field>

        <Card className={styles.full}>
          <Text weight="semibold">Preview</Text>
          <div className={styles.previewContainer} style={{ backgroundColor: form.backgroundColor }}>
            <div className={styles.previewCard}>
              <Text size={200}>{form.brandName}</Text>
              <Text size={600} weight="semibold">{form.title}</Text>
              <Text>{form.introText}</Text>
              <Text className={styles.previewButton} style={{ backgroundColor: form.buttonColor }}>
                {form.buttonText}
              </Text>
              <Text size={200}>{form.footerText}</Text>
            </div>
          </div>
        </Card>

        <div className={styles.actions}>
          <Button appearance="primary" type="submit" icon={<Save24Regular />} disabled={saving}>
            {saving ? 'Saving...' : 'Save template'}
          </Button>
        </div>
      </form>
    </div>
  );
}

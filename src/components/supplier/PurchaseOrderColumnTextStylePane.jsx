import React from 'react';
import { Button, Input, Text } from '@fluentui/react-components';

export default function PurchaseOrderColumnTextStylePane({
  styles,
  textStyleDraft,
  handleTextColorChange,
  handleToggleBold,
  handleToggleItalic,
  handleToggleUnderline,
  columnLabel,
  handleApplyTextStyle,
  handleClearTextStyle,
}) {
  return (
    <>
      <Text className={styles.subPaneTitle}>Text style</Text>
      <div className={styles.colorRow}>
        <Input
          className={styles.colorInput}
          type="color"
          value={textStyleDraft.textColor || '#000000'}
          onChange={handleTextColorChange}
          aria-label={`Select text color for ${columnLabel}`}
        />
        <Text>{(textStyleDraft.textColor || '#000000').toUpperCase()}</Text>
      </div>
      <div className={styles.formatButtons}>
        <Button
          className={styles.formatButton}
          size="small"
          appearance={textStyleDraft.bold ? 'primary' : 'secondary'}
          onClick={handleToggleBold}
          aria-label="Toggle bold"
        >
          B
        </Button>
        <Button
          className={styles.formatButton}
          size="small"
          appearance={textStyleDraft.italic ? 'primary' : 'secondary'}
          onClick={handleToggleItalic}
          aria-label="Toggle italic"
        >
          I
        </Button>
        <Button
          className={styles.formatButton}
          size="small"
          appearance={textStyleDraft.underline ? 'primary' : 'secondary'}
          onClick={handleToggleUnderline}
          aria-label="Toggle underline"
        >
          U
        </Button>
      </div>
      <Text
        className={styles.stylePreview}
        style={{
          color: textStyleDraft.textColor || undefined,
          fontWeight: textStyleDraft.bold ? 700 : undefined,
          fontStyle: textStyleDraft.italic ? 'italic' : undefined,
          textDecorationLine: textStyleDraft.underline ? 'underline' : undefined,
        }}
      >
        Preview text
      </Text>
      <div className={styles.actionRow}>
        <Button size="small" appearance="primary" onClick={handleApplyTextStyle}>Apply</Button>
        <Button size="small" appearance="secondary" onClick={handleClearTextStyle}>Reset</Button>
      </div>
    </>
  );
}

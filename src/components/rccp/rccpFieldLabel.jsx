import React from 'react';
import { InfoLabel } from '@fluentui/react-components';

/**
 * Field-label met optionele Fluent (i)-uitleg.
 * @param {string} text
 * @param {string} [info]
 */
export function rccpFieldLabel(text, info) {
  if (!info) return text;
  return {
    children: (props) => (
      <InfoLabel {...props} info={info}>{text}</InfoLabel>
    ),
  };
}

/**
 * Switch- of sectielabel met (i).
 * @param {{ info: string, children: import('react').ReactNode }} props
 */
export function RccpInfoLabel({ info, children }) {
  return <InfoLabel info={info}>{children}</InfoLabel>;
}

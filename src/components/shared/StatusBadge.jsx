import React from 'react';
import { Badge } from '@fluentui/react-components';

const variantMap = { success: 'success', warning: 'warning', error: 'danger', neutral: 'informative' };

export default function StatusBadge({ variant, children }) {
  return <Badge appearance="filled" color={variantMap[variant || 'neutral'] || 'informative'}>{children}</Badge>;
}

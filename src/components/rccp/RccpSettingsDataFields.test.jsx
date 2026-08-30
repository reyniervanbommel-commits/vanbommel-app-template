import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import RccpSettingsDataFields from './RccpSettingsDataFields';

const COLUMNS = [
  { key: 'vendorAccount', label: 'Vendor', dataType: 'text', scope: 'master' },
  { key: 'requestedDeliveryDate', label: 'Requested', dataType: 'date', scope: 'detail' },
  { key: 'itemName', label: 'Artikelnaam', dataType: 'text', scope: 'detail' },
];

function wrap(ui) {
  return <FluentProvider theme={webLightTheme}>{ui}</FluentProvider>;
}

describe('RccpSettingsDataFields', () => {
  it('toont geen artikelnaam in de datumvelden', () => {
    render(wrap(
      <RccpSettingsDataFields
        config={{
          vendorColumnKey: 'vendorAccount',
          dateColumnKey: 'requestedDeliveryDate',
          confirmedDateColumnKey: '',
          receiptDateColumnKey: '',
          excludedStatuses: [],
        }}
        columns={COLUMNS}
        statusOptions={[]}
        compact
        onUpdateField={vi.fn()}
      />,
    ));
    expect(screen.getByText('Requested delivery date')).toBeTruthy();
    expect(screen.getByText('Confirmed delivery date')).toBeTruthy();
    expect(screen.queryByText('Artikelnaam')).toBeNull();
  });
});

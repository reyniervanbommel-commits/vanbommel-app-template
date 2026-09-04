// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithFluent } from '../../../test-utils/render';
import DataModelCollapsibleSection from './DataModelCollapsibleSection';

describe('DataModelCollapsibleSection', () => {
  it('klapt in en uit via de titelknop', () => {
    renderWithFluent(
      <DataModelCollapsibleSection title="PO board columns">
        <div>Sole name</div>
      </DataModelCollapsibleSection>,
    );
    expect(screen.getByText('Sole name')).toBeTruthy();
    const toggle = screen.getByRole('button', { name: 'Collapse PO board columns' });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(toggle);
    expect(screen.queryByText('Sole name')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand PO board columns' }).getAttribute('aria-expanded')).toBe('false');
  });

  it('toont de inhoud altijd als collapsible uit staat', () => {
    renderWithFluent(
      <DataModelCollapsibleSection title="Vendors columns" collapsible={false}>
        <div>Vendor account</div>
      </DataModelCollapsibleSection>,
    );
    expect(screen.getByText('Vendor account')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Vendors columns/ })).toBeNull();
  });
});

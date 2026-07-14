// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import RemarkComposer from './RemarkComposer';
import RemarkMessageCard from './RemarkMessageCard';
import RemarkReactionBar from './RemarkReactionBar';
import RemarksLatestCell from './RemarksLatestCell';
import RowRemarksBadge from './RowRemarksBadge';

function renderWithFluent(component) {
  return render(<FluentProvider theme={webLightTheme}>{component}</FluentProvider>);
}

const REMARK = {
  id: 7,
  body: '<strong>Plain text only</strong>',
  author: { id: 2, displayName: 'Alex Buyer' },
  createdAt: '2026-07-13T10:00:00.000Z',
  canDelete: true,
  reactions: [],
};

describe('remarks components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('behoudt de draft bij een mislukte submit en wist hem na succes', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('Save failed')).mockResolvedValueOnce({ id: 1 });
    renderWithFluent(<RemarkComposer currentUser={{ displayName: 'Taylor' }} onSubmit={onSubmit} />);

    const composer = screen.getByLabelText(/Add a remark as/);
    fireEvent.change(composer, { target: { value: 'Needs follow-up' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add remark' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Save failed');
    expect(composer.value).toBe('Needs follow-up');

    fireEvent.click(screen.getByRole('button', { name: 'Add remark' }));
    await waitFor(() => expect(composer.value).toBe(''));
  });

  it('toont uitsluitend whitelist-reacties met aria-pressed', () => {
    renderWithFluent(
      <RemarkReactionBar
        remarkId={7}
        reactions={[{ emoji: '👍', count: 2, reactedByCurrentUser: true }]}
        onToggle={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(screen.getByRole('button', { name: 'Remove 👍 reaction' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByText('🚀')).toBeNull();
  });

  it('schakelt reacties op een eigen remark toegankelijk uit', () => {
    renderWithFluent(<RemarkReactionBar remarkId={7} ownRemark reactions={[]} onToggle={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(
      screen.getByRole('button', {
        name: '👍 reactions are unavailable on your own remark',
      }).disabled
    ).toBe(true);
  });

  it('toont een inline fout wanneer een reactie niet kan worden opgeslagen', async () => {
    renderWithFluent(
      <RemarkReactionBar
        remarkId={7}
        reactions={[]}
        onToggle={vi.fn().mockRejectedValue(new Error('Reaction failed'))}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add 👍 reaction' }));
    expect((await screen.findByRole('alert')).textContent).toContain('Reaction failed');
  });

  it('rendert remarktekst letterlijk en bevestigt delete inline', async () => {
    const onDelete = vi.fn().mockResolvedValue({});
    renderWithFluent(
      <RemarkMessageCard remark={REMARK} currentUser={{ id: 2 }} onDelete={onDelete} onReaction={vi.fn()} />
    );

    expect(screen.getByText('<strong>Plain text only</strong>')).toBeTruthy();
    expect(document.querySelector('strong')?.textContent).not.toBe('Plain text only');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('group', { name: 'Confirm remark deletion' })).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(7));
  });

  it('geeft de opener terug vanuit badge en latest-cel', () => {
    const onOpen = vi.fn();
    renderWithFluent(
      <>
        <RowRemarksBadge count={3} orderNumber="PO-1" onOpen={onOpen} />
        <RemarksLatestCell
          orderNumber="PO-1"
          summary={{ count: 3, latest: { bodyPreview: 'Latest', authorName: 'Alex' } }}
          onOpen={onOpen}
        />
      </>
    );

    const badge = screen.getByRole('button', { name: /Open 3 remarks/ });
    fireEvent.click(badge);
    expect(onOpen).toHaveBeenLastCalledWith(badge);
    const cell = screen.getByRole('button', { name: /Open remarks/ });
    fireEvent.click(cell);
    expect(onOpen).toHaveBeenLastCalledWith(cell);
  });
});

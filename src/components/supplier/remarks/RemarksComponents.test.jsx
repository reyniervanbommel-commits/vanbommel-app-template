// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import RemarkComposer from './RemarkComposer';
import RemarkMessageCard from './RemarkMessageCard';
import RemarkReactionBar from './RemarkReactionBar';
import RemarksLatestCell from './RemarksLatestCell';
import RowHistoryEntry from './RowHistoryEntry';
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

  it('formatteert ISO-datums in history als dd/mm/jjjj', () => {
    renderWithFluent(
      <RowHistoryEntry
        entry={{
          action: 'UPDATE',
          columnLabel: 'Leverdatum',
          oldValue: '2026-04-09T00:00:00.000Z',
          newValue: '2026-04-09T12:00:00.000Z',
          createdAt: '2026-07-14T08:06:00.000Z',
        }}
      />
    );

    expect(screen.getAllByText('09/04/2026')).toHaveLength(2);
    expect(screen.queryByText(/2026-04-09T/)).toBeNull();
  });

  it('gebruikt display_name uit de sessie voor de composer-avatar', () => {
    renderWithFluent(
      <RemarkComposer currentUser={{ display_name: 'Reynier van Bommel', email: 'reynier@example.com' }} onSubmit={vi.fn()} />
    );

    expect(screen.getByText('RB')).toBeTruthy();
    expect(screen.queryByText('CU')).toBeNull();
  });

  it('behoudt de draft bij een mislukte submit en wist hem na succes', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce(new Error('Save failed')).mockResolvedValueOnce({ id: 1 });
    renderWithFluent(<RemarkComposer currentUser={{ displayName: 'Taylor' }} onSubmit={onSubmit} />);

    const composer = screen.getByLabelText('Add a remark');
    fireEvent.change(composer, { target: { value: 'Needs follow-up' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add remark' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Save failed');
    expect(composer.value).toBe('Needs follow-up');

    fireEvent.click(screen.getByRole('button', { name: 'Add remark' }));
    await waitFor(() => expect(composer.value).toBe(''));
  });

  it('toont uitsluitend whitelist-reacties achter een Like-knop', async () => {
    const onToggle = vi.fn();
    renderWithFluent(
      <RemarkReactionBar
        remarkId={7}
        reactions={[{ emoji: '😊', count: 1, reactedByCurrentUser: false }]}
        onToggle={onToggle}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Like (1)' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Add 😊 reaction/ }));
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(7, '😊', true));
  });

  it('schakelt reacties op een eigen remark toegankelijk uit', () => {
    renderWithFluent(<RemarkReactionBar remarkId={7} ownRemark reactions={[]} onToggle={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Reactions are unavailable on your own remark' }).disabled).toBe(true);
  });

  it('toont een inline fout wanneer een reactie niet kan worden opgeslagen', async () => {
    renderWithFluent(
      <RemarkReactionBar
        remarkId={7}
        reactions={[]}
        onToggle={vi.fn().mockRejectedValue(new Error('Reaction failed'))}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Like' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /Add 😊 reaction/ }));
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

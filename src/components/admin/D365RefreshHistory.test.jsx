// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithFluent } from '../../test-utils/render';
import D365RefreshHistory from './D365RefreshHistory';

describe('D365RefreshHistory', () => {
  it('toont de duur van een afgeronde run', () => {
    renderWithFluent(
      <D365RefreshHistory
        runs={[{
          id: 1,
          status: 'done',
          source: 'manual',
          started_at: '2026-08-23T00:00:00.000Z',
          finished_at: '2026-08-23T00:12:04.000Z',
          fetched_total: 10,
          inserted_total: 1,
          updated_total: 2,
          deleted_total: 0,
        }]}
      />,
    );
    expect(screen.getByText('12m 04s')).toBeTruthy();
  });
});

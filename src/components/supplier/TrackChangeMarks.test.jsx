import React from 'react';
import { render } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { describe, expect, it } from 'vitest';
import TrackChangeMarks from './TrackChangeMarks';

function renderMarks(props) {
  return render(
    <FluentProvider theme={webLightTheme}>
      <TrackChangeMarks {...props} />
    </FluentProvider>,
  );
}

describe('TrackChangeMarks', () => {
  it('renders nothing without a pattern', () => {
    const { container } = renderMarks({ pattern: '' });
    expect(container.querySelector('div[aria-label]')).toBeNull();
  });

  it('renders one dot per mark with an accessible label', () => {
    const { container } = renderMarks({ pattern: 'yyyyyyyr', mode: 'session' });
    const node = container.querySelector('div[aria-label]');
    expect(node).not.toBeNull();
    expect(node.getAttribute('aria-label')).toContain('session');
    expect(node.querySelectorAll('span')).toHaveLength(8);
  });

  it('reports the number of changed buckets in week mode', () => {
    const { container } = renderMarks({ pattern: 'rrgggggg', mode: 'week' });
    const node = container.querySelector('div[aria-label]');
    expect(node.getAttribute('aria-label')).toContain('2');
    expect(node.getAttribute('aria-label')).toContain('week');
  });

  it('scales dot size, gap and bottom offset with table zoom', () => {
    const { container } = renderMarks({ pattern: 'yyyyy' });
    const wrapper = container.querySelector('div[aria-label]');
    expect(wrapper.style.bottom).toBe('calc(2px * var(--po-table-zoom, 0.85))');
    expect(wrapper.style.gap).toBe('calc(3px * var(--po-table-zoom, 0.85))');
    const dot = wrapper.querySelector('span');
    expect(dot.style.width).toBe('calc(8px * var(--po-table-zoom, 0.85))');
    expect(dot.style.height).toBe('calc(8px * var(--po-table-zoom, 0.85))');
  });
});

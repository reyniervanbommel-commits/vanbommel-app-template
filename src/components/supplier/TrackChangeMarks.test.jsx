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
    const { container } = renderMarks({ pattern: 'yyyyr', mode: 'session' });
    const node = container.querySelector('div[aria-label]');
    expect(node).not.toBeNull();
    expect(node.getAttribute('aria-label')).toContain('sessie');
    expect(node.querySelectorAll('span')).toHaveLength(5);
  });

  it('reports the number of changed buckets in week mode', () => {
    const { container } = renderMarks({ pattern: 'rrggg', mode: 'week' });
    const node = container.querySelector('div[aria-label]');
    expect(node.getAttribute('aria-label')).toContain('2');
    expect(node.getAttribute('aria-label')).toContain('week');
  });
});

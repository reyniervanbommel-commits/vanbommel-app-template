// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { render } from '@testing-library/react';
import { applyClassTokens, useRccpChartFlash } from './useRccpChartFlash';

function FlashProbe({ signature }) {
  const ref = useRccpChartFlash(signature);
  return <div ref={ref}>flash-ok</div>;
}

describe('applyClassTokens', () => {
  it('adds and removes space-separated atomic classes', () => {
    const node = document.createElement('div');
    applyClassTokens(node, 'foo bar', true);
    expect(node.classList.contains('foo')).toBe(true);
    expect(node.classList.contains('bar')).toBe(true);
    applyClassTokens(node, 'foo bar', false);
    expect(node.classList.contains('foo')).toBe(false);
    expect(node.classList.contains('bar')).toBe(false);
  });
});

describe('useRccpChartFlash', () => {
  it('does not crash when the signature changes after mount', () => {
    const { rerender, container } = render(
      <FluentProvider theme={webLightTheme}>
        <FlashProbe signature="a" />
      </FluentProvider>,
    );
    rerender(
      <FluentProvider theme={webLightTheme}>
        <FlashProbe signature="b" />
      </FluentProvider>,
    );
    expect(container.textContent).toContain('flash-ok');
  });
});

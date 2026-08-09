import { render } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

// Herbruikbare RTL-render-wrapper voor componenten die FluentProvider nodig
// hebben (context voor tokens/styling). Patroon overgenomen uit
// src/components/rccp/RccpVendorFilter.test.jsx.
export function renderWithFluent(ui, options) {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>, options);
}

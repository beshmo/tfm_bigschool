import { screen, within } from '@testing-library/react';
import { getAppVersion } from './config';
import { FakeOkvnsApi } from './test/fake-api';
import { renderApp } from './test/render';

it('prints the current admin version in the footer', () => {
  renderApp(new FakeOkvnsApi(), '/import');
  const footer = screen.getByRole('contentinfo');

  expect(within(footer).getByText('OKVNS Admin')).toBeInTheDocument();
  expect(within(footer).getByText(`v${getAppVersion()}`)).toBeInTheDocument();
});

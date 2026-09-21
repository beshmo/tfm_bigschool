import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import pkg from '../package.json';
import { App } from './App';
import { FakeApi } from './test/fake-api';
import { renderWithProviders } from './test/render';

describe('App shell', () => {
  it('GIVEN the app WHEN it renders THEN the header shows the brand and the three navigation links', () => {
    renderWithProviders(<App />, { api: new FakeApi() });

    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(nav).toHaveTextContent('OKVNS Admin');
    expect(screen.getByRole('link', { name: 'Namespaces' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Import' })).toHaveAttribute('href', '/import');
    expect(screen.getByRole('link', { name: 'Export' })).toHaveAttribute('href', '/export');
  });

  it.each([
    ['/', 'Namespaces', 'Namespaces'],
    ['/import', 'Import', 'Import YAML'],
    ['/export', 'Export', 'Export YAML'],
  ])(
    'GIVEN the route %s WHEN it renders THEN the %s link is current and the page is shown',
    (route, link, heading) => {
      renderWithProviders(<App />, { api: new FakeApi(), route });

      expect(screen.getByRole('link', { name: link })).toHaveAttribute('aria-current', 'page');
      expect(screen.getAllByRole('link', { current: 'page' })).toHaveLength(1);
      expect(screen.getByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
    },
  );

  it('GIVEN a namespace address WHEN it renders THEN the detail page is shown', async () => {
    renderWithProviders(<App />, {
      api: new FakeApi().seed('billing'),
      route: '/namespaces/billing',
    });

    expect(await screen.findByRole('heading', { name: 'billing', level: 1 })).toBeInTheDocument();
  });

  it('GIVEN an unknown address WHEN it renders THEN a not-found page is shown', () => {
    renderWithProviders(<App />, { api: new FakeApi(), route: '/nowhere' });

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('GIVEN the footer WHEN it renders THEN it shows the brand and the admin package version', () => {
    renderWithProviders(<App />, { api: new FakeApi() });

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('OKVNS Admin');
    expect(footer).toHaveTextContent(`v${pkg.version}`);
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

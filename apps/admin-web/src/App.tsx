import { NavLink, Route, Routes } from 'react-router-dom';
import { Icon } from './components/Icon';
import { ExportPage } from './pages/ExportPage';
import { ImportPage } from './pages/ImportPage';
import { NamespaceDetailPage } from './pages/NamespaceDetailPage';
import { NamespacesPage } from './pages/NamespacesPage';

export function App() {
  return (
    <>
      <header className="site-header">
        <nav className="nav" aria-label="Main">
          <span className="brand-lockup">
            <span className="logo-mark">
              <Icon name="brackets" size={24} />
            </span>
            <span className="nav-brand">OKVNS Admin</span>
          </span>
          <NavLink to="/" end>
            Namespaces
          </NavLink>
          <NavLink to="/import">Import</NavLink>
          <NavLink to="/export">Export</NavLink>
        </nav>
      </header>
      <main className="wrap">
        <Routes>
          <Route path="/" element={<NamespacesPage />} />
          <Route path="/namespaces/:name" element={<NamespaceDetailPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route
            path="*"
            element={
              <div className="page-head">
                <div>
                  <h1>Page not found</h1>
                  <p className="sub">That address does not exist in the admin.</p>
                </div>
              </div>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer">
        <span className="footer-mark">
          <span className="logo-mark">
            <Icon name="brackets" size={16} />
          </span>
          OKVNS Admin
        </span>
        <span className="footer-version">v{__APP_VERSION__}</span>
      </footer>
    </>
  );
}

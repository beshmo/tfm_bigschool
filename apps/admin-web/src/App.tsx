import { NavLink, Route, Routes } from 'react-router-dom';
import { NamespacesPage } from './pages/NamespacesPage';
import { NamespaceDetailPage } from './pages/NamespaceDetailPage';
import { ImportPage } from './pages/ImportPage';
import { ExportPage } from './pages/ExportPage';
import { Icon } from './components/Icon';
import { ToastProvider } from './components/Toast';

export function App() {
  return (
    <ToastProvider>
      <header className="site-header">
        {/* NavLink marks the active route with aria-current="page", which is the
            attribute the design system's nav styling keys off. */}
        <nav className="nav">
          <span className="brand-lockup">
            <span className="logo-mark">
              <Icon name="brackets" size={20} />
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
        </Routes>
      </main>

      <footer className="site-footer">
        <span className="footer-mark">
          <span className="logo-mark">
            <Icon name="brackets" />
          </span>
          OKVNS Admin
        </span>
      </footer>
    </ToastProvider>
  );
}

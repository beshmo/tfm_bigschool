import { NavLink, Route, Routes } from 'react-router-dom';
import { NamespacesPage } from './pages/NamespacesPage';
import { NamespaceDetailPage } from './pages/NamespaceDetailPage';
import { ImportPage } from './pages/ImportPage';
import { ExportPage } from './pages/ExportPage';

export function App() {
  return (
    <div className="app">
      <header>
        <h1 className="brand">OKVNS Admin</h1>
        <nav>
          <NavLink to="/" end>
            Namespaces
          </NavLink>
          <NavLink to="/import">Import</NavLink>
          <NavLink to="/export">Export</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<NamespacesPage />} />
          <Route path="/namespaces/:name" element={<NamespaceDetailPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Routes>
      </main>
    </div>
  );
}

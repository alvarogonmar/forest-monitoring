import { Navigate, Outlet, Route, Routes } from 'react-router'
import SiteHeader from './components/SiteHeader.jsx'
import HomePage from './pages/HomePage.jsx'
import RoutesPage from './pages/RoutesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import AdminMapPage from './pages/AdminMapPage.jsx'
import AdminCountsPage from './pages/AdminCountsPage.jsx'
import AdminRequestsPage from './pages/AdminRequestsPage.jsx'
import './App.css'

function PublicLayout() {
  return (
    <>
      <SiteHeader />
      <Outlet />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/rutas" element={<RoutesPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="*"
          element={
            <main className="routes-page">
              <h1>Página no encontrada</h1>
              <p>Utiliza el menú para volver a Inicio o Rutas.</p>
            </main>
          }
        />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="mapa" replace />} />
        <Route path="mapa" element={<AdminMapPage />} />
        <Route path="conteos" element={<AdminCountsPage />} />
        <Route path="solicitudes" element={<AdminRequestsPage />} />
      </Route>
    </Routes>
  )
}

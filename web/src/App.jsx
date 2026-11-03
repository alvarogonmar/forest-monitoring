import { Route, Routes } from 'react-router'
import SiteHeader from './components/SiteHeader.jsx'
import HomePage from './pages/HomePage.jsx'
import RoutesPage from './pages/RoutesPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import './App.css'

export default function App() {
  return (
    <>
      <SiteHeader />

      <Routes>
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
      </Routes>
    </>
  )
}

import forestImage from '../assets/forest.png'
import VisitTips from '../components/VisitTips.jsx'


export default function HomePage() {
  return (
    <main>
      <section
        className="home-hero"
        aria-labelledby="home-title"
        style={{ backgroundImage: `url(${forestImage})` }}
      >
        <div className="home-hero-content">
          <p className="home-eyebrow">
            EXPLORA · CONOCE · CUIDA
          </p>

          <h1 id="home-title">
            Descubre el Bosque
            <br />
            de La Primavera
          </h1>

          <p className="home-description">
            Conoce los senderos y prepara tu recorrido.
          </p>

          <button className="home-cta" type="button" disabled>
            Explorar rutas
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
      <VisitTips />
    </main>
  )
}
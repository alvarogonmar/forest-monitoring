import './VisitTips.css'

const tips = [
  {
    id: 'water',
    title: 'Lleva agua',
    description: 'Mantente hidratado durante tu recorrido.',
    icon: 'M9 2h6v4l3 4v12H6V10l3-4V2Zm0 4h6',
  },
  {
    id: 'trail',
    title: 'Sigue los senderos',
    description: 'Camina solo por las rutas autorizadas.',
    icon: 'M8 2c14 6-8 9 6 15 9 5-5 6-5 6',
  },
  {
    id: 'leaf',
    title: 'Cuida el entorno',
    description: 'Respeta la flora, la fauna y no dejes residuos.',
    icon: 'M20 3C4 1 0 11 8 17c9 6 15-6 12-14ZM4 22 17 7',
  },
]

export default function VisitTips() {
  return (
    <section
      className="visit-tips"
      id="visita"
      aria-labelledby="visit-title"
    >
      <p className="visit-eyebrow">PREPARA TU VISITA</p>
      <h2 id="visit-title">Disfruta el camino. Cuida el bosque.</h2>

      <div className="visit-tips-grid">
        {tips.map((tip) => (
          <article className="visit-card" key={tip.id}>
            <div className="visit-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={tip.icon} />
              </svg>
            </div>

            <div>
              <h3>{tip.title}</h3>
              <p>{tip.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
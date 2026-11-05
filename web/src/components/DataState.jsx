import './DataState.css'

export default function DataState({ status, onRetry, emptyMessage = 'Todavía no hay datos disponibles.' }) {
  const loading = status === 'loading'
  const failed = status === 'error'

  return (
    <div className="data-state" role={failed ? 'alert' : 'status'} aria-busy={loading}>
      <p>{loading ? 'Cargando datos…' : failed ? 'No se pudieron cargar los datos.' : emptyMessage}</p>
      {failed && <p>Comprueba tu conexión e inténtalo de nuevo.</p>}
      {!loading && onRetry && (
        <button type="button" onClick={onRetry}>
          {failed ? 'Reintentar' : 'Actualizar'}
        </button>
      )}
    </div>
  )
}

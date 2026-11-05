import { useEffect, useState } from 'react'
import { divIcon, latLngBounds } from 'leaflet'
import {
  CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './RoutesMap.css'

const finishIcon = divIcon({
  className: 'route-finish-marker',
  html: '<span aria-hidden="true">⚑</span>',
  iconSize: [28, 32],
  iconAnchor: [14, 29],
})

function MapViewport({ routes, selectedId }) {
  const map = useMap()

  useEffect(() => {
    const selected = routes.find((route) => route.id === selectedId)
    const points = selected
      ? selected.coordinates
      : routes.flatMap((route) => route.coordinates)

    map.fitBounds(latLngBounds(points), { padding: [45, 45], maxZoom: 15 })
  }, [map, routes, selectedId])

  return null
}

export default function RoutesMap({ routes, selectedId, onSelect, children, showEndpoints = true }) {
  const [tileError, setTileError] = useState(false)
  const [tileVersion, setTileVersion] = useState(0)
  const bounds = latLngBounds(routes.flatMap((route) => route.coordinates))

  return (
    <section className="routes-map-section" aria-label="Mapa de recorridos de demostración">
      <div className="routes-map-frame">
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [45, 45] }}
          className="routes-map"
          scrollWheelZoom={false}
        >
          <TileLayer
            key={tileVersion}
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            maxZoom={19}
            eventHandlers={{ tileerror: () => setTileError(true) }}
          />
          <MapViewport routes={routes} selectedId={selectedId} />

          {routes.map((route) => {
            const selected = selectedId === route.id
            const opacity = selectedId && !selected ? 0.35 : 1

            return (
              <Polyline
                key={route.id}
                positions={route.coordinates}
                pathOptions={{ color: route.color, weight: selected ? 7 : 5, opacity }}
                eventHandlers={{ click: () => onSelect(route.id) }}
              >
                <Tooltip sticky>{route.name} · Demostración</Tooltip>
              </Polyline>
            )
          })}

          {showEndpoints && routes.filter((route) => !selectedId || route.id === selectedId).map((route) => (
            <CircleMarker
              key={`start-${route.id}`}
              center={route.coordinates[0]}
              radius={7}
              pathOptions={{ color: '#fff', weight: 3, fillColor: route.color, fillOpacity: 1 }}
              eventHandlers={{ click: () => onSelect(route.id) }}
            >
              <Tooltip>Inicio · {route.name}</Tooltip>
            </CircleMarker>
          ))}

          {showEndpoints && routes.filter((route) => !selectedId || route.id === selectedId).map((route) => (
            <Marker
              key={`finish-${route.id}`}
              position={route.coordinates.at(-1)}
              icon={finishIcon}
              eventHandlers={{ click: () => onSelect(route.id) }}
              title={`Final · ${route.name}`}
              alt={`Final del recorrido de demostración ${route.name}`}
            >
              <Tooltip>Final · {route.name}</Tooltip>
            </Marker>
          ))}
          {children}
        </MapContainer>
        <span className="routes-map-badge">Recorridos ficticios</span>
      </div>

      <div className="routes-map-legend">
        {showEndpoints ? <><span>● Inicio</span><span>⚑ Final</span></> : <span>● Punto de monitoreo</span>}
        <span>Usa + / − para acercarte o alejarte.</span>
      </div>
      <p className="routes-map-note">
        Mapa geográfico real. Los trazos son ejemplos para probar la aplicación;
        no representan senderos verificados ni deben usarse para orientarse.
      </p>
      {tileError && (
        <div className="routes-map-error" role="status">
          <p>No se pudo cargar parte del mapa de fondo. Comprueba tu conexión.</p>
          <button type="button" onClick={() => {
            setTileError(false)
            setTileVersion((version) => version + 1)
          }}>
            Reintentar mapa
          </button>
        </div>
      )}
    </section>
  )
}

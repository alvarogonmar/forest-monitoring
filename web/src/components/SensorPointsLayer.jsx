import { divIcon } from 'leaflet'
import { Marker, Tooltip } from 'react-leaflet'

function sensorIcon(selected) {
  return divIcon({
    className: `sensor-marker${selected ? ' sensor-marker-selected' : ''}`,
    html: '<svg viewBox="0 0 32 40" aria-hidden="true"><path d="M16 1C8 1 2 7 2 15c0 10 14 23 14 23s14-13 14-23C30 7 24 1 16 1Z" fill="currentColor" stroke="white" stroke-width="3"/><circle cx="16" cy="15" r="5" fill="white"/></svg>',
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    tooltipAnchor: [14, -22],
  })
}

const defaultIcon = sensorIcon(false)
const selectedIcon = sensorIcon(true)

export default function SensorPointsLayer({ points, selectedId, onSelect }) {
  return points.map((point) => (
    <Marker
      key={point.id}
      position={point.coordinates}
      icon={selectedId === point.id ? selectedIcon : defaultIcon}
      title={`Punto de monitoreo ${point.id}`}
      alt={`Seleccionar punto de monitoreo ${point.id}`}
      zIndexOffset={selectedId === point.id ? 1000 : 0}
      eventHandlers={{ click: () => onSelect(point.id) }}
    >
      <Tooltip permanent direction="right" className="sensor-marker-label">
        {point.id}
      </Tooltip>
    </Marker>
  ))
}

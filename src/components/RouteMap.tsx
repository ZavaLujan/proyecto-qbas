import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, Tooltip } from 'react-leaflet';
import { Icon, LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Location, Route, Vehicle } from '../models/types';

interface RouteMapProps {
  depot: Location;
  routes: Route[];
  vehicles: Vehicle[];
  unassignedLocations: Location[];
  customers: Location[];
  onUpdateCustomers?: (customers: Location[]) => void;
}

// Componente auxiliar para acceder a la instancia del mapa
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

// Componente para manejar los clics en el mapa
function MapClickHandler({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    }
  });
  
  return null;
}

// Corregimos el problema de los iconos de marcadores en Leaflet
const defaultIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const depotIcon = new Icon({
  ...defaultIcon.options,
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// Crear un icono con color personalizado
const createColoredIcon = (color: string) => {
  // Usar algunos colores predefinidos de marcadores de Leaflet
  const colorMap: {[key: string]: string} = {
    '#FF5733': 'red',
    '#33FF57': 'green',
    '#3357FF': 'blue',
    '#FF33A8': 'violet',
    '#33FFF0': 'blue',
    '#F0FF33': 'yellow',
    '#9033FF': 'violet',
    '#FF9033': 'orange',
    '#33FFAA': 'green',
    '#FF33DD': 'pink',
  };
  
  // Obtener el nombre del color más cercano o usar 'blue' por defecto
  const colorName = colorMap[color] || 'blue';
  
  return new Icon({
    ...defaultIcon.options,
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${colorName}.png`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
  });
};

export default function RouteMap({ 
  depot, 
  routes, 
  vehicles, 
  unassignedLocations,
  customers = [],
  onUpdateCustomers
}: RouteMapProps) {
  // Coordenadas exactas del Cercado de Lima, Perú (Plaza Mayor/Plaza de Armas)
  const LIMA_COORDINATES: [number, number] = [-12.0453, -77.0311];
  
  const [center, setCenter] = useState<[number, number]>(LIMA_COORDINATES);
  const zoom = 15; // Zoom fijo ya que no se modifica
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerPosition, setNewCustomerPosition] = useState<LatLng | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerDemand, setNewCustomerDemand] = useState(10);
  const [newCustomerServiceTime, setNewCustomerServiceTime] = useState(15);
  const [newCustomerReadyTime, setNewCustomerReadyTime] = useState(480); // 8:00 AM
  const [newCustomerDueTime, setNewCustomerDueTime] = useState(1020); // 17:00 (5:00 PM)
  
  // Asigna colores a los clientes
  const [customerColors] = useState<{[key: string]: string}>(() => {
    const colors: {[key: string]: string} = {};
    const availableColors = [
      '#FF5733', '#33FF57', '#3357FF', '#FF33A8', '#33FFF0', 
      '#F0FF33', '#9033FF', '#FF9033', '#33FFAA', '#FF33DD',
      '#5E33FF', '#FF5E33', '#33FFA8', '#A833FF', '#33FFFF'
    ];
    
    customers.forEach((customer, index) => {
      colors[customer.id] = availableColors[index % availableColors.length];
    });
    
    return colors;
  });

  // Obtener el color del vehículo para cada ruta
  const getRouteColor = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.color : '#000000';
  };

  // Obtener el color para un cliente
  const getCustomerColor = (customerId: string) => {
    return customerColors[customerId] || '#3388FF';
  };

  // Siempre mantener el centro del mapa en Cercado de Lima al iniciar
  useEffect(() => {
    // Forzar que el centro sea siempre el Cercado de Lima al iniciar
    setCenter(LIMA_COORDINATES);
  }, []);

  // Formatear el tiempo de la ventana de tiempo
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Manejar el clic en el mapa para agregar un nuevo cliente
  const handleMapClick = (latlng: LatLng) => {
    setNewCustomerPosition(latlng);
    setShowAddCustomerModal(true);
  };

  // Manejar el arrastrar y soltar de un marcador de cliente con actualización inmediata
  const handleDragEnd = (customerId: string, latlng: LatLng) => {
    if (!onUpdateCustomers) return;
    
    const updatedCustomers = customers.map(customer => {
      if (customer.id === customerId) {
        return {
          ...customer,
          lat: latlng.lat,
          lng: latlng.lng
        };
      }
      return customer;
    });
    
    // Actualizar inmediatamente las coordenadas
    onUpdateCustomers(updatedCustomers);
  };

  // Agregar un nuevo cliente
  const handleAddCustomer = () => {
    if (!newCustomerPosition || !onUpdateCustomers) return;
    
    // Crear ID para el nuevo cliente
    const newId = `c${customers.length + 11}`; // Empezamos desde c11 ya que tenemos 10 clientes de ejemplo
    
    // Lista de nombres para nuevos clientes
    const defaultNames = [
      'Roberto Silva', 'Diana Paz', 'Fernando Ruiz', 'Laura Vega',
      'Andrés Mora', 'Sofía Luna', 'Gabriel Cruz', 'Isabel Reyes',
      'Martín Soto', 'Valentina Díaz'
    ];
    
    // Asignar un color al nuevo cliente
    const availableColors = [
      '#FF5733', '#33FF57', '#3357FF', '#FF33A8', '#33FFF0', 
      '#F0FF33', '#9033FF', '#FF9033', '#33FFAA', '#FF33DD',
      '#5E33FF', '#FF5E33', '#33FFA8', '#A833FF', '#33FFFF'
    ];
    const newColor = availableColors[Object.keys(customerColors).length % availableColors.length];
    
    // Crear el nuevo cliente con un nombre por defecto de la lista si no se proporciona uno
    const newCustomer: Location = {
      id: newId,
      name: newCustomerName || defaultNames[customers.length % defaultNames.length],
      lat: newCustomerPosition.lat,
      lng: newCustomerPosition.lng,
      demand: newCustomerDemand,
      readyTime: newCustomerReadyTime,
      dueTime: newCustomerDueTime,
      serviceTime: newCustomerServiceTime
    };

    // Actualizar el estado de customerColors
    customerColors[newId] = newColor;

    // Actualizar la lista de clientes
    onUpdateCustomers([...customers, newCustomer]);
    setShowAddCustomerModal(false);
    resetNewCustomerForm();
  };

  // Reiniciar formulario de nuevo cliente
  const resetNewCustomerForm = () => {
    setNewCustomerPosition(null);
    setNewCustomerName("");
    setNewCustomerDemand(10);
    setNewCustomerServiceTime(15);
    setNewCustomerReadyTime(480); // 8:00 AM
    setNewCustomerDueTime(1020); // 17:00 (5:00 PM)
  };

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden shadow-lg relative">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
      >
        {/* Componente auxiliar para acceder a la instancia del mapa */}
        <MapController center={center} />

        {/* Componente para manejar los clics en el mapa */}
        {onUpdateCustomers && <MapClickHandler onMapClick={handleMapClick} />}
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Depósito (no arrastrable) */}
        <Marker position={[depot.lat, depot.lng]} icon={depotIcon}>
          <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent>
            {depot.name}
          </Tooltip>
          <Popup>
            <div className="font-semibold">{depot.name}</div>
            <div>Depósito central</div>
            <div className="text-sm text-gray-600">Horario de atención: 8:00 - 17:00</div>
            <div>Coordenadas: [{depot.lat.toFixed(4)}, {depot.lng.toFixed(4)}]</div>
          </Popup>
        </Marker>
        
        {/* Rutas */}
        {routes.map((route, routeIndex) => {
          const routePositions = route.locations.map(loc => [loc.lat, loc.lng]) as [number, number][];
          const color = getRouteColor(route.vehicleId);
          
          return (
            <div key={`route-${routeIndex}`}>
              <Polyline
                positions={routePositions}
                pathOptions={{ color, weight: 4, opacity: 0.7 }}
              />
              
              {/* Marcadores de cada ubicación en la ruta (excepto el depósito que ya está) */}
              {route.locations.map((location, locIndex) => {
                // No duplicamos el marcador del depósito que ya está puesto
                if (location.id === depot.id) return null;
                
                // Crear icono con el color del cliente
                const locationColor = getCustomerColor(location.id);
                const locationIcon = createColoredIcon(locationColor);
                
                return (
                  <Marker
                    key={`route-${routeIndex}-loc-${locIndex}`}
                    position={[location.lat, location.lng]}
                    icon={locationIcon}
                    draggable={onUpdateCustomers !== undefined}
                    eventHandlers={{
                      dragend: (e) => handleDragEnd(location.id, e.target.getLatLng()),
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent>
                      {location.name}
                    </Tooltip>
                    <Popup>
                      <div className="font-semibold">{location.name}</div>
                      <div>Demanda: {location.demand}</div>
                      <div>
                        Ventana de tiempo: {formatTime(location.readyTime)} - {formatTime(location.dueTime)}
                      </div>
                      <div>Tiempo de servicio: {location.serviceTime} min</div>
                      <div>Coordenadas: [{location.lat.toFixed(4)}, {location.lng.toFixed(4)}]</div>
                      <div className="mt-1 text-xs">Ruta de vehículo: {route.vehicleId}</div>
                    </Popup>
                  </Marker>
                );
              })}
            </div>
          );
        })}
        
        {/* Ubicaciones no asignadas */}
        {unassignedLocations.map((location, index) => {
          // Crear icono para ubicaciones no asignadas
          const locationColor = getCustomerColor(location.id);
          const locationIcon = createColoredIcon(locationColor);
          
          return (
            <Marker
              key={`unassigned-${index}`}
              position={[location.lat, location.lng]}
              icon={locationIcon}
              draggable={onUpdateCustomers !== undefined}
              eventHandlers={{
                dragend: (e) => handleDragEnd(location.id, e.target.getLatLng()),
              }}
            >
              <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent>
                {location.name}
              </Tooltip>
              <Popup>
                <div className="font-semibold">{location.name}</div>
                <div>Demanda: {location.demand}</div>
                <div>
                  Ventana de tiempo: {formatTime(location.readyTime)} - {formatTime(location.dueTime)}
                </div>
                <div>Tiempo de servicio: {location.serviceTime} min</div>
                <div>Coordenadas: [{location.lat.toFixed(4)}, {location.lng.toFixed(4)}]</div>
                <div className="mt-1 text-xs text-red-500">No asignado a ninguna ruta</div>
              </Popup>
            </Marker>
          );
        })}
        
        {/* Clientes que aún no han sido incluidos en rutas */}
        {customers.filter(c => 
          !routes.some(route => route.locations.some(loc => loc.id === c.id)) && 
          !unassignedLocations.some(loc => loc.id === c.id) &&
          c.id !== depot.id
        ).map((customer, index) => {
          // Crear icono con el color del cliente
          const customerColor = getCustomerColor(customer.id);
          const customerIcon = createColoredIcon(customerColor);
          
          return (
            <Marker
              key={`customer-${index}`}
              position={[customer.lat, customer.lng]}
              icon={customerIcon}
              draggable={onUpdateCustomers !== undefined}
              eventHandlers={{
                dragend: (e) => handleDragEnd(customer.id, e.target.getLatLng()),
              }}
            >
              <Tooltip direction="top" offset={[0, -20]} opacity={1} permanent>
                {customer.name}
              </Tooltip>
              <Popup>
                <div className="font-semibold">{customer.name}</div>
                <div>Demanda: {customer.demand}</div>
                <div>
                  Ventana de tiempo: {formatTime(customer.readyTime)} - {formatTime(customer.dueTime)}
                </div>
                <div>Tiempo de servicio: {customer.serviceTime} min</div>
                <div>Coordenadas: [{customer.lat.toFixed(4)}, {customer.lng.toFixed(4)}]</div>
                <div className="mt-1 text-xs text-blue-500">Pendiente de asignar</div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Modal para agregar nuevo cliente */}
      {showAddCustomerModal && newCustomerPosition && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
          <div className="bg-white p-4 rounded-lg shadow-lg max-w-md w-full text-black">
            <h3 className="text-lg font-bold mb-4">Agregar nuevo cliente</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Coordenadas:</label>
              <div className="text-sm">[{newCustomerPosition.lat.toFixed(4)}, {newCustomerPosition.lng.toFixed(4)}]</div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Nombre:</label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-black"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Demanda:</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1 text-black"
                value={newCustomerDemand}
                onChange={(e) => setNewCustomerDemand(Number(e.target.value))}
                min="1"
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Tiempo de servicio (min):</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1 text-black"
                value={newCustomerServiceTime}
                onChange={(e) => setNewCustomerServiceTime(Number(e.target.value))}
                min="0"
              />
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium mb-1">Inicio ventana:</label>
                <input
                  type="time"
                  className="w-full border rounded px-2 py-1 text-black"
                  value={formatTime(newCustomerReadyTime)}
                  onChange={(e) => {
                    const timeStr = e.target.value;
                    if (timeStr) {
                      const [hours, minutes] = timeStr.split(':').map(Number);
                      setNewCustomerReadyTime(hours * 60 + minutes);
                    }
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fin ventana:</label>
                <input
                  type="time"
                  className="w-full border rounded px-2 py-1 text-black"
                  value={formatTime(newCustomerDueTime)}
                  onChange={(e) => {
                    const timeStr = e.target.value;
                    if (timeStr) {
                      const [hours, minutes] = timeStr.split(':').map(Number);
                      setNewCustomerDueTime(hours * 60 + minutes);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddCustomerModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 text-black"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCustomer}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Información de instrucciones - Cómo usar el mapa */}
      <div className="absolute bottom-2 right-2 bg-white p-2 rounded shadow-md z-[500] text-xs text-black">
        <p><strong>• Clic en el mapa:</strong> Agregar nuevo cliente</p>
        <p><strong>• Arrastrar marcadores:</strong> Actualizar ubicación</p>
        <p><strong>Horario de atención:</strong> 8:00 - 17:00</p>
      </div>
    </div>
  );
}
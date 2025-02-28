import { useState } from 'react';
import { Location, Vehicle, VRPTWConfig } from '../models/types';

interface ConfigPanelProps {
  vehicles: Vehicle[];
  onUpdateVehicles: (vehicles: Vehicle[]) => void;
  customers: Location[];
  onUpdateCustomers: (customers: Location[]) => void;
  config: VRPTWConfig;
  onUpdateConfig: (config: VRPTWConfig) => void;
  onSolve: () => void;
  isSolving: boolean;
}

export default function ConfigPanel({
  vehicles,
  onUpdateVehicles,
  customers,
  onUpdateCustomers,
  config,
  onUpdateConfig,
  onSolve,
  isSolving
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'customers' | 'algorithm' | 'info'>('vehicles');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState<number>(50);
  
  // Estado para agregar nuevos clientes
  const [newCustomerName, setNewCustomerName] = useState<string>("");
  const [newCustomerLat, setNewCustomerLat] = useState<number>(-12.0464); // Lima, Perú
  const [newCustomerLng, setNewCustomerLng] = useState<number>(-77.0428);
  const [newCustomerDemand, setNewCustomerDemand] = useState<number>(10);
  const [newCustomerReadyTime, setNewCustomerReadyTime] = useState<string>("08:00");
  const [newCustomerDueTime, setNewCustomerDueTime] = useState<string>("17:00");
  const [newCustomerServiceTime, setNewCustomerServiceTime] = useState<number>(15);

  // Handler para actualizar configuración del algoritmo
  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onUpdateConfig({
      ...config,
      [name]: Number(value)
    });
  };

  // Handler para actualizar la capacidad del vehículo
  const handleVehicleChange = (vehicleId: string, capacity: number) => {
    const updatedVehicles = vehicles.map(vehicle => {
      if (vehicle.id === vehicleId) {
        return {
          ...vehicle,
          capacity
        };
      }
      return vehicle;
    });
    onUpdateVehicles(updatedVehicles);
  };

  // Handler para actualizar las propiedades de un cliente
  const handleCustomerChange = (customerId: string, field: keyof Location, value: number | string) => {
    const updatedCustomers = customers.map(customer => {
      if (customer.id === customerId) {
        // Si es un tiempo en formato hora:minuto, convertirlo a minutos
        if (field === 'readyTime' || field === 'dueTime') {
          if (typeof value === 'string' && value.includes(':')) {
            const [hours, minutes] = value.split(':').map(Number);
            value = hours * 60 + minutes;
          }
        }
        
        return {
          ...customer,
          [field]: typeof value === 'string' ? value : Number(value)
        };
      }
      return customer;
    });
    onUpdateCustomers(updatedCustomers);
  };

  // Función para agregar un nuevo vehículo
  const handleAddVehicle = () => {
    const nextId = `v${vehicles.length + 1}`;
    const colors = ['#FF5733', '#33FF57', '#3357FF', '#FF33A8', '#33FFF0', '#F0FF33', '#9033FF', '#FF9033', '#33FFAA', '#FF33DD'];
    const colorIndex = vehicles.length % colors.length;
    
    const newVehicle: Vehicle = {
      id: nextId,
      capacity: newVehicleCapacity,
      startLocation: vehicles[0].startLocation, // Todos inician en el mismo depósito
      endLocation: vehicles[0].endLocation,     // Todos terminan en el mismo depósito
      color: colors[colorIndex]
    };
    
    onUpdateVehicles([...vehicles, newVehicle]);
    setNewVehicleCapacity(50); // Resetear el campo después de agregar
  };

  // Función para eliminar un vehículo
  const handleRemoveVehicle = (vehicleId: string) => {
    const updatedVehicles = vehicles.filter(v => v.id !== vehicleId);
    onUpdateVehicles(updatedVehicles);
  };
  
  // Función para agregar un nuevo cliente desde el panel
  const handleAddCustomer = () => {
    // Validar campos
    if (!newCustomerName.trim()) {
      alert("Por favor, ingrese un nombre para el cliente");
      return;
    }
    
    // Convertir los tiempos a minutos
    const readyTimeMinutes = timeToMinutes(newCustomerReadyTime);
    const dueTimeMinutes = timeToMinutes(newCustomerDueTime);
    
    if (dueTimeMinutes <= readyTimeMinutes) {
      alert("El tiempo de fin de la ventana debe ser posterior al tiempo de inicio");
      return;
    }
    
    // Generar ID único para el nuevo cliente
    const nextId = `c${customers.length + 11}`;
    
    const newCustomer: Location = {
      id: nextId,
      name: newCustomerName,
      lat: newCustomerLat,
      lng: newCustomerLng,
      demand: newCustomerDemand,
      readyTime: readyTimeMinutes,
      dueTime: dueTimeMinutes,
      serviceTime: newCustomerServiceTime
    };
    
    onUpdateCustomers([...customers, newCustomer]);
    
    // Limpiar formulario
    setNewCustomerName("");
    setNewCustomerLat(-12.0464);
    setNewCustomerLng(-77.0428);
    setNewCustomerDemand(10);
    setNewCustomerReadyTime("08:00");
    setNewCustomerDueTime("17:00");
    setNewCustomerServiceTime(15);
  };
  
  // Función para eliminar un cliente
  const handleRemoveCustomer = (customerId: string) => {
    const updatedCustomers = customers.filter(c => c.id !== customerId);
    onUpdateCustomers(updatedCustomers);
  };

  // Convertir minutos a formato HH:MM
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Convertir HH:MM a minutos
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // Generar color para un cliente según su ID (consistente con los colores en RouteMap)
  const getCustomerColor = (customerId: string) => {
    const colors = [
      '#FF5733', '#33FF57', '#3357FF', '#FF33A8', '#33FFF0', 
      '#F0FF33', '#9033FF', '#FF9033', '#33FFAA', '#FF33DD',
      '#5E33FF', '#FF5E33', '#33FFA8', '#A833FF', '#33FFFF'
    ];
    
    // Extraer el número del ID del cliente (asumiendo formato "c1", "c2", etc.)
    const idNum = parseInt(customerId.replace(/[^0-9]/g, ''), 10) || 0;
    return colors[idNum % colors.length];
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 text-black">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Configuración del problema VRPTW</h2>
        <p className="text-gray-600 text-sm">Personalice los parámetros y ejecute el algoritmo</p>
      </div>

      <div className="mb-4 border-b">
        <div className="flex flex-wrap">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`py-2 px-4 ${
              activeTab === 'vehicles'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            Vehículos
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`py-2 px-4 ${
              activeTab === 'customers'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            Clientes
          </button>
          <button
            onClick={() => setActiveTab('algorithm')}
            className={`py-2 px-4 ${
              activeTab === 'algorithm'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            Algoritmo
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`py-2 px-4 ${
              activeTab === 'info'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500'
            }`}
          >
            Info
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {activeTab === 'vehicles' && (
          <div>
            <h3 className="font-medium text-lg mb-2">Flota de vehículos</h3>
            {vehicles.map(vehicle => (
              <div
                key={vehicle.id}
                className="p-3 mb-3 border rounded flex items-center justify-between bg-gray-50"
              >
                <div>
                  <div className="font-medium">{vehicle.id}</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: vehicle.color }}
                    />
                    <span>{vehicle.startLocation.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-gray-700 text-sm font-medium">Capacidad:</label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-20 bg-white text-black"
                    value={vehicle.capacity}
                    onChange={e => handleVehicleChange(vehicle.id, Number(e.target.value))}
                    min="1"
                  />
                  <button 
                    onClick={() => handleRemoveVehicle(vehicle.id)}
                    className="ml-2 px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    title="Eliminar vehículo"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            
            {/* Formulario para agregar nuevo vehículo */}
            <div className="p-3 mb-3 border rounded bg-gray-50">
              <h4 className="font-medium text-sm mb-2">Agregar nuevo vehículo</h4>
              <div className="flex items-center gap-2">
                <label className="text-gray-700 text-sm font-medium">Capacidad:</label>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-20 bg-white text-black"
                  value={newVehicleCapacity}
                  onChange={e => setNewVehicleCapacity(Number(e.target.value))}
                  min="1"
                />
                <button
                  onClick={handleAddVehicle}
                  className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div>
            <h3 className="font-medium text-lg mb-2">Clientes</h3>
            
            {/* Formulario para agregar nuevo cliente */}
            <div className="p-4 mb-4 border rounded bg-gray-50">
              <h4 className="font-medium text-sm mb-3">Agregar nuevo cliente</h4>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">Nombre:</label>
                  <input
                    type="text"
                    className="border rounded px-2 py-1 w-full bg-white text-black"
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1">Latitud:</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-full bg-white text-black"
                      value={newCustomerLat}
                      onChange={e => setNewCustomerLat(Number(e.target.value))}
                      step="0.0001"
                      placeholder="Ej: -12.0464"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1">Longitud:</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-full bg-white text-black"
                      value={newCustomerLng}
                      onChange={e => setNewCustomerLng(Number(e.target.value))}
                      step="0.0001"
                      placeholder="Ej: -77.0428"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">Demanda:</label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-full bg-white text-black"
                    value={newCustomerDemand}
                    onChange={e => setNewCustomerDemand(Number(e.target.value))}
                    min="1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1">Inicio ventana:</label>
                    <input
                      type="time"
                      className="border rounded px-2 py-1 w-full bg-white text-black"
                      value={newCustomerReadyTime}
                      onChange={e => setNewCustomerReadyTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 font-medium mb-1">Fin ventana:</label>
                    <input
                      type="time"
                      className="border rounded px-2 py-1 w-full bg-white text-black"
                      value={newCustomerDueTime}
                      onChange={e => setNewCustomerDueTime(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">Tiempo de servicio (min):</label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-full bg-white text-black"
                    value={newCustomerServiceTime}
                    onChange={e => setNewCustomerServiceTime(Number(e.target.value))}
                    min="0"
                  />
                </div>
                <div className="mt-2">
                  <button
                    onClick={handleAddCustomer}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
                  >
                    Agregar cliente
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    Nota: Una vez agregado, puede arrastrar el marcador en el mapa para ajustar su ubicación.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Lista de clientes */}
            {customers.map(customer => (
              <div
                key={customer.id}
                className="p-3 mb-3 border rounded bg-gray-50"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getCustomerColor(customer.id) }}
                    />
                    <span className="font-medium">{customer.name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveCustomer(customer.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-sm text-gray-700 font-medium">Demanda:</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 mt-1 w-full bg-white text-black"
                      value={customer.demand}
                      onChange={e => handleCustomerChange(customer.id, 'demand', Number(e.target.value))}
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 font-medium">Tiempo de servicio (min):</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 mt-1 w-full bg-white text-black"
                      value={customer.serviceTime}
                      onChange={e => handleCustomerChange(customer.id, 'serviceTime', Number(e.target.value))}
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 font-medium">Inicio ventana:</label>
                    <input
                      type="time"
                      className="border rounded px-2 py-1 mt-1 w-full bg-white text-black"
                      value={minutesToTime(customer.readyTime)}
                      onChange={e => handleCustomerChange(customer.id, 'readyTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 font-medium">Fin ventana:</label>
                    <input
                      type="time"
                      className="border rounded px-2 py-1 mt-1 w-full bg-white text-black"
                      value={minutesToTime(customer.dueTime)}
                      onChange={e => handleCustomerChange(customer.id, 'dueTime', e.target.value)}
                      min={minutesToTime(customer.readyTime)}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-700 font-medium">Coordenadas:</label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 bg-white text-black"
                        value={customer.lat}
                        onChange={e => handleCustomerChange(customer.id, 'lat', Number(e.target.value))}
                        step="0.0001"
                        placeholder="Latitud"
                      />
                      <input
                        type="number"
                        className="border rounded px-2 py-1 bg-white text-black"
                        value={customer.lng}
                        onChange={e => handleCustomerChange(customer.id, 'lng', Number(e.target.value))}
                        step="0.0001"
                        placeholder="Longitud"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Puede arrastrar el marcador en el mapa para actualizar estas coordenadas.
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'algorithm' && (
          <div>
            <h3 className="font-medium text-lg mb-2">Parámetros del algoritmo</h3>
            <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Máximo de iteraciones:
                </label>
                <input
                  type="number"
                  name="maxIterations"
                  className="border rounded px-3 py-2 w-full bg-white text-black"
                  value={config.maxIterations}
                  onChange={handleConfigChange}
                  min="10"
                  max="10000"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Tamaño de población:
                </label>
                <input
                  type="number"
                  name="populationSize"
                  className="border rounded px-3 py-2 w-full bg-white text-black"
                  value={config.populationSize}
                  onChange={handleConfigChange}
                  min="10"
                  max="500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1 font-medium">
                  Tasa de mutación:
                </label>
                <input
                  type="number"
                  name="mutationRate"
                  className="border rounded px-3 py-2 w-full bg-white text-black"
                  value={config.mutationRate}
                  onChange={handleConfigChange}
                  min="0.01"
                  max="0.5"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'info' && (
          <div>
            <h3 className="font-medium text-lg mb-2">Información de la empresa</h3>
            <div className="bg-gray-50 p-4 rounded-lg text-gray-700">
              <div className="mb-4">
                <h4 className="font-medium">Horario de atención</h4>
                <p>Lunes a Viernes: 8:00 - 17:00</p>
                <p>Sábados: 9:00 - 13:00</p>
                <p>Domingos: Cerrado</p>
              </div>
              <div className="mb-4">
                <h4 className="font-medium">Ubicación principal</h4>
                <p>Lima, Perú</p>
                <p>Coordenadas: [-12.0464, -77.0428]</p>
              </div>
              <div className="mb-4">
                <h4 className="font-medium">Instrucciones</h4>
                <p className="text-sm mb-1">• Configure las propiedades de vehículos y clientes</p>
                <p className="text-sm mb-1">• Puede arrastrar los marcadores en el mapa para actualizar posiciones</p>
                <p className="text-sm mb-1">• Cada cliente tiene un color único para identificarlo fácilmente</p>
                <p className="text-sm mb-1">• Cuando esté listo, presione "Resolver VRPTW"</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          onClick={onSolve}
          disabled={isSolving}
          className={`w-full py-2 px-4 rounded text-white font-medium ${
            isSolving ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isSolving ? 'Calculando solución...' : 'Resolver VRPTW'}
        </button>
      </div>
    </div>
  );
}
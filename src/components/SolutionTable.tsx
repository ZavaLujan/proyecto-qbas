import { Location, Route, Vehicle } from '../models/types';

// Función para calcular la distancia entre dos puntos usando la fórmula de Haversine
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en kilómetros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distancia en kilómetros
}

interface SolutionTableProps {
  routes: Route[];
  vehicles: Vehicle[];
  unassignedLocations: Location[];
  totalDistance: number;
  totalTime: number;
  feasible: boolean;
  infeasibilityReasons?: string[];
}

interface TimelineEvent {
  type: 'wait' | 'service' | 'travel';
  start: number;
  end: number;
  location?: Location;
  from?: Location;
  to?: Location;
  distance?: number;
  reason?: string;
}

interface RouteTimelineProps {
  route: Route;
  vehicle: Vehicle | undefined;
  timelineEvents: TimelineEvent[];
  totalServiceTime: number;
  totalWaitTime: number;
  totalTravelTime: number;
  timeViolations: any[];
  formatTime: (minutes: number) => string;
  formatDuration: (minutes: number) => string;
  formatDistance: (distance: number) => string;
}

function RouteTimeline({
  route,
  vehicle,
  timelineEvents,
  totalServiceTime,
  totalWaitTime,
  totalTravelTime,
  timeViolations,
  formatTime,
  formatDuration,
  formatDistance
}: RouteTimelineProps) {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Encabezado de la ruta con mejor diseño */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className="text-lg font-semibold text-gray-800">Ruta {vehicle?.id}</span>
              <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                route.feasible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {route.feasible ? '✓ Factible' : '✗ No factible'}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-full">
              <span className="text-blue-600">🚚</span>
              <span className="font-medium text-blue-700">{formatDistance(route.totalDistance)}</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-purple-50 rounded-full">
              <span className="text-purple-600">⏱️</span>
              <span className="font-medium text-purple-700">{formatDuration(route.totalTime)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Línea de tiempo mejorada */}
      <div className="p-4">
        <div className="relative h-48 bg-gray-50 rounded-lg border border-gray-200">
          {/* Marcadores de inicio y fin del depósito */}
          <div className="absolute top-0 left-0 h-full w-0.5 bg-red-300">
            <div className="absolute -left-2 top-1/2 transform -translate-y-1/2">
              <div className="bg-white px-2 py-1 rounded-md border border-red-200 shadow-sm">
                <div className="text-xs font-medium text-red-600">Apertura</div>
                <div className="text-sm font-bold text-red-700">{formatTime(480)}</div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 h-full w-0.5 bg-red-300">
            <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
              <div className="bg-white px-2 py-1 rounded-md border border-red-200 shadow-sm">
                <div className="text-xs font-medium text-red-600">Cierre</div>
                <div className="text-sm font-bold text-red-700">{formatTime(1020)}</div>
              </div>
            </div>
          </div>

          {/* Regla de tiempo con mejor diseño */}
          <div className="absolute top-6 left-8 right-8">
            <div className="relative h-px bg-gray-300">
              {Array.from({ length: 9 }).map((_, i) => {
                const time = 480 + (i * (1020 - 480)) / 8;
                return (
                  <div
                    key={i}
                    className="absolute transform -translate-x-1/2"
                    style={{ left: `${(i * 100) / 8}%` }}
                  >
                    <div className="h-2 w-px bg-gray-400"></div>
                    <div className="mt-1 text-xs font-medium text-gray-600 whitespace-nowrap">
                      {formatTime(time)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Eventos con mejor visualización */}
          <div className="absolute top-16 left-8 right-8 bottom-4">
            {timelineEvents.map((event, eventIndex) => {
              const startPercent = ((event.start - 480) / (1020 - 480)) * 100;
              const width = ((event.end - event.start) / (1020 - 480)) * 100;
              
              let eventStyle = {
                travel: {
                  bg: 'bg-blue-50',
                  border: 'border-blue-200',
                  text: 'text-blue-700',
                  icon: '🚚',
                  hover: 'hover:bg-blue-100',
                },
                service: {
                  bg: 'bg-green-50',
                  border: 'border-green-200',
                  text: 'text-green-700',
                  icon: '🔧',
                  hover: 'hover:bg-green-100',
                },
                wait: {
                  bg: 'bg-amber-50',
                  border: 'border-amber-200',
                  text: 'text-amber-700',
                  icon: '⏳',
                  hover: 'hover:bg-amber-100',
                }
              }[event.type];

              return (
                <div
                  key={eventIndex}
                  className={`absolute h-full ${eventStyle.bg} border ${eventStyle.border} ${eventStyle.text} ${eventStyle.hover} rounded-md transition-all duration-200 group cursor-pointer`}
                  style={{
                    left: `${startPercent}%`,
                    width: `${Math.max(width - 0.5, 0.5)}%`,
                  }}
                >
                  <div className="h-full flex flex-col justify-center items-center p-1">
                    <span className="text-base">{eventStyle.icon}</span>
                    <span className="text-xs font-medium truncate w-full text-center">
                      {event.type === 'service' ? event.location?.name.split(' - ')[0] :
                       event.type === 'travel' ? `${Math.round(event.distance || 0)}km` :
                       'Espera'}
                    </span>
                  </div>

                  {/* Tooltip mejorado */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200 w-64">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                        <span className="font-semibold flex items-center space-x-2">
                          <span>{eventStyle.icon}</span>
                          <span>{event.type === 'service' ? 'Servicio' :
                                event.type === 'travel' ? 'Viaje' : 'Espera'}</span>
                        </span>
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100">
                          {formatDuration(event.end - event.start)}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Inicio:</span>
                          <span className="font-medium">{formatTime(event.start)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fin:</span>
                          <span className="font-medium">{formatTime(event.end)}</span>
                        </div>
                        {event.type === 'service' && event.location && (
                          <div className="flex justify-between pt-1 border-t border-gray-100">
                            <span className="text-gray-600">Cliente:</span>
                            <span className="font-medium">{event.location.name}</span>
                          </div>
                        )}
                        {event.type === 'travel' && event.distance && (
                          <div className="flex justify-between pt-1 border-t border-gray-100">
                            <span className="text-gray-600">Distancia:</span>
                            <span className="font-medium">{formatDistance(event.distance)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen de tiempos mejorado */}
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-blue-700">
              <span>🚚</span>
              <span className="font-medium">Tiempo de viaje</span>
            </div>
            <div className="mt-1 text-lg font-bold text-blue-800">
              {formatDuration(totalTravelTime)}
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-green-700">
              <span>🔧</span>
              <span className="font-medium">Tiempo de servicio</span>
            </div>
            <div className="mt-1 text-lg font-bold text-green-800">
              {formatDuration(totalServiceTime)}
            </div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 text-amber-700">
              <span>⏳</span>
              <span className="font-medium">Tiempo de espera</span>
            </div>
            <div className="mt-1 text-lg font-bold text-amber-800">
              {formatDuration(totalWaitTime)}
            </div>
          </div>
        </div>

        {/* Alertas de violaciones de tiempo */}
        {timeViolations.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="space-y-2">
              {timeViolations.map((violation, idx) => (
                <div key={idx} className="flex items-start space-x-2">
                  <span className="mt-0.5 text-red-500">⚠️</span>
                  <span className="text-sm text-red-700">{violation.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SolutionTable({
  routes,
  vehicles,
  unassignedLocations,
  totalDistance,
  totalTime,
  feasible,
  infeasibilityReasons = []
}: SolutionTableProps) {
  // Formatear el tiempo (minutos a formato HH:MM)
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Formatear duración en minutos
  const formatDuration = (minutes: number) => {
    return `${minutes}min`;
  };

  // Formatear la distancia en km con 1 decimal
  const formatDistance = (distance: number) => {
    return `${distance.toFixed(1)}km`;
  };

  return (
    <div className="w-full overflow-hidden rounded-lg shadow-lg">
      <div className="p-4 bg-white text-black w-full max-w-none">
        <h2 className="text-xl font-semibold mb-4">Resultados de la solución</h2>

        {/* Grid solo para la barra de configuración y el mapa */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-3 bg-gray-50 rounded-md shadow">
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Distancia total:</span>
                <div className="text-xl font-bold">{formatDistance(totalDistance)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Tiempo total:</span>
                <div className="text-xl font-bold">{formatTime(totalTime)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">¿Solución factible?</span>
                <div className={`text-xl font-bold ${feasible ? 'text-green-600' : 'text-red-600'}`}>
                  {feasible ? 'Sí' : 'No'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Aquí iría el mapa */}
          <div className="p-3 bg-gray-50 rounded-md shadow h-full">
            {/* Contenido del mapa */}
          </div>
        </div>

        {/* Análisis de capacidades y demandas */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            Análisis de Capacidades y Demandas
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Capacidad Total de la Flota:</h4>
              <div className="space-y-2">
                <p className="text-blue-600">
                  • Capacidad total disponible: {vehicles.reduce((sum, v) => sum + v.capacity, 0)} electrodomésticos
                </p>
                <p className="text-blue-600">
                  • Demanda total de clientes: {
                    [...unassignedLocations, ...routes.flatMap(r => r.locations)].reduce((sum, loc) => sum + loc.demand, 0)
                  } electrodomésticos
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-700 mb-2">Estado de Asignación:</h4>
              <div className="space-y-2">
                <p className="text-blue-600">
                  • Clientes asignados: {routes.reduce((sum, r) => sum + r.locations.length - 2, 0)}
                </p>
                <p className="text-blue-600">
                  • Clientes sin asignar: {unassignedLocations.length}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="font-medium text-blue-700 mb-2">Análisis por Vehículo:</h4>
            <div className="space-y-3">
              {routes.map((route, index) => {
                const vehicle = vehicles.find(v => v.id === route.vehicleId);
                const totalDemand = route.locations.reduce((sum, loc) => sum + loc.demand, 0);
                const capacityUsage = (totalDemand / (vehicle?.capacity || 1)) * 100;
                const isOverloaded = totalDemand > (vehicle?.capacity || 0);

                return (
                  <div key={index} className="flex flex-col space-y-1">
                    <p className="font-medium">
                      Vehículo {vehicle?.id}:
                      <span className={`ml-2 ${isOverloaded ? 'text-red-600' : 'text-blue-600'}`}>
                        {totalDemand} / {vehicle?.capacity} electrodomésticos
                        ({capacityUsage.toFixed(1)}%)
                      </span>
                    </p>
                    {isOverloaded && (
                      <p className="text-red-500 text-sm">
                        ⚠️ Exceso de capacidad: {totalDemand - (vehicle?.capacity || 0)} electrodomésticos
                      </p>
                    )}
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          isOverloaded ? 'bg-red-600' : capacityUsage > 90 ? 'bg-yellow-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(capacityUsage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!feasible && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <h4 className="font-medium text-yellow-800 mb-2">Análisis de Infactibilidad:</h4>
              <div className="space-y-2">
                {routes.some(r => {
                  const vehicle = vehicles.find(v => v.id === r.vehicleId);
                  return vehicle ? r.locations.reduce((sum, loc) => sum + loc.demand, 0) > vehicle.capacity : false;
                }) && (
                  <p className="text-yellow-700">
                    • Hay rutas que exceden la capacidad de los vehículos asignados
                  </p>
                )}
                {unassignedLocations.length > 0 && (
                  <p className="text-yellow-700">
                    • Hay {unassignedLocations.length} clientes sin asignar con una demanda total de {
                      unassignedLocations.reduce((sum, loc) => sum + loc.demand, 0)
                    } electrodomésticos
                  </p>
                )}
                <p className="text-yellow-700 mt-2 font-medium">Acciones recomendadas:</p>
                <ul className="list-disc list-inside text-yellow-700 space-y-1">
                  {routes.some(r => !r.feasible) && (
                    <li>Revisar y ajustar las rutas no factibles según el análisis detallado más abajo</li>
                  )}
                  {unassignedLocations.length > 0 && (
                    <>
                      <li>Considerar la adición de más vehículos para cubrir la demanda no asignada</li>
                      <li>Evaluar la posibilidad de dividir entregas grandes en múltiples días</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Mostrar razones de infactibilidad si la solución no es factible */}
        {!feasible && infeasibilityReasons.length > 0 && (
          <div className="mb-6 space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-lg font-semibold text-red-700 mb-2">
                Razones por las que la solución no es factible:
              </h3>
              <ul className="list-disc list-inside text-red-600 space-y-1">
                {infeasibilityReasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">
                Análisis detallado de infactibilidad:
              </h3>
              <div className="space-y-4">
                {routes.map((route, index) => {
                  if (!route.feasible && route.infeasibilityReason) {
                    const vehicle = vehicles.find(v => v.id === route.vehicleId);
                    return (
                      <div key={index} className="border-b border-yellow-200 pb-3 last:border-0">
                        <h4 className="font-medium text-yellow-900">
                          Problema en Ruta {index + 1} (Vehículo {vehicle?.id}):
                        </h4>
                        <p className="text-yellow-800 mt-1">{route.infeasibilityReason}</p>
                        <div className="mt-2">
                          <p className="font-medium text-yellow-900">Análisis:</p>
                          <div className="pl-4 text-yellow-800">
                            {route.infeasibilityReason.includes('Capacidad insuficiente') && (
                              <>
                                <p>• La demanda total excede la capacidad del vehículo ({vehicle?.capacity} electrodomésticos)</p>
                                <p>• Los clientes en esta ruta requieren más capacidad de la disponible</p>
                              </>
                            )}
                            {route.infeasibilityReason.includes('No se puede llegar a tiempo') && (
                              <>
                                <p>• El tiempo de llegada no cumple con la ventana de tiempo del cliente</p>
                                <p>• La secuencia actual de la ruta genera retrasos acumulados</p>
                              </>
                            )}
                            {route.infeasibilityReason.includes('retraso en siguiente cliente') && (
                              <>
                                <p>• La inserción del cliente afecta el cumplimiento de las ventanas de tiempo posteriores</p>
                                <p>• La cadena de entregas se ve comprometida por el nuevo tiempo de servicio</p>
                              </>
                            )}
                            {route.infeasibilityReason.includes('fuera del horario') && (
                              <>
                                <p>• La ventana de tiempo del cliente está fuera del horario de operación del depósito</p>
                                <p>• El depósito opera de {formatTime(480)} a {formatTime(1020)}</p>
                              </>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="font-medium text-yellow-900">Soluciones propuestas:</p>
                            <div className="pl-4 text-yellow-800">
                              {route.infeasibilityReason.includes('Capacidad insuficiente') && (
                                <>
                                  <p>1. Asignar un vehículo con mayor capacidad a esta ruta</p>
                                  <p>2. Dividir la demanda entre múltiples rutas</p>
                                  <p>3. Redistribuir los clientes con mayor demanda en diferentes rutas</p>
                                </>
                              )}
                              {route.infeasibilityReason.includes('No se puede llegar a tiempo') && (
                                <>
                                  <p>1. Reordenar la secuencia de visitas para optimizar los tiempos</p>
                                  <p>2. Negociar ventanas de tiempo más flexibles con los clientes</p>
                                  <p>3. Considerar rutas alternativas con menos tráfico</p>
                                </>
                              )}
                              {route.infeasibilityReason.includes('retraso en siguiente cliente') && (
                                <>
                                  <p>1. Ajustar los tiempos de servicio para reducir demoras</p>
                                  <p>2. Reasignar clientes a diferentes rutas para mejor distribución temporal</p>
                                  <p>3. Evaluar la posibilidad de comenzar la ruta más temprano</p>
                                </>
                              )}
                              {route.infeasibilityReason.includes('fuera del horario') && (
                                <>
                                  <p>1. Reprogramar la entrega para un horario dentro de la operación del depósito</p>
                                  <p>2. Negociar con el cliente un horario de entrega factible</p>
                                  <p>3. Considerar la posibilidad de entregas en días diferentes</p>
                                  <p>4. Evaluar la extensión del horario de operación del depósito</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Recomendaciones generales para optimizar la solución:
              </h3>
              <ul className="list-disc list-inside space-y-2 text-green-700">
                <li>Revisar y ajustar las ventanas de tiempo de los clientes para que estén dentro del horario de operación ({formatTime(480)} - {formatTime(1020)})</li>
                <li>Considerar la adición de vehículos adicionales en horas pico</li>
                <li>Optimizar los tiempos de servicio en cada ubicación</li>
                <li>Evaluar rutas alternativas considerando el tráfico en diferentes horarios</li>
                <li>Implementar un sistema de priorización de clientes basado en la urgencia de entrega</li>
                <li>Mantener un buffer de tiempo entre entregas para manejar imprevistos</li>
                <li>Considerar la posibilidad de entregas parciales para clientes con alta demanda</li>
                <li>Evaluar la extensión del horario de operación del depósito si hay muchos clientes fuera del horario actual</li>
              </ul>
            </div>
          </div>
        )}

        <h3 className="font-semibold text-lg mb-2 mt-6">Rutas</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse table-auto">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-blue-200 px-4 py-2 text-blue-800">Vehículo</th>
                <th className="border border-blue-200 px-4 py-2 text-blue-800">Capacidad</th>
                <th className="border border-blue-200 px-4 py-2 text-blue-800">Carga total</th>
                <th className="border border-blue-200 px-4 py-2 text-blue-800">Distancia</th>
                <th className="border border-blue-200 px-4 py-2 text-blue-800">Tiempo</th>
                <th className="border border-blue-200 px-4 py-2 text-blue-800">Estado</th>
                <th className="border border-blue-200 px-4 py-2 text-blue-800">Ruta</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route, index) => {
                const vehicle = vehicles.find(v => v.id === route.vehicleId);
                const totalDemand = route.locations.reduce((sum, loc) => sum + loc.demand, 0);
                const bgColor = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                
                return (
                  <tr key={index} className={bgColor}>
                    <td className="border px-4 py-2">{vehicle?.id}</td>
                    <td className="border px-4 py-2">{vehicle?.capacity} electrodomésticos</td>
                    <td className="border px-4 py-2">{totalDemand} electrodomésticos</td>
                    <td className="border px-4 py-2">{formatDistance(route.totalDistance)}</td>
                    <td className="border px-4 py-2">{formatTime(route.totalTime)}</td>
                    <td className={`border px-4 py-2 ${route.feasible ? 'text-green-600' : 'text-red-600'}`}>
                      {route.feasible ? 'Factible' : 'No factible'}
                      {!route.feasible && route.infeasibilityReason && (
                        <div className="text-xs text-red-500 mt-1">
                          {route.infeasibilityReason}
                        </div>
                      )}
                    </td>
                    <td className="border px-4 py-2">
                      <div className="flex flex-wrap items-center gap-1">
                        {route.locations.map((location, locIndex) => (
                          <span key={locIndex} className="flex items-center">
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              backgroundColor: locIndex === 0 || locIndex === route.locations.length - 1 
                                ? 'rgba(255, 0, 0, 0.1)' 
                                : 'rgba(0, 0, 255, 0.1)',
                              borderRadius: '4px',
                              margin: '0 2px',
                            }}>
                              {location.name}
                              <div className="text-xs text-gray-500">
                                {formatTime(location.readyTime)} - {formatTime(location.dueTime)}
                              </div>
                            </span>
                            {locIndex < route.locations.length - 1 && (
                              <span className="mx-1 text-gray-400">→</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {unassignedLocations.length > 0 && (
          <>
            <h3 className="font-semibold text-lg mb-2 mt-6">Ubicaciones no asignadas</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse table-auto">
                <thead>
                  <tr className="bg-red-50">
                    <th className="border border-red-200 px-4 py-2 text-red-800">ID</th>
                    <th className="border border-red-200 px-4 py-2 text-red-800">Nombre</th>
                    <th className="border border-red-200 px-4 py-2 text-red-800">Demanda</th>
                    <th className="border border-red-200 px-4 py-2 text-red-800">Ventana de tiempo</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedLocations.map((location, index) => (
                    <tr key={index} className="bg-white">
                      <td className="border px-4 py-2">{location.id}</td>
                      <td className="border px-4 py-2">{location.name}</td>
                      <td className="border px-4 py-2">{location.demand} electrodomésticos</td>
                      <td className="border px-4 py-2">
                        {formatTime(location.readyTime)} - {formatTime(location.dueTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-4">Análisis de Tiempos por Ruta:</h4>
          <div className="space-y-4">
            {routes.map((route, index) => {
              const vehicle = vehicles.find(v => v.id === route.vehicleId);
              
              // Calculamos los tiempos de la ruta
              let currentTime = 480;
              const timelineEvents: TimelineEvent[] = [];
              let previousLocation: Location | null = null;
              let totalServiceTime = 0;
              let totalWaitTime = 0;
              let totalTravelTime = 0;
              
              for (let i = 0; i < route.locations.length; i++) {
                const location = route.locations[i];
                
                if (previousLocation) {
                  // Calculamos el tiempo de viaje basado en la distancia y velocidad promedio
                  const distance = calculateDistance(
                    previousLocation.lat,
                    previousLocation.lng,
                    location.lat,
                    location.lng
                  );
                  const travelTime = Math.ceil((distance / 30) * 60); // 30 km/h velocidad promedio
                  totalTravelTime += travelTime;
                  
                  timelineEvents.push({
                    type: 'travel',
                    start: currentTime,
                    end: currentTime + travelTime,
                    location: location,
                    from: previousLocation,
                    to: location,
                    distance: distance
                  });
                  
                  currentTime += travelTime;
                }
                
                // Si llegamos antes de la ventana de tiempo, esperamos
                if (currentTime < location.readyTime) {
                  const waitTime = location.readyTime - currentTime;
                  totalWaitTime += waitTime;
                  
                  timelineEvents.push({
                    type: 'wait',
                    start: currentTime,
                    end: location.readyTime,
                    location: location,
                    reason: `Llegada temprana a ${location.name}, espera necesaria de ${formatTime(waitTime)}`
                  });
                  currentTime = location.readyTime;
                }
                
                // Añadimos el tiempo de servicio
                const serviceTime = location.serviceTime || 0;
                totalServiceTime += serviceTime;
                
                timelineEvents.push({
                  type: 'service',
                  start: currentTime,
                  end: currentTime + serviceTime,
                  location: location
                });
                
                currentTime += serviceTime;
                previousLocation = location;
              }

              // Verificamos si hay problemas de tiempo
              const timeViolations = [];
              let lastEndTime = 0;
              
              timelineEvents.forEach((event) => {
                if (event.type === 'service' && event.location) {
                  if (event.start > event.location.dueTime) {
                    timeViolations.push({
                      type: 'late',
                      location: event.location,
                      delay: event.start - event.location.dueTime,
                      message: `Llegada tardía a ${event.location.name}: ${formatTime(event.start)} (ventana cierra a ${formatTime(event.location.dueTime)})`
                    });
                  }
                  lastEndTime = event.end;
                }
              });

              if (lastEndTime > 1020) {
                timeViolations.push({
                  type: 'depot',
                  delay: lastEndTime - 1020,
                  message: `La ruta termina después del horario de cierre del depósito (${formatTime(lastEndTime)} > ${formatTime(1020)})`
                });
              }

              return (
                <RouteTimeline
                  key={index}
                  route={route}
                  vehicle={vehicle}
                  timelineEvents={timelineEvents}
                  totalServiceTime={totalServiceTime}
                  totalWaitTime={totalWaitTime}
                  totalTravelTime={totalTravelTime}
                  timeViolations={timeViolations}
                  formatTime={formatTime}
                  formatDuration={formatDuration}
                  formatDistance={formatDistance}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
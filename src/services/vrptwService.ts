import { Location, Route, Vehicle, VRPTWSolution, VRPTWConfig } from '../models/types';

// Cálculo de distancia entre dos puntos geográficos (fórmula Haversine)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Función para generar una matriz de tiempos/distancias entre ubicaciones
export function generateTimeMatrix(locations: Location[]): number[][] {
  const matrix: number[][] = [];
  
  for (let i = 0; i < locations.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < locations.length; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        // Asumimos una velocidad promedio de 50 km/h para convertir distancia a tiempo (en minutos)
        const distance = calculateDistance(
          locations[i].lat, locations[i].lng,
          locations[j].lat, locations[j].lng
        );
        matrix[i][j] = Math.round((distance / 50) * 60);
      }
    }
  }
  
  return matrix;
}

// Implementación simplificada del algoritmo de resolución VRPTW
// Esta es una versión básica que usa un algoritmo voraz (greedy)
export function solveVRPTW(
  depot: Location,
  customers: Location[],
  vehicles: Vehicle[],
  timeMatrix: number[][]
): VRPTWSolution {
  // Ordenamos los clientes por tiempo de inicio de ventana
  const sortedCustomers = [...customers].sort((a, b) => a.readyTime - b.readyTime);
  
  // Inicializamos las rutas
  const routes: Route[] = vehicles.map(vehicle => ({
    vehicleId: vehicle.id,
    locations: [depot], // Cada ruta comienza en el depósito
    totalDistance: 0,
    totalTime: 0,
    feasible: true,
    infeasibilityReason: '' // Nueva propiedad para explicar por qué no es factible
  }));

  const unassignedLocations: Location[] = [];
  const infeasibilityReasons: string[] = []; // Array para almacenar razones de infactibilidad
  
  // Para cada cliente, intentamos asignarlo a la mejor ruta
  for (const customer of sortedCustomers) {
    let bestRouteIndex = -1;
    let bestIncrease = Number.MAX_VALUE;
    let bestPosition = -1;
    let assignmentPossible = false;
    
    // Para cada ruta, encontramos la mejor posición para insertar el cliente
    for (let r = 0; r < routes.length; r++) {
      const route = routes[r];
      const vehicle = vehicles.find(v => v.id === route.vehicleId)!;
      
      // Verificamos si el vehículo tiene suficiente capacidad
      const totalDemand = route.locations.reduce((sum, loc) => sum + loc.demand, 0);
      if (totalDemand + customer.demand > vehicle.capacity) {
        route.infeasibilityReason = `Capacidad insuficiente para cliente ${customer.name}`;
        continue;
      }
      
      // Encontramos la mejor posición para insertar el cliente en esta ruta
      for (let i = 0; i < route.locations.length; i++) {
        const prev = route.locations[i];
        const next = route.locations[i + 1] || depot;
        
        // Índices en la matriz de tiempos
        const prevIndex = [...customers, depot].findIndex(l => l.id === prev.id);
        const customerIndex = [...customers, depot].findIndex(l => l.id === customer.id);
        const nextIndex = [...customers, depot].findIndex(l => l.id === next.id);
        
        if (prevIndex === -1 || customerIndex === -1 || nextIndex === -1) continue;
        
        // Cálculo del incremento de tiempo
        const timeToCustomer = timeMatrix[prevIndex][customerIndex];
        const timeFromCustomer = timeMatrix[customerIndex][nextIndex];
        const increase = timeToCustomer + timeFromCustomer - timeMatrix[prevIndex][nextIndex];
        
        // Verificamos la factibilidad de la ventana de tiempo
        let currentTime = route.totalTime;
        let arrivalTime = currentTime + timeToCustomer;
        
        // Si llegamos antes del inicio de la ventana, esperamos
        if (arrivalTime < customer.readyTime) {
          arrivalTime = customer.readyTime;
        }
        
        // Verificamos si podemos servir al cliente dentro de su ventana de tiempo
        if (arrivalTime > customer.dueTime) {
          route.infeasibilityReason = `No se puede llegar a tiempo a ${customer.name}`;
          continue;
        }
        
        // Verificamos si podemos completar el servicio y llegar al siguiente cliente a tiempo
        const departureTime = arrivalTime + customer.serviceTime;
        const arrivalNextTime = departureTime + timeFromCustomer;
        
        if (next.id !== depot.id && arrivalNextTime > next.dueTime) {
          route.infeasibilityReason = `La inserción de ${customer.name} causaría retraso en siguiente cliente`;
          continue;
        }
        
        assignmentPossible = true;
        if (increase < bestIncrease) {
          bestIncrease = increase;
          bestRouteIndex = r;
          bestPosition = i + 1;
        }
      }
    }
    
    // Asignamos el cliente a la mejor ruta encontrada
    if (bestRouteIndex !== -1) {
      const route = routes[bestRouteIndex];
      route.locations.splice(bestPosition, 0, customer);
      route.totalTime += bestIncrease;
      
      // Recalculamos la distancia total de la ruta
      route.totalDistance = 0;
      for (let i = 0; i < route.locations.length - 1; i++) {
        const from = route.locations[i];
        const to = route.locations[i + 1];
        route.totalDistance += calculateDistance(from.lat, from.lng, to.lat, to.lng);
      }
    } else {
      unassignedLocations.push(customer);
      if (!assignmentPossible) {
        infeasibilityReasons.push(
          `No se pudo asignar ${customer.name} debido a restricciones de tiempo o capacidad`
        );
      }
    }
  }
  
  // Añadimos el depósito al final de cada ruta
  for (const route of routes) {
    if (route.locations.length > 1 && route.locations[route.locations.length - 1].id !== depot.id) {
      route.locations.push(depot);
      
      // Recalculamos los totales
      route.totalDistance = 0;
      for (let i = 0; i < route.locations.length - 1; i++) {
        const from = route.locations[i];
        const to = route.locations[i + 1];
        route.totalDistance += calculateDistance(from.lat, from.lng, to.lat, to.lng);
      }
    }
  }
  
  // Calculamos los totales de la solución
  const totalDistance = routes.reduce((sum, route) => sum + route.totalDistance, 0);
  const totalTime = routes.reduce((sum, route) => sum + route.totalTime, 0);
  const feasible = unassignedLocations.length === 0 && routes.every(r => r.feasible);
  
  return {
    routes,
    unassignedLocations,
    totalDistance,
    totalTime,
    feasible,
    infeasibilityReasons // Incluimos las razones en la solución
  };
}

// Datos de ejemplo con ventanas de tiempo más realistas
export const exampleDepot: Location = {
  id: 'depot',
  name: 'Depósito Central de Electrodomésticos',
  lat: -12.0453,
  lng: -77.0311,
  demand: 0,
  readyTime: 480, // 8:00 AM (en minutos desde medianoche)
  dueTime: 1020, // 17:00 (5:00 PM)
  serviceTime: 0
};

export const exampleCustomers: Location[] = [
  {
    id: 'c1',
    name: 'Juan Pérez - Tienda Miraflores',
    lat: -12.1219,
    lng: -77.0299,
    demand: 15,
    readyTime: 540, // 9:00 AM
    dueTime: 720, // 12:00 PM
    serviceTime: 15
  },
  {
    id: 'c2',
    name: 'María García - Tienda San Isidro',
    lat: -12.0964,
    lng: -77.0353,
    demand: 20,
    readyTime: 600, // 10:00 AM
    dueTime: 780, // 13:00 PM
    serviceTime: 20
  },
  {
    id: 'c3',
    name: 'Carlos López - Tienda San Miguel',
    lat: -12.0776,
    lng: -77.0824,
    demand: 8,
    readyTime: 660, // 11:00 AM
    dueTime: 840, // 14:00 PM
    serviceTime: 10
  },
  {
    id: 'c4',
    name: 'Ana Torres - Tienda La Molina',
    lat: -12.0867,
    lng: -76.9424,
    demand: 12,
    readyTime: 480, // 8:00 AM
    dueTime: 660, // 11:00 AM
    serviceTime: 25
  },
  {
    id: 'c5',
    name: 'Luis Ramírez - Tienda Surco',
    lat: -12.1416,
    lng: -76.9938,
    demand: 18,
    readyTime: 540, // 9:00 AM
    dueTime: 900, // 15:00 PM
    serviceTime: 15
  },
  {
    id: 'c6',
    name: 'Rosa Mendoza - Tienda Jesús María',
    lat: -12.0705,
    lng: -77.0498,
    demand: 14,
    readyTime: 720, // 12:00 PM
    dueTime: 900, // 15:00 PM
    serviceTime: 20
  },
  {
    id: 'c7',
    name: 'Jorge Castro - Tienda San Borja',
    lat: -12.1066,
    lng: -76.9989,
    demand: 25,
    readyTime: 780, // 13:00 PM
    dueTime: 960, // 16:00 PM
    serviceTime: 30
  },
  {
    id: 'c8',
    name: 'Patricia Flores - Tienda Pueblo Libre',
    lat: -12.0768,
    lng: -77.0647,
    demand: 10,
    readyTime: 540, // 9:00 AM
    dueTime: 720, // 12:00 PM
    serviceTime: 15
  },
  {
    id: 'c9',
    name: 'Miguel Ríos - Tienda Magdalena',
    lat: -12.0896,
    lng: -77.0728,
    demand: 16,
    readyTime: 660, // 11:00 AM
    dueTime: 840, // 14:00 PM
    serviceTime: 20
  },
  {
    id: 'c10',
    name: 'Carmen Vargas - Tienda Lince',
    lat: -12.0826,
    lng: -77.0367,
    demand: 22,
    readyTime: 840, // 14:00 PM
    dueTime: 1020, // 17:00 PM
    serviceTime: 25
  }
];

export const exampleVehicles: Vehicle[] = [
  {
    id: 'v1',
    capacity: 50, // Capacidad: 50 electrodomésticos
    startLocation: exampleDepot,
    endLocation: exampleDepot,
    color: '#FF5733'
  },
  {
    id: 'v2',
    capacity: 60, // Capacidad: 60 electrodomésticos
    startLocation: exampleDepot,
    endLocation: exampleDepot,
    color: '#33FF57'
  },
  {
    id: 'v3',
    capacity: 45, // Capacidad: 45 electrodomésticos
    startLocation: exampleDepot,
    endLocation: exampleDepot,
    color: '#3357FF'
  }
];
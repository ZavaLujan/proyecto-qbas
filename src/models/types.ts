export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  demand: number;
  readyTime: number; // inicio de ventana de tiempo (minutos desde el inicio)
  dueTime: number; // fin de ventana de tiempo (minutos desde el inicio)
  serviceTime: number; // tiempo de servicio en minutos
}

export interface Vehicle {
  id: string;
  capacity: number;
  startLocation: Location;
  endLocation: Location;
  color: string;
}

export interface Route {
  vehicleId: string;
  locations: Location[];
  totalDistance: number;
  totalTime: number;
  feasible: boolean;
  infeasibilityReason: string; // Razón por la que la ruta no es factible
}

export interface VRPTWSolution {
  routes: Route[];
  unassignedLocations: Location[];
  totalDistance: number;
  totalTime: number;
  feasible: boolean;
  infeasibilityReasons: string[]; // Lista de razones por las que la solución no es factible
}

// Configuración del algoritmo
export interface VRPTWConfig {
  timeMatrix: number[][]; // matriz de tiempos entre ubicaciones
  maxIterations: number;
  populationSize: number;
  mutationRate: number;
}
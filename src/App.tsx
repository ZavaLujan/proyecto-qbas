import { useState, useEffect } from 'react';
import './App.css';
import RouteMap from './components/RouteMap';
import SolutionTable from './components/SolutionTable';
import ConfigPanel from './components/ConfigPanel';
import { VRPTWSolution, VRPTWConfig } from './models/types';
import {
  exampleDepot,
  exampleCustomers,
  exampleVehicles,
  solveVRPTW,
  generateTimeMatrix
} from './services/vrptwService';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  TooltipItem,
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  // Estado para datos del problema
  const [depot] = useState(exampleDepot);
  const [customers, setCustomers] = useState(exampleCustomers);
  const [vehicles, setVehicles] = useState(exampleVehicles);
  
  // Estado para la solución
  const [solution, setSolution] = useState<VRPTWSolution | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  
  // Estado para la configuración del algoritmo
  const [config, setConfig] = useState<VRPTWConfig>({
    timeMatrix: [],
    maxIterations: 100,
    populationSize: 50,
    mutationRate: 0.1
  });
  
  // Inicializar la matriz de tiempos cuando cambian los datos
  useEffect(() => {
    // Combinamos todos los lugares (depósito + clientes) para la matriz
    const allLocations = [depot, ...customers];
    const timeMatrix = generateTimeMatrix(allLocations);
    setConfig(prev => ({ ...prev, timeMatrix }));
  }, [depot, customers]);
  
  // Resolvemos el problema VRPTW
  const handleSolve = () => {
    setIsSolving(true);
    
    // Simulamos un proceso asíncrono con setTimeout para no bloquear la UI
    setTimeout(() => {
      try {
        // Resolver el problema con el servicio
        const newSolution = solveVRPTW(depot, customers, vehicles, config.timeMatrix);
        setSolution(newSolution);
      } catch (error) {
        console.error("Error al resolver el VRPTW:", error);
      } finally {
        setIsSolving(false);
      }
    }, 500); // Pequeño retraso para mostrar el estado de "calculando"
  };
  
  // Datos para el gráfico de barras de distancias
  const distanceChartData = {
    labels: solution?.routes.map(r => {
      const vehicle = vehicles.find(v => v.id === r.vehicleId);
      return `Ruta ${vehicle ? vehicle.id : 'Desconocida'}`;
    }) || [],
    datasets: [
      {
        label: 'Distancia (km)',
        data: solution?.routes.map(r => Number(r.totalDistance.toFixed(2))) || [],
        backgroundColor: solution?.routes.map(r => {
          const vehicle = vehicles.find(v => v.id === r.vehicleId);
          return vehicle ? vehicle.color : '#000000';
        }) || [],
        borderColor: 'rgba(0, 0, 0, 0.2)',
        borderWidth: 1,
      },
    ],
  };

  // Datos para el gráfico circular de demanda por ruta
  const demandChartData = {
    labels: solution?.routes.map(r => {
      const vehicle = vehicles.find(v => v.id === r.vehicleId);
      return `Ruta ${vehicle ? vehicle.id : 'Desconocida'}`;
    }) || [],
    datasets: [
      {
        data: solution?.routes.map(r => 
          r.locations.reduce((sum, loc) => sum + loc.demand, 0)
        ) || [],
        backgroundColor: solution?.routes.map(r => {
          const vehicle = vehicles.find(v => v.id === r.vehicleId);
          return vehicle ? vehicle.color : '#000000';
        }) || [],
        borderColor: 'white',
        borderWidth: 2,
      },
    ],
  };

  // Datos para el gráfico de línea de tiempo por ruta
  const timeChartData = {
    labels: solution?.routes.map(r => {
      const vehicle = vehicles.find(v => v.id === r.vehicleId);
      return `Ruta ${vehicle ? vehicle.id : 'Desconocida'}`;
    }) || [],
    datasets: [
      {
        label: 'Tiempo total (min)',
        data: solution?.routes.map(r => r.totalTime) || [],
        borderColor: '#4B5563',
        backgroundColor: 'rgba(75, 85, 99, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Análisis de rutas',
        color: '#333333',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#333',
        bodyColor: '#333',
        borderColor: 'rgba(200, 200, 200, 0.5)',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function(tooltipItem: TooltipItem<"bar" | "line" | "pie">) {
            const value = tooltipItem.raw as number;
            if (tooltipItem.dataset.label === 'Distancia (km)') {
              return `Distancia: ${value.toFixed(2)} km`;
            } else if (tooltipItem.dataset.label === 'Tiempo total (min)') {
              const hours = Math.floor(value / 60);
              const minutes = value % 60;
              return `Tiempo: ${hours}h ${minutes}min`;
            }
            return `Demanda: ${value} electrodomésticos`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Valor',
          color: '#333333',
        },
        ticks: {
          color: '#333333',
        }
      },
      x: {
        ticks: {
          color: '#333333',
        }
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-black">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-center text-gray-800">
          Planificador de Rutas con Ventanas de Tiempo (VRPTW)
        </h1>
        <p className="text-center text-gray-600 mt-2">
          Optimiza la planificación de rutas para tu flota de vehículos
        </p>
      </header>

      <div className="container mx-auto">
        {/* Grid solo para ConfigPanel y RouteMap */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Panel de configuración */}
          <div>
            <ConfigPanel
              vehicles={vehicles}
              onUpdateVehicles={setVehicles}
              customers={customers}
              onUpdateCustomers={setCustomers}
              config={config}
              onUpdateConfig={setConfig}
              onSolve={handleSolve}
              isSolving={isSolving}
            />
          </div>
          
          {/* Mapa con las rutas */}
          <div className="col-span-2">
            <RouteMap
              depot={depot}
              routes={solution?.routes || []}
              vehicles={vehicles}
              unassignedLocations={solution?.unassignedLocations || []}
              customers={customers}
              onUpdateCustomers={setCustomers}
            />
          </div>
        </div>

        {/* Contenido que ocupará todo el ancho */}
        {solution && (
          <>
            {/* Panel de gráficos con nuevo layout */}
            <div className="space-y-6 mb-6">
              {/* Gráficos de distancia y tiempo en grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gráfico de distancias */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-3">
                    📏 Distancia por ruta
                  </h2>
                  <div className="h-[300px]">
                    <Bar data={distanceChartData} options={{
                      ...chartOptions,
                      maintainAspectRatio: false,
                      plugins: {
                        ...chartOptions.plugins,
                        title: {
                          ...chartOptions.plugins.title,
                          display: false
                        }
                      }
                    }} />
                  </div>
                </div>

                {/* Gráfico de tiempos */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                  <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-3">
                    ⏱️ Tiempo por ruta
                  </h2>
                  <div className="h-[300px]">
                    <Line data={timeChartData} options={{
                      ...chartOptions,
                      maintainAspectRatio: false,
                      plugins: {
                        ...chartOptions.plugins,
                        title: {
                          ...chartOptions.plugins.title,
                          display: false
                        }
                      }
                    }} />
                  </div>
                </div>
              </div>

              {/* Gráfico de demanda centrado */}
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-6 text-gray-800 border-b pb-3">
                  📦 Distribución de demanda por ruta
                </h2>
                <div className="max-w-2xl mx-auto h-[400px]">
                  <Pie data={demandChartData} options={{
                    ...chartOptions,
                    maintainAspectRatio: false,
                    plugins: {
                      ...chartOptions.plugins,
                      title: {
                        ...chartOptions.plugins.title,
                        display: false
                      }
                    }
                  }} />
                </div>
              </div>
            </div>

            {/* Tabla de solución */}
            <SolutionTable
              routes={solution.routes}
              vehicles={vehicles}
              unassignedLocations={solution.unassignedLocations}
              totalDistance={solution.totalDistance}
              totalTime={solution.totalTime}
              feasible={solution.feasible}
              infeasibilityReasons={solution.infeasibilityReasons}
            />
          </>
        )}
      </div>

      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>Aplicación VRPTW - © {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}

export default App;

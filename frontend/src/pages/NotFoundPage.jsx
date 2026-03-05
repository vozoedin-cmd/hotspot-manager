import { useNavigate, useRouteError } from 'react-router-dom';
import { Wifi, Home, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-6">
          <Wifi className="w-10 h-10 text-blue-500" />
        </div>
        <h1 className="text-6xl font-black text-gray-900 dark:text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Página no encontrada
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
          La página que buscas no existe o fue movida.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver atrás
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
}

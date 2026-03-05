import { Component } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl mb-5">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Algo salió mal
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Ocurrió un error inesperado en la aplicación.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-xs bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 p-3 rounded-lg mb-5 overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="btn-primary flex items-center justify-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}

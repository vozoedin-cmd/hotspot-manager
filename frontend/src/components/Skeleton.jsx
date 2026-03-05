// Bloque base animado
const Bone = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
);

// ── Stat card (Dashboard) ────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-7 w-16" />
          <Bone className="h-3 w-32" />
        </div>
        <Bone className="h-10 w-10 rounded-xl flex-shrink-0" />
      </div>
    </div>
  );
}

// ── Fila de tabla ────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Bone className={`h-4 ${i === 0 ? 'w-32' : i === cols - 1 ? 'w-16' : 'w-24'}`} />
        </td>
      ))}
    </tr>
  );
}

// ── Tabla completa con cabecera ──────────────────────────────────────
export function TableSkeleton({ rows = 6, cols = 5, title = true }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {title && (
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <Bone className="h-5 w-40" />
          <Bone className="h-5 w-16 ml-auto" />
          <Bone className="h-5 w-16" />
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Bone className="h-3 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {Array.from({ length: rows }).map((_, i) => (
              <TableRowSkeleton key={i} cols={cols} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tarjeta de vendedor ──────────────────────────────────────────────
export function SellerCardSkeleton() {
  return (
    <div className="card flex items-center gap-4">
      <Bone className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-4 w-32" />
        <Bone className="h-3 w-48" />
      </div>
      <Bone className="h-6 w-20 rounded-full" />
      <Bone className="h-5 w-5 rounded" />
    </div>
  );
}

// ── Dashboard completo ───────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}

// ── Spinner de página completa ───────────────────────────────────────
export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ── Error inline ─────────────────────────────────────────────────────
export function QueryError({ message = 'Error al cargar los datos', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <span className="text-red-500 text-xl">!</span>
      </div>
      <p className="text-gray-600 dark:text-gray-400 text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState({
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  });

  const { data: salesReport, isLoading: loadingSales } = useQuery({
    queryKey: ['sales-report', dateRange],
    queryFn: () => reportsApi.sales(dateRange).then(r => r.data),
  });

  const { data: bySeller } = useQuery({
    queryKey: ['sales-by-seller', dateRange],
    queryFn: () => reportsApi.salesBySeller(dateRange).then(r => r.data.data),
  });

  const { data: byPackage } = useQuery({
    queryKey: ['sales-by-package', dateRange],
    queryFn: () => reportsApi.salesByPackage(dateRange).then(r => r.data.data),
  });

  const totals = salesReport?.totals || {};
  const sales = salesReport?.data || [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes de Ventas</h1>
          <p className="text-sm text-gray-500">Análisis de ingresos y desempeño</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div>
            <label className="label text-xs">Desde</label>
            <input type="date" className="input text-sm" value={dateRange.from} onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))} />
          </div>
          <div>
            <label className="label text-xs">Hasta</label>
            <input type="date" className="input text-sm" value={dateRange.to} onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Ventas', value: totals.count || 0, format: 'n', color: 'blue' },
          { label: 'Ingresos', value: totals.amount || 0, format: 'Q', color: 'green' },
          { label: 'Costos', value: totals.cost || 0, format: 'Q', color: 'yellow' },
          { label: 'Ganancia Neta', value: totals.profit || 0, format: 'Q', color: 'indigo' },
        ].map(({ label, value, format: fmt, color }) => (
          <div key={label} className="card text-center">
            <p className="text-xs text-gray-400 mb-1">{label}</p>
            <p className={`text-xl font-bold text-${color}-600`}>
              {fmt === 'Q' ? `Q${parseFloat(value).toFixed(2)}` : value}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By Seller */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Ventas por Vendedor</h2>
          {bySeller?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bySeller.map(s => ({
                name: s.seller?.name?.split(' ')[0] || 'N/A',
                ventas: parseInt(s.dataValues?.total_sales || 0),
                ingresos: parseFloat(s.dataValues?.total_amount || 0),
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v, n) => [n === 'ingresos' ? `Q${v.toFixed(2)}` : v, n]} />
                <Bar dataKey="ventas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-8">Sin datos</p>}
        </div>

        {/* By Package */}
        <div className="card">
          <h2 className="font-semibold text-gray-800 mb-4">Fichas por Paquete</h2>
          {byPackage?.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={byPackage.map(p => ({
                    name: p.package?.name || 'N/A',
                    value: parseInt(p.dataValues?.total_sales || 0),
                  }))}
                  cx="50%" cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {byPackage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-center py-8">Sin datos</p>}
        </div>
      </div>

      {/* Sales Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Detalle de Ventas</h2>
          <span className="text-xs text-gray-400">{sales.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Fecha</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Ficha</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Paquete</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-xs">Vendedor</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Venta</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-xs">Ganancia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loadingSales ? (
                Array(8).fill().map((_, i) => (
                  <tr key={i}>{Array(6).fill().map((_, j) => <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-100 rounded animate-pulse" /></td>)}</tr>
                ))
              ) : sales.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">Sin ventas en el período seleccionado</td></tr>
              ) : (
                sales.slice(0, 50).map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{format(new Date(s.created_at), 'dd/MM/yy HH:mm')}</td>
                    <td className="px-4 py-2.5"><code className="text-xs bg-gray-100 px-1 rounded">{s.voucher?.code}</code></td>
                    <td className="px-4 py-2.5 text-gray-600">{s.package?.name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{s.seller?.name}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">Q{parseFloat(s.amount).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-green-600">Q{parseFloat(s.profit).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

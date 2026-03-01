import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sellersApi, salesApi } from '../../services/api';
import { ArrowLeft, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function SellerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: seller, isLoading } = useQuery({
    queryKey: ['seller', id],
    queryFn: () => sellersApi.get(id).then(r => r.data.data),
  });

  const { data: txData } = useQuery({
    queryKey: ['transactions', id],
    queryFn: () => sellersApi.transactions(id, { limit: 20 }).then(r => r.data),
  });

  const transactions = txData?.data || [];

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-100 rounded w-48" />
      <div className="card h-40" />
    </div>
  );

  if (!seller) return <div className="text-gray-400 text-center py-12">Vendedor no encontrado</div>;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{seller.name}</h1>
          <p className="text-sm text-gray-500">{seller.email}</p>
        </div>
        <span className={`ml-auto text-xs px-2 py-1 rounded-full ${seller.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {seller.is_active ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-xs text-gray-400 mb-1">Saldo disponible</p>
          <p className="text-2xl font-bold text-green-600">Q{parseFloat(seller.balance?.balance || 0).toFixed(2)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 mb-1">Límite mensual</p>
          <p className="text-2xl font-bold text-blue-600">Q{parseFloat(seller.balance?.monthly_limit || 0).toFixed(2)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-gray-400 mb-1">Total gastado</p>
          <p className="text-2xl font-bold text-gray-700">Q{parseFloat(seller.balance?.total_spent || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Transactions */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Últimas Transacciones</h2>
        </div>
        {transactions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Sin transacciones</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {transactions.map(tx => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-gray-700">{tx.description || tx.type}</p>
                  <p className="text-xs text-gray-400">{format(new Date(tx.created_at), 'dd/MM/yy HH:mm')}</p>
                </div>
                <span className={`text-sm font-semibold ${tx.type === 'credit' || tx.type === 'monthly_reload' ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.type === 'debit' ? '-' : '+'}Q{parseFloat(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

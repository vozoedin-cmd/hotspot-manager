import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { packagesApi, vouchersApi } from '../../services/api';
import toast from 'react-hot-toast';
import { CheckCircle, Wifi, Clock, Copy, RefreshCw } from 'lucide-react';

function PackageCard({ pkg, selected, onSelect }) {
  const durationLabels = {
    minutes: 'min',
    hours: 'hr',
    days: 'día',
    weeks: 'sem',
    months: 'mes',
  };
  return (
    <button
      onClick={() => onSelect(pkg)}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${selected ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
            <Wifi className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{pkg.name}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {pkg.duration_value} {durationLabels[pkg.duration_unit] ?? pkg.duration_unit}
              {pkg.speed && ` · ${pkg.speed}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-extrabold text-blue-600">Q{Number(pkg.price).toFixed(2)}</p>
          {pkg.available_count !== undefined && (
            <p className="text-xs text-gray-400">{pkg.available_count} disp.</p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function SellVoucherPage() {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [clientName, setClientName] = useState('');
  const [soldVoucher, setSoldVoucher] = useState(null);

  const { data: pkgsData } = useQuery({
    queryKey: ['packages-for-sell'],
    queryFn: () => packagesApi.list().then((r) => r.data),
  });

  const packages = pkgsData?.data ?? pkgsData?.packages ?? [];

  const { mutate: sellVoucher, isPending } = useMutation({
    mutationFn: (data) => vouchersApi.sell(data),
    onSuccess: (res) => {
      setSoldVoucher(res.data.voucher ?? res.data);
      setSelectedPackage(null);
      setClientName('');
      toast.success('¡Ficha vendida exitosamente!');
    },
    onError: (err) => {
      const msg = err.response?.data?.error
        ?? err.response?.data?.message
        ?? err.response?.data?.errors?.[0]?.msg
        ?? 'Error al vender la ficha';
      toast.error(msg);
    },
  });

  const handleSell = () => {
    if (!selectedPackage) return toast.error('Selecciona un paquete');
    sellVoucher({ package_id: selectedPackage.id, client_name: clientName || undefined });
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado');
  };

  const reset = () => setSoldVoucher(null);

  if (soldVoucher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-5 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">¡Venta exitosa!</h2>
          <p className="text-sm text-gray-500 text-center">
            Entrega estos datos al cliente para conectarse al Hotspot
          </p>
        </div>

        <div className="w-full max-w-sm bg-gray-900 rounded-2xl p-5 space-y-4 text-white">
          <div>
            <p className="text-xs text-gray-400 mb-1">USUARIO / CÓDIGO</p>
            <div className="flex items-center justify-between gap-2">
              <p className="text-2xl font-mono font-bold tracking-wider">{soldVoucher.code}</p>
              <button onClick={() => copyText(soldVoucher.code)} className="p-1.5 bg-gray-700 rounded-lg hover:bg-gray-600">
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>
          {soldVoucher.password && (
            <div>
              <p className="text-xs text-gray-400 mb-1">CONTRASEÑA</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-2xl font-mono font-bold tracking-wider">{soldVoucher.password}</p>
                <button onClick={() => copyText(soldVoucher.password)} className="p-1.5 bg-gray-700 rounded-lg hover:bg-gray-600">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          <div className="border-t border-gray-700 pt-3 text-sm text-gray-300">
            <p>Paquete: <span className="text-white font-medium">{soldVoucher.package?.name ?? '—'}</span></p>
          </div>
        </div>

        <button
          onClick={reset}
          className="flex items-center gap-2 btn-primary w-full max-w-sm justify-center"
        >
          <RefreshCw className="w-4 h-4" />
          Vender otra ficha
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Vender Ficha</h1>
        <p className="text-sm text-gray-500">Selecciona el paquete y confirma la venta</p>
      </div>

      {/* Client name (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del cliente <span className="text-gray-400">(opcional)</span>
        </label>
        <input
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Ej: Juan Pérez"
          className="input"
        />
      </div>

      {/* Packages */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Paquete</p>
        {packages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No hay paquetes disponibles</p>
        ) : (
          <div className="space-y-2">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                selected={selectedPackage?.id === pkg.id}
                onSelect={setSelectedPackage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirm */}
      {selectedPackage && (
        <div className="sticky bottom-20 bg-white pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-3 px-1">
            <span>{selectedPackage.name}</span>
            <span className="font-bold text-blue-600 text-base">Q{Number(selectedPackage.price).toFixed(2)}</span>
          </div>
          <button
            onClick={handleSell}
            disabled={isPending}
            className="btn-primary w-full justify-center text-base py-3 disabled:opacity-60 flex items-center gap-2"
          >
            {isPending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : (
              'Confirmar venta'
            )}
          </button>
        </div>
      )}
    </div>
  );
}

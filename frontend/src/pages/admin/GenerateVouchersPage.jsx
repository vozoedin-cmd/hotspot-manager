import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { vouchersApi, packagesApi, mikrotikApi } from '../../services/api';
import { ArrowLeft, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function GenerateVouchersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    device_id: '',
    package_id: '',
    quantity: 10,
    prefix: 'HS',
  });

  const { data: packages } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.list({ is_active: 'true' }).then(r => r.data.data),
  });

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => mikrotikApi.list().then(r => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: () => vouchersApi.generate(form),
    onSuccess: (res) => {
      qc.invalidateQueries(['vouchers']);
      qc.invalidateQueries(['dashboard']);
      toast.success(`✅ ${res.data.data.created} fichas generadas exitosamente`);
      navigate('/admin/vouchers');
    },
    onError: (e) => {
      const errors = e.response?.data?.errors;
      if (errors) {
        errors.forEach(err => toast.error(err.msg));
      } else {
        toast.error(e.response?.data?.error || 'Error al generar fichas');
      }
    },
  });

  const selectedPkg = packages?.find(p => p.id === form.package_id);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generar Fichas</h1>
          <p className="text-sm text-gray-500">Crea un lote de fichas en MikroTik</p>
        </div>
      </div>

      <div className="card space-y-5">
        {/* Device */}
        <div>
          <label className="label">Router MikroTik *</label>
          <select
            className="input"
            value={form.device_id}
            onChange={e => setForm({ ...form, device_id: e.target.value })}
          >
            <option value="">Seleccionar router...</option>
            {devices?.map(d => (
              <option key={d.id} value={d.id} disabled={d.status !== 'online'}>
                {d.name} {d.status !== 'online' ? `(${d.status})` : '✓'}
              </option>
            ))}
          </select>
          {devices?.length === 0 && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              No hay routers configurados.{' '}
              <a href="/admin/mikrotik" className="underline">Agregar router</a>
            </p>
          )}
        </div>

        {/* Package */}
        <div>
          <label className="label">Paquete *</label>
          <select
            className="input"
            value={form.package_id}
            onChange={e => setForm({ ...form, package_id: e.target.value })}
          >
            <option value="">Seleccionar paquete...</option>
            {packages?.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} — Q{p.price} (costo: Q{p.cost})
              </option>
            ))}
          </select>
          {selectedPkg && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>{selectedPkg.name}</strong> —{' '}
                {selectedPkg.duration_value} {selectedPkg.duration_unit} |{' '}
                Precio: Q{selectedPkg.price} | Costo vendedor: Q{selectedPkg.cost}
                {selectedPkg.mikrotik_profile && (
                  <span> | Perfil MT: <code>{selectedPkg.mikrotik_profile}</code></span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="label">Cantidad de fichas (máx. 500)</label>
          <input
            type="number"
            className="input"
            min={1}
            max={500}
            value={form.quantity}
            onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
          />
          <p className="text-xs text-gray-400 mt-1">Se crearán en MikroTik y en la base de datos</p>
        </div>

        {/* Prefix */}
        <div>
          <label className="label">Prefijo de códigos</label>
          <input
            type="text"
            className="input"
            maxLength={5}
            value={form.prefix}
            onChange={e => setForm({ ...form, prefix: e.target.value.toUpperCase() })}
            placeholder="HS"
          />
          <p className="text-xs text-gray-400 mt-1">
            Ejemplo: con prefijo "HS" → <code className="bg-gray-100 px-1 rounded">HSBCDE2Z</code>
          </p>
        </div>

        {/* Summary */}
        {form.device_id && form.package_id && form.quantity > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Resumen:</p>
            <p className="text-gray-600">• <strong>{form.quantity}</strong> fichas en router <strong>{devices?.find(d => d.id === form.device_id)?.name}</strong></p>
            <p className="text-gray-600">• Paquete: <strong>{selectedPkg?.name}</strong></p>
            <p className="text-gray-600">• Valor total de venta: <strong>Q{(form.quantity * (selectedPkg?.price || 0)).toFixed(2)}</strong></p>
          </div>
        )}

        <button
          onClick={() => mutation.mutate()}
          disabled={!form.device_id || !form.package_id || !form.quantity || mutation.isPending}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {mutation.isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generando fichas...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Generar {form.quantity} Fichas
            </>
          )}
        </button>
      </div>
    </div>
  );
}

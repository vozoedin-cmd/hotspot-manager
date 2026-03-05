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
    prefix: '',
    voucher_type: 'pin',
    code_length: 6,
    pwd_length: 6,
    numbers_only: true,
  });

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => mikrotikApi.list().then(r => r.data.data),
  });

  // Paquetes filtrados por router seleccionado
  const { data: packages } = useQuery({
    queryKey: ['packages', form.device_id],
    queryFn: () => packagesApi.list({
      is_active: 'true',
      ...(form.device_id ? { device_id: form.device_id } : {}),
    }).then(r => r.data.data),
    enabled: true,
  });

  const mutation = useMutation({
    mutationFn: () => vouchersApi.generate({ ...form, prefix: '' }),
    onSuccess: (res) => {
      qc.invalidateQueries(['vouchers']);
      qc.invalidateQueries(['dashboard']);
      toast.success(`${res.data.data.created} fichas generadas exitosamente`);
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

  const selectedDevice = devices?.find(d => d.id === form.device_id);
  const selectedPkg = packages?.find(p => p.id === form.package_id);

  // Al cambiar dispositivo, resetear paquete
  const handleDeviceChange = (device_id) => {
    setForm({ ...form, device_id, package_id: '' });
  };

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
            onChange={e => handleDeviceChange(e.target.value)}
          >
            <option value="">Seleccionar router...</option>
            {devices?.map(d => (
              <option key={d.id} value={d.id} disabled={d.status !== 'online'}>
                {d.name} {d.status !== 'online' ? `(${d.status})` : 'âœ“'}
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

        {/* Package â€” solo si hay dispositivo seleccionado */}
        <div>
          <label className="label">Paquete *</label>
          <select
            className="input"
            value={form.package_id}
            onChange={e => setForm({ ...form, package_id: e.target.value })}
            disabled={!form.device_id}
          >
            <option value="">
              {form.device_id ? 'Seleccionar paquete...' : 'Primero selecciona un router'}
            </option>
            {packages?.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} â€” Q{p.price}
              </option>
            ))}
          </select>
          {form.device_id && packages?.length === 0 && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              No hay paquetes para este router.{' '}
              <a href="/admin/packages" className="underline">Crear paquete</a>
            </p>
          )}
          {selectedPkg && (
            <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2">
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>{selectedPkg.name}</strong> â€”{' '}
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
          <label className="label">Cantidad de fichas (mÃ¡x. 500)</label>
          <input
            type="number"
            className="input"
            min={1}
            max={500}
            value={form.quantity}
            onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 1 })}
          />
          <p className="text-xs text-gray-400 mt-1">Se crearÃ¡n en MikroTik y en la base de datos</p>
        </div>

        {/* Voucher type */}
        <div>
          <label className="label">Tipo de ficha</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'pin', label: 'Solo PIN', desc: 'Un Ãºnico cÃ³digo numÃ©rico para entrar' },
              { value: 'user_password', label: 'Usuario + ContraseÃ±a', desc: 'CÃ³digo y contraseÃ±a separados' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm({ ...form, voucher_type: opt.value, numbers_only: opt.value === 'pin' })}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  form.voucher_type === opt.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <p className="font-semibold text-sm text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* DÃ­gitos */}
        {form.voucher_type === 'pin' ? (
          <div className="max-w-xs">
            <label className="label">DÃ­gitos del PIN</label>
            <input
              type="number"
              className="input"
              min={4}
              max={12}
              value={form.code_length}
              onChange={e => setForm({ ...form, code_length: parseInt(e.target.value) || 6 })}
            />
            <p className="text-xs text-gray-400 mt-1">Solo nÃºmeros (4â€“12 dÃ­gitos)</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">DÃ­gitos del cÃ³digo</label>
              <input
                type="number"
                className="input"
                min={4}
                max={12}
                value={form.code_length}
                onChange={e => setForm({ ...form, code_length: parseInt(e.target.value) || 6 })}
              />
              <p className="text-xs text-gray-400 mt-1">Parte aleatoria (4â€“12)</p>
            </div>
            <div>
              <label className="label">DÃ­gitos de contraseÃ±a</label>
              <input
                type="number"
                className="input"
                min={4}
                max={12}
                value={form.pwd_length}
                onChange={e => setForm({ ...form, pwd_length: parseInt(e.target.value) || 6 })}
              />
              <p className="text-xs text-gray-400 mt-1">Solo letras/nÃºmeros (4â€“12)</p>
            </div>
          </div>
        )}

        {/* Numbers only â€” solo para usuario+contraseÃ±a */}
        {form.voucher_type === 'user_password' && (
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-700">Solo nÃºmeros</p>
              <p className="text-xs text-gray-400">Genera cÃ³digos Ãºnicamente con dÃ­gitos (2â€“9)</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, numbers_only: !form.numbers_only })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.numbers_only ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.numbers_only ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        )}

        {/* Summary */}
        {form.device_id && form.package_id && form.quantity > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Resumen:</p>
            <p className="text-gray-600">â€¢ <strong>{form.quantity}</strong> fichas en router <strong>{selectedDevice?.name}</strong></p>
            <p className="text-gray-600">â€¢ Paquete: <strong>{selectedPkg?.name}</strong></p>
            <p className="text-gray-600">â€¢ Tipo: <strong>{form.voucher_type === 'pin' ? 'Solo PIN' : 'Usuario + ContraseÃ±a'}</strong></p>
            <p className="text-gray-600">â€¢ Formato PIN: <strong>{form.code_length} dÃ­gitos</strong>{form.voucher_type === 'pin' ? ' numÃ©ricos' : ''}</p>
            <p className="text-gray-600">â€¢ Valor total de venta: <strong>Q{(form.quantity * (selectedPkg?.price || 0)).toFixed(2)}</strong></p>
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

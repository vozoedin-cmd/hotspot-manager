import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { packagesApi } from '../../services/api';
import { Plus, Edit, Trash2, Package, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', description: '', duration_value: 1, duration_unit: 'hours',
  price: '', cost: '', speed_download: '', speed_upload: '',
  mikrotik_profile: '', color: '#3B82F6', is_active: true,
};

const DURATION_UNITS = {
  minutes: 'Minutos', hours: 'Horas', days: 'Días', weeks: 'Semanas', months: 'Meses',
};

export default function PackagesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editPkg, setEditPkg] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: packages, isLoading } = useQuery({
    queryKey: ['packages-all'],
    queryFn: () => packagesApi.list().then(r => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editPkg ? packagesApi.update(editPkg.id, data) : packagesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['packages-all']);
      qc.invalidateQueries(['packages']);
      toast.success(editPkg ? 'Paquete actualizado' : 'Paquete creado');
      closeModal();
    },
    onError: (e) => toast.error(e.response?.data?.error || e.response?.data?.errors?.[0]?.msg || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => packagesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['packages-all']);
      toast.success('Paquete eliminado');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'No se puede eliminar'),
  });

  const openCreate = () => { setEditPkg(null); setForm(EMPTY_FORM); setModal(true); };
  const openEdit = (pkg) => {
    setEditPkg(pkg);
    setForm({
      name: pkg.name, description: pkg.description || '',
      duration_value: pkg.duration_value, duration_unit: pkg.duration_unit,
      price: pkg.price, cost: pkg.cost,
      speed_download: pkg.speed_download || '', speed_upload: pkg.speed_upload || '',
      mikrotik_profile: pkg.mikrotik_profile || '', color: pkg.color || '#3B82F6',
      is_active: pkg.is_active,
    });
    setModal(true);
  };
  const closeModal = () => { setModal(false); setEditPkg(null); };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paquetes</h1>
          <p className="text-sm text-gray-500">Administra los planes de tiempo disponibles</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Nuevo Paquete
        </button>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(6).fill().map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-5 bg-gray-100 rounded w-3/4 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
          ))
        ) : packages?.map(pkg => (
          <div key={pkg.id} className={`card hover:shadow-md transition-shadow ${!pkg.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: pkg.color }} />
                <h3 className="font-semibold text-gray-800">{pkg.name}</h3>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(pkg)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600 transition-colors">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => confirm('¿Eliminar paquete?') && deleteMutation.mutate(pkg.id)} className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock className="w-3.5 h-3.5" />
                <span>{pkg.duration_value} {DURATION_UNITS[pkg.duration_unit]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Precio venta:</span>
                <span className="font-semibold text-green-600">Q{pkg.price}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Costo vendedor:</span>
                <span className="font-medium text-gray-700">Q{pkg.cost}</span>
              </div>
              {pkg.available_count !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Disponibles:</span>
                  <span className={`font-medium ${pkg.available_count === 0 ? 'text-red-600' : 'text-blue-600'}`}>
                    {pkg.available_count}
                  </span>
                </div>
              )}
              {pkg.mikrotik_profile && (
                <div className="pt-1">
                  <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
                    Perfil: {pkg.mikrotik_profile}
                  </code>
                </div>
              )}
            </div>

            {!pkg.is_active && (
              <span className="mt-2 inline-block text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Inactivo</span>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                {editPkg ? 'Editar Paquete' : 'Crear Paquete'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Nombre *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: 1 Hora" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Duración *</label>
                    <input type="number" className="input" min={1} value={form.duration_value} onChange={e => setForm({ ...form, duration_value: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <label className="label">Unidad *</label>
                    <select className="input" value={form.duration_unit} onChange={e => setForm({ ...form, duration_unit: e.target.value })}>
                      {Object.entries(DURATION_UNITS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Precio de venta (Q) *</label>
                    <input type="number" step="0.01" className="input" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Costo vendedor (Q) *</label>
                    <input type="number" step="0.01" className="input" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Velocidad Bajada</label>
                    <input className="input" value={form.speed_download} onChange={e => setForm({ ...form, speed_download: e.target.value })} placeholder="2M" />
                  </div>
                  <div>
                    <label className="label">Velocidad Subida</label>
                    <input className="input" value={form.speed_upload} onChange={e => setForm({ ...form, speed_upload: e.target.value })} placeholder="1M" />
                  </div>
                </div>
                <div>
                  <label className="label">Perfil MikroTik</label>
                  <input className="input" value={form.mikrotik_profile} onChange={e => setForm({ ...form, mikrotik_profile: e.target.value })} placeholder="default" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Color</label>
                    <div className="flex gap-2">
                      <input type="color" className="h-9 w-12 rounded border border-gray-300 cursor-pointer" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                      <input className="input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Estado</label>
                    <select className="input" value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={saveMutation.isPending || !form.name || !form.price || !form.cost}
                  className="btn-primary flex-1"
                >
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mikrotikApi } from '../../services/api';
import { Plus, Wifi, RefreshCw, Zap, Activity, Network } from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', host: '', port: 8728, username: 'admin',
  password: '', use_ssl: false, hotspot_server: '', zone: '', notes: '',
};

const EMPTY_VPN = {
  gateway_id: '',
  remote_vpn_ip: '',
  forward_port: 8730,
  ppp_username: '',
  remote_api_port: 8728,
};

export default function MikrotikDevicesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editDevice, setEditDevice] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [vpnModal, setVpnModal] = useState(false);
  const [vpnForm, setVpnForm] = useState(EMPTY_VPN);

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ['devices-full'],
    queryFn: () => mikrotikApi.list().then(r => r.data.data),
  });

  const onlineDevices = devices?.filter(d => d.status === 'online') ?? [];

  const saveMutation = useMutation({
    mutationFn: (data) => editDevice ? mikrotikApi.update(editDevice.id, data) : mikrotikApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['devices-full']);
      qc.invalidateQueries(['devices']);
      const test = res.data.connection_test;
      if (test) {
        toast[test.success ? 'success' : 'error'](
          test.success
            ? `✅ Conectado: ${test.identity} (RouterOS ${test.version})`
            : `⚠️ Creado pero sin conexión: ${test.error}`
        );
      } else {
        toast.success('Dispositivo actualizado');
      }
      setModal(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const vpnMutation = useMutation({
    mutationFn: (data) => mikrotikApi.setupVpnForward(data),
    onSuccess: (res) => {
      toast.success(res.data.message);
      setVpnModal(false);
      setVpnForm(EMPTY_VPN);
      refetch();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al configurar NAT'),
  });

  const testConnection = async (id) => {
    setTestingId(id);
    try {
      const res = await mikrotikApi.test(id);
      const r = res.data.data;
      qc.invalidateQueries(['devices-full']);
      if (r.success) {
        toast.success(`✅ ${r.identity} — RouterOS ${r.version} (${r.uptime})`);
      } else {
        toast.error(`Sin conexión: ${r.error}`);
      }
    } catch {
      toast.error('Error al probar conexión');
    } finally {
      setTestingId(null);
    }
  };

  const syncDevice = async (id, name) => {
    setSyncingId(id);
    try {
      const res = await mikrotikApi.sync(id);
      qc.invalidateQueries(['devices-full']);
      const changes = res.data.data.changes;
      toast.success(`Sync ${name}: ${changes.length} cambios detectados`);
    } catch {
      toast.error('Error al sincronizar');
    } finally {
      setSyncingId(null);
    }
  };

  const openEdit = (d) => {
    setEditDevice(d);
    setForm({ name: d.name, host: d.host, port: d.port, username: d.username, password: '', use_ssl: d.use_ssl, hotspot_server: d.hotspot_server || '', zone: d.zone || '', notes: d.notes || '' });
    setModal(true);
  };

  const StatusDot = ({ status }) => {
    const cfg = { online: 'bg-green-500', offline: 'bg-gray-400', error: 'bg-red-500' };
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cfg[status] || 'bg-gray-400'} flex-shrink-0`} />;
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routers MikroTik</h1>
          <p className="text-sm text-gray-500">Gestiona los dispositivos conectados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary text-sm flex items-center gap-1">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setVpnForm(EMPTY_VPN); setVpnModal(true); }}
            className="btn-secondary flex items-center gap-2 text-sm"
            title="Configurar NAT para router remoto sin IP pública"
          >
            <Network className="w-4 h-4" />
            VPN NAT
          </button>
          <button onClick={() => { setEditDevice(null); setForm(EMPTY_FORM); setModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Agregar Router
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          Array(3).fill().map((_, i) => <div key={i} className="card animate-pulse h-40" />)
        ) : devices?.length === 0 ? (
          <div className="col-span-2 card text-center text-gray-400 py-12">
            <Wifi className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No hay routers configurados</p>
          </div>
        ) : (
          devices?.map(device => (
            <div key={device.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Wifi className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{device.name}</h3>
                    <p className="text-xs text-gray-400">{device.host}:{device.port}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusDot status={device.status} />
                  <span className="text-xs text-gray-500 capitalize">{device.status}</span>
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-1 mb-4">
                {device.zone && <p>Zona: {device.zone}</p>}
                {device.hotspot_server && <p>Servidor HS: {device.hotspot_server}</p>}
                {device.last_sync && <p>Última sync: {new Date(device.last_sync).toLocaleString('es')}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => testConnection(device.id)}
                  disabled={testingId === device.id}
                  className="btn-secondary text-xs flex items-center gap-1 flex-1"
                >
                  <Activity className="w-3 h-3" />
                  {testingId === device.id ? 'Probando...' : 'Probar'}
                </button>
                <button
                  onClick={() => syncDevice(device.id, device.name)}
                  disabled={syncingId === device.id}
                  className="btn-secondary text-xs flex items-center gap-1 flex-1"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingId === device.id ? 'animate-spin' : ''}`} />
                  {syncingId === device.id ? 'Sync...' : 'Sincronizar'}
                </button>
                <button onClick={() => openEdit(device)} className="btn-secondary text-xs px-3">
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal agregar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                {editDevice ? 'Editar Router' : 'Agregar Router MikroTik'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Nombre del router *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Sector Norte" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="label">IP / Host *</label>
                    <input className="input" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.1" />
                  </div>
                  <div>
                    <label className="label">Puerto</label>
                    <input type="number" className="input" value={form.port} onChange={e => setForm({ ...form, port: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Usuario *</label>
                    <input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Contraseña *</label>
                    <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label">Servidor Hotspot (nombre en MT)</label>
                  <input className="input" value={form.hotspot_server} onChange={e => setForm({ ...form, hotspot_server: e.target.value })} placeholder="hotspot1" />
                </div>
                <div>
                  <label className="label">Zona geográfica</label>
                  <input className="input" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} placeholder="Zona Norte" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ssl" checked={form.use_ssl} onChange={e => setForm({ ...form, use_ssl: e.target.checked, port: e.target.checked ? 8729 : 8728 })} />
                  <label htmlFor="ssl" className="text-sm text-gray-600">Usar SSL (puerto 8729)</label>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={saveMutation.isPending || !form.name || !form.host || !form.username}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saveMutation.isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                  ) : 'Guardar y Probar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal VPN NAT */}
      {vpnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Network className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Configurar NAT para router remoto</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5 ml-11">
                Crea una regla de reenvío de puertos en el router gateway (online) para acceder al router remoto conectado por VPN.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="label">Router gateway (online) *</label>
                  <select
                    className="input"
                    value={vpnForm.gateway_id}
                    onChange={e => setVpnForm({ ...vpnForm, gateway_id: e.target.value })}
                  >
                    <option value="">Selecciona un router online...</option>
                    {onlineDevices.map(d => (
                      <option key={d.id} value={d.id}>{d.name} — {d.host}:{d.port}</option>
                    ))}
                  </select>
                  {onlineDevices.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">No hay routers online disponibles</p>
                  )}
                </div>

                <div>
                  <label className="label">IP VPN del router remoto *</label>
                  <input
                    className="input"
                    placeholder="Ej: 10.10.10.166"
                    value={vpnForm.remote_vpn_ip}
                    onChange={e => setVpnForm({ ...vpnForm, remote_vpn_ip: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Visible en PPP → Active del gateway</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Puerto a abrir en gateway *</label>
                    <input
                      type="number"
                      className="input"
                      value={vpnForm.forward_port}
                      onChange={e => setVpnForm({ ...vpnForm, forward_port: parseInt(e.target.value) })}
                      placeholder="8730"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">Usa 8730, 8731... por cada remoto</p>
                  </div>
                  <div>
                    <label className="label">Puerto API del remoto</label>
                    <input
                      type="number"
                      className="input"
                      value={vpnForm.remote_api_port}
                      onChange={e => setVpnForm({ ...vpnForm, remote_api_port: parseInt(e.target.value) })}
                      placeholder="8728"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Usuario PPP (para fijar IP estática)</label>
                  <input
                    className="input"
                    placeholder="Ej: SACHAJ  (opcional)"
                    value={vpnForm.ppp_username}
                    onChange={e => setVpnForm({ ...vpnForm, ppp_username: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Si se indica, fija el IP VPN para que no cambie al reconectar</p>
                </div>

                <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                  <p className="font-semibold">Resultado en el gateway:</p>
                  <code className="block bg-white rounded px-2 py-1 text-blue-800">
                    /ip firewall nat add chain=dstnat protocol=tcp dst-port={vpnForm.forward_port || '8730'} action=dst-nat to-addresses={vpnForm.remote_vpn_ip || '10.x.x.x'} to-ports={vpnForm.remote_api_port || 8728}
                  </code>
                  <p className="font-semibold mt-2">Luego agrega el router así:</p>
                  <code className="block bg-white rounded px-2 py-1 text-blue-800">
                    Host: {onlineDevices.find(d => d.id === vpnForm.gateway_id)?.host || '45.5.x.x'} &nbsp;|&nbsp; Puerto: {vpnForm.forward_port || '8730'}
                  </code>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button onClick={() => setVpnModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => vpnMutation.mutate(vpnForm)}
                  disabled={vpnMutation.isPending || !vpnForm.gateway_id || !vpnForm.remote_vpn_ip || !vpnForm.forward_port}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {vpnMutation.isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Aplicando...</>
                  ) : 'Aplicar regla NAT'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = {
  name: '', host: '', port: 8728, username: 'admin',
  password: '', use_ssl: false, hotspot_server: '', zone: '', notes: '',
};

export default function MikrotikDevicesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editDevice, setEditDevice] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  const { data: devices, isLoading, refetch } = useQuery({
    queryKey: ['devices-full'],
    queryFn: () => mikrotikApi.list().then(r => r.data.data),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => editDevice ? mikrotikApi.update(editDevice.id, data) : mikrotikApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries(['devices-full']);
      qc.invalidateQueries(['devices']);
      const test = res.data.connection_test;
      if (test) {
        toast[test.success ? 'success' : 'error'](
          test.success
            ? `✅ Conectado: ${test.identity} (RouterOS ${test.version})`
            : `⚠️ Creado pero sin conexión: ${test.error}`
        );
      } else {
        toast.success('Dispositivo actualizado');
      }
      setModal(false);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  });

  const testConnection = async (id) => {
    setTestingId(id);
    try {
      const res = await mikrotikApi.test(id);
      const r = res.data.data;
      qc.invalidateQueries(['devices-full']);
      if (r.success) {
        toast.success(`✅ ${r.identity} — RouterOS ${r.version} (${r.uptime})`);
      } else {
        toast.error(`Sin conexión: ${r.error}`);
      }
    } catch {
      toast.error('Error al probar conexión');
    } finally {
      setTestingId(null);
    }
  };

  const syncDevice = async (id, name) => {
    setSyncingId(id);
    try {
      const res = await mikrotikApi.sync(id);
      qc.invalidateQueries(['devices-full']);
      const changes = res.data.data.changes;
      toast.success(`Sync ${name}: ${changes.length} cambios detectados`);
    } catch {
      toast.error('Error al sincronizar');
    } finally {
      setSyncingId(null);
    }
  };

  const openEdit = (d) => {
    setEditDevice(d);
    setForm({ name: d.name, host: d.host, port: d.port, username: d.username, password: '', use_ssl: d.use_ssl, hotspot_server: d.hotspot_server || '', zone: d.zone || '', notes: d.notes || '' });
    setModal(true);
  };

  const StatusDot = ({ status }) => {
    const cfg = {
      online: 'bg-green-500',
      offline: 'bg-gray-400',
      error: 'bg-red-500',
    };
    return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cfg[status] || 'bg-gray-400'} flex-shrink-0`} />;
  };

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Routers MikroTik</h1>
          <p className="text-sm text-gray-500">Gestiona los dispositivos conectados</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-secondary text-sm flex items-center gap-1">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setEditDevice(null); setForm(EMPTY_FORM); setModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Agregar Router
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          Array(3).fill().map((_, i) => <div key={i} className="card animate-pulse h-40" />)
        ) : devices?.length === 0 ? (
          <div className="col-span-2 card text-center text-gray-400 py-12">
            <Wifi className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No hay routers configurados</p>
          </div>
        ) : (
          devices?.map(device => (
            <div key={device.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 p-2 rounded-lg">
                    <Wifi className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{device.name}</h3>
                    <p className="text-xs text-gray-400">{device.host}:{device.port}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusDot status={device.status} />
                  <span className="text-xs text-gray-500 capitalize">{device.status}</span>
                </div>
              </div>

              <div className="text-xs text-gray-400 space-y-1 mb-4">
                {device.zone && <p>Zona: {device.zone}</p>}
                {device.hotspot_server && <p>Servidor HS: {device.hotspot_server}</p>}
                {device.last_sync && <p>Última sync: {new Date(device.last_sync).toLocaleString('es')}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => testConnection(device.id)}
                  disabled={testingId === device.id}
                  className="btn-secondary text-xs flex items-center gap-1 flex-1"
                >
                  <Activity className="w-3 h-3" />
                  {testingId === device.id ? 'Probando...' : 'Probar'}
                </button>
                <button
                  onClick={() => syncDevice(device.id, device.name)}
                  disabled={syncingId === device.id}
                  className="btn-secondary text-xs flex items-center gap-1 flex-1"
                >
                  <RefreshCw className={`w-3 h-3 ${syncingId === device.id ? 'animate-spin' : ''}`} />
                  {syncingId === device.id ? 'Sync...' : 'Sincronizar'}
                </button>
                <button onClick={() => openEdit(device)} className="btn-secondary text-xs px-3">
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-5">
                {editDevice ? 'Editar Router' : 'Agregar Router MikroTik'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="label">Nombre del router *</label>
                  <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ej: Sector Norte" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="label">IP / Host *</label>
                    <input className="input" value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} placeholder="192.168.1.1" />
                  </div>
                  <div>
                    <label className="label">Puerto</label>
                    <input type="number" className="input" value={form.port} onChange={e => setForm({ ...form, port: parseInt(e.target.value) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label">Usuario *</label>
                    <input className="input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Contraseña *</label>
                    <input type="password" className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="label">Servidor Hotspot (nombre en MT)</label>
                  <input className="input" value={form.hotspot_server} onChange={e => setForm({ ...form, hotspot_server: e.target.value })} placeholder="hotspot1" />
                </div>
                <div>
                  <label className="label">Zona geográfica</label>
                  <input className="input" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} placeholder="Zona Norte" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ssl" checked={form.use_ssl} onChange={e => setForm({ ...form, use_ssl: e.target.checked, port: e.target.checked ? 8729 : 8728 })} />
                  <label htmlFor="ssl" className="text-sm text-gray-600">Usar SSL (puerto 8729)</label>
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setModal(false)} className="btn-secondary flex-1">Cancelar</button>
                <button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={saveMutation.isPending || !form.name || !form.host || !form.username}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {saveMutation.isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</>
                  ) : 'Guardar y Probar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('Por favor ingresa email y contraseña');
      return;
    }

    setLoading(true);
    try {
      const result = await login(form.email, form.password);

      if (result?.requires_2fa) {
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      toast.success(`¡Bienvenido, ${result.name}!`);
      navigate(result.role === 'admin' ? '/admin' : '/seller', { replace: true });
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al iniciar sesión';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    if (!totpCode || totpCode.length !== 6) {
      toast.error('Ingresa el código de 6 dígitos');
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email, form.password, totpCode);
      toast.success(`¡Bienvenido, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin' : '/seller', { replace: true });
    } catch (error) {
      const msg = error.response?.data?.error || 'Código incorrecto';
      toast.error(msg);
      setTotpCode('');
    } finally {
      setLoading(false);
    }
  };

  // ── Pantalla de código 2FA ──────────────────────────────────────────
  if (requires2FA) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4 shadow-lg">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Verificación 2FA</h1>
            <p className="text-blue-200 text-sm mt-1">Abre tu app autenticadora</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Código de autenticación</h2>
            <p className="text-gray-500 text-sm mb-5">
              Ingresa el código de 6 dígitos generado por tu app (Google Authenticator, Authy, etc.)
            </p>

            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div>
                <label className="label">Código TOTP</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    className="input pl-10 text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoFocus
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2"
                disabled={loading || totpCode.length !== 6}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </>
                ) : (
                  'Verificar'
                )}
              </button>

              <button
                type="button"
                className="w-full text-sm text-gray-500 hover:text-gray-700 mt-1"
                onClick={() => { setRequires2FA(false); setTotpCode(''); }}
              >
                ← Volver al inicio de sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur rounded-2xl mb-4 shadow-lg">
            <Wifi className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">HotspotManager</h1>
          <p className="text-blue-200 text-sm mt-1">Sistema de Fichas MikroTik</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-5">Iniciar Sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Correo electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="admin@hotspot.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full py-2.5 mt-2 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Ingresando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">
          HotspotManager v1.0 — Sistema SaaS MikroTik
        </p>
      </div>
    </div>
  );
}

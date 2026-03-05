import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, ShieldOff, QrCode, Lock, Copy, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { authApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const qc = useQueryClient();

  // Estado del 2FA
  const { data, isLoading } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: () => authApi.twoFAStatus().then((r) => r.data),
  });

  const isEnabled = data?.two_fa_enabled ?? false;

  // ── Flujo setup ────────────────────────────────────────────────────
  const [setupData, setSetupData] = useState(null); // { qr_code, secret }
  const [verifyCode, setVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableForm, setShowDisableForm] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generar QR
  const setupMutation = useMutation({
    mutationFn: () => authApi.twoFASetup().then((r) => r.data),
    onSuccess: (d) => { setSetupData(d); setVerifyCode(''); },
    onError: (e) => toast.error(e.response?.data?.error || 'Error al generar secreto'),
  });

  // Verificar y activar
  const verifyMutation = useMutation({
    mutationFn: (code) => authApi.twoFAVerify({ code }).then((r) => r.data),
    onSuccess: () => {
      toast.success('2FA activado correctamente ✓');
      setSetupData(null);
      setVerifyCode('');
      qc.invalidateQueries(['2fa-status']);
    },
    onError: (e) => { toast.error(e.response?.data?.error || 'Código incorrecto'); setVerifyCode(''); },
  });

  // Desactivar
  const disableMutation = useMutation({
    mutationFn: (password) => authApi.twoFADisable({ password }).then((r) => r.data),
    onSuccess: () => {
      toast.success('2FA desactivado');
      setShowDisableForm(false);
      setDisablePassword('');
      qc.invalidateQueries(['2fa-status']);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Contraseña incorrecta'),
  });

  const copySecret = () => {
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Seguridad</h1>
        <p className="text-gray-500 mt-1 text-sm">Gestiona las opciones de seguridad de tu cuenta de administrador</p>
      </div>

      {/* Tarjeta 2FA ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
              {isEnabled
                ? <ShieldCheck className="w-6 h-6 text-green-600" />
                : <ShieldOff className="w-6 h-6 text-gray-400" />}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Autenticación de dos factores (2FA)</h2>
              <p className="text-sm text-gray-500">Protege tu cuenta con TOTP (Google Authenticator, Authy)</p>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isEnabled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {isEnabled ? 'Activado' : 'Desactivado'}
          </span>
        </div>

        {/* ── 2FA DESACTIVADO: mostrar botón setup ────────────────── */}
        {!isEnabled && !setupData && (
          <div className="mt-2">
            <p className="text-gray-600 text-sm mb-4">
              Cuando el 2FA está activado, al iniciar sesión necesitarás ingresar un
              código de 6 dígitos generado por tu aplicación de autenticación.
            </p>
            <button
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {setupMutation.isPending
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <QrCode className="w-4 h-4" />}
              Activar 2FA
            </button>
          </div>
        )}

        {/* ── FLUJO SETUP: mostrar QR + verificar ─────────────────── */}
        {!isEnabled && setupData && (
          <div className="mt-4 space-y-5">
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
              <li>Instala <strong>Google Authenticator</strong> o <strong>Authy</strong> en tu celular</li>
              <li>Escanea el código QR o ingresa el secreto manualmente</li>
              <li>Ingresa el código de 6 dígitos para confirmar</li>
            </ol>

            {/* QR Code */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-gray-50 rounded-xl">
              <img
                src={setupData.qr_code}
                alt="QR Code 2FA"
                className="w-44 h-44 rounded-lg border border-gray-200 bg-white p-1"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-500 mb-1">Secreto manual</p>
                <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg">
                  <code className="text-xs font-mono text-gray-700 break-all flex-1">{setupData.secret}</code>
                  <button
                    onClick={copySecret}
                    className="flex-shrink-0 p-1.5 rounded hover:bg-gray-100 transition-colors"
                    title="Copiar secreto"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">Guarda este secreto en un lugar seguro como respaldo</p>
              </div>
            </div>

            {/* Código de verificación */}
            <div>
              <label className="label">Código de verificación</label>
              <div className="flex gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  className="input text-center text-xl tracking-widest font-mono w-44"
                  placeholder="000000"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button
                  onClick={() => verifyMutation.mutate(verifyCode)}
                  disabled={verifyCode.length !== 6 || verifyMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  {verifyMutation.isPending
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <CheckCircle className="w-4 h-4" />}
                  Verificar y activar
                </button>
              </div>
            </div>

            <button
              className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
              onClick={() => setSetupData(null)}
            >
              <XCircle className="w-3 h-3" /> Cancelar
            </button>
          </div>
        )}

        {/* ── 2FA ACTIVADO ────────────────────────────────────────── */}
        {isEnabled && (
          <div className="mt-2">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                El 2FA está activo. Al iniciar sesión se te solicitará un código de tu app de autenticación.
              </p>
            </div>

            {!showDisableForm ? (
              <button
                onClick={() => setShowDisableForm(true)}
                className="btn-danger flex items-center gap-2"
              >
                <ShieldOff className="w-4 h-4" />
                Desactivar 2FA
              </button>
            ) : (
              <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm font-medium text-red-700">Confirma tu contraseña para desactivar 2FA</p>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    className="input pl-10"
                    placeholder="Tu contraseña actual"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => disableMutation.mutate(disablePassword)}
                    disabled={!disablePassword || disableMutation.isPending}
                    className="btn-danger flex items-center gap-2"
                  >
                    {disableMutation.isPending
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <ShieldOff className="w-4 h-4" />}
                    Sí, desactivar
                  </button>
                  <button
                    onClick={() => { setShowDisableForm(false); setDisablePassword(''); }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
              className="mt-3 text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Regenerar secreto
            </button>
            {setupData && (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  Se generó un nuevo secreto. Escanea el QR y verifica el código para confirmar el cambio.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-gray-50 rounded-xl">
                  <img src={setupData.qr_code} alt="QR Code 2FA" className="w-40 h-40 rounded-lg border bg-white p-1" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg">
                      <code className="text-xs font-mono text-gray-700 break-all flex-1">{setupData.secret}</code>
                      <button onClick={copySecret} className="p-1.5 rounded hover:bg-gray-100">
                        {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="input text-center text-xl tracking-widest font-mono w-44"
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                  <button
                    onClick={() => verifyMutation.mutate(verifyCode)}
                    disabled={verifyCode.length !== 6 || verifyMutation.isPending}
                    className="btn-primary flex items-center gap-2"
                  >
                    {verifyMutation.isPending
                      ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <CheckCircle className="w-4 h-4" />}
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { getUserAccessibleAreas } from '../../core/auth/rbac';

export const LoginView: React.FC = () => {
  const { authenticate, setActiveModule } = useErp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const res = authenticate(identifier, password);
      setIsLoading(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Credenciales incorrectas');
        return;
      }

      if (res.user) {
        const allowedAreas = getUserAccessibleAreas(res.user.role);
        if (allowedAreas.length > 0 && allowedAreas[0].modules.length > 0) {
          setActiveModule(allowedAreas[0].modules[0].id);
        }
      }
    }, 250);
  };

  return (
    <div className="min-h-screen w-full bg-[#070D11] text-white flex flex-col font-sans antialiased selection:bg-[#00668F]/30 selection:text-sky-300">
      {/* Fondo con brillo sutil y cuadrícula tecnológica */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#00668F]/20 via-[#070D11] to-[#070D11] pointer-events-none" />

      {/* Header Superior Minimalista Sin Bordes */}
      <header className="px-6 sm:px-10 py-5 flex items-center justify-between z-10 bg-[#070D11]/90 backdrop-blur-md sticky top-0">
        <div>
          <span className="text-2xl sm:text-3xl font-black tracking-wider text-white block leading-none">
            INTECKNO
          </span>
          <span className="text-xs sm:text-sm text-sky-400 font-semibold block mt-1 tracking-wide">
            Sistemas de Transporte por Cable • ERP Corporativo
          </span>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-900/90 border border-slate-800/80 px-4 py-2 rounded-full shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">Servidor Cloud Activo (v2.5)</span>
        </div>
      </header>

      {/* Área Central: Tarjeta de Iniciar Sesión Sin Bordes */}
      <main className="flex-1 w-full px-4 py-8 sm:py-12 flex flex-col items-center justify-center z-10">
        <div className="w-full max-w-md space-y-6">
          
          {/* Card Principal de Autenticación */}
          <div className="bg-[#0D1820] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
            {/* Acento superior con color corporativo */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#00668F]" />

            <div className="text-center space-y-2 mb-6">
              {/* Logo Central de Inteckno Transparente y Grande */}
              <div className="flex justify-center items-center mx-auto mb-4">
                <img
                  src="/inteckno-icon.png"
                  alt="Inteckno"
                  className="h-24 sm:h-28 w-auto max-w-[260px] object-contain transition-transform duration-300 hover:scale-105"
                />
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Iniciar Sesión
              </h1>
              <p className="text-xs text-slate-300">
                Ingrese su usuario o correo institucional y su contraseña personal asignada.
              </p>
            </div>

            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/70 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div className="leading-snug">{errorMessage}</div>
              </div>
            )}

            {/* Formulario de Login */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Usuario o Correo Corporativo
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 z-10">
                    <Mail size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="sistemas@inteckno.com o gmejia"
                    className="login-input w-full pl-10 pr-4 py-3 bg-white text-slate-900 font-semibold text-sm rounded-xl placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#00668F] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Contraseña
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Mínimo 6 caracteres
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 z-10">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="login-input w-full pl-10 pr-11 py-3 bg-white text-slate-900 font-semibold text-sm rounded-xl placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#00668F] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-700 transition-colors z-10 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3.5 px-4 bg-[#00668F] hover:bg-[#005577] active:bg-[#004460] text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión en INTECKNO</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck size={14} /> Acceso Seguro SSL / RBAC
              </span>
              <span>Soporte TI: Ext. 101</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Sin Bordes */}
      <footer className="px-8 py-4 text-center text-[11px] text-slate-500 z-10">
        INTECKNO S.A.S. • Especialistas en Sistemas de Transporte por Cable • NIT: 900.XXX.XXX • Medellín, Colombia
      </footer>
    </div>
  );
};

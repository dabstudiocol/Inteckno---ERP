import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary atrapó un error no controlado:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 rounded-2xl border border-gray-200">
          <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {this.props.fallbackTitle || 'Ocurrió un incidente al cargar esta vista'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                La aplicación protegió tu sesión activa. Puedes recargar la vista o volver al módulo anterior.
              </p>
              {this.state.error?.message && (
                <p className="text-[11px] font-mono text-red-600 bg-red-50 p-2 rounded-lg mt-2 overflow-x-auto text-left">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#00668F] text-white text-xs font-bold rounded-xl hover:bg-[#005273] transition-colors cursor-pointer shadow-xs"
            >
              <RotateCcw size={14} />
              <span>Recargar Vista</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

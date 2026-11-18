import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#090d16] text-white">
          <div className="max-w-md w-full p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shadow-lg shadow-red-500/10">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-white tracking-tight">
              Kutilmagan xatolik yuz berdi
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Ilovada vaqtinchalik nosozlik kuzatildi. Iltimos, sahifani yangilab ko'ring yoki bosh sahifaga qayting.
            </p>

            {this.state.error?.message && (
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 text-left overflow-x-auto text-[11px] font-mono text-slate-400">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Qayta yuklash</span>
              </button>

              <button
                onClick={this.handleGoHome}
                className="py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Home className="w-4 h-4" />
                <span>Bosh sahifa</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

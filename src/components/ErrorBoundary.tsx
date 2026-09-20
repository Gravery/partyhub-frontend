import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('💥 ErrorBoundary capturou um erro não tratado na interface:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHub = () => {
    window.location.href = '/hub';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center p-6 font-sans">
          <div className="max-w-lg w-full bg-black/80 border-2 border-red-500/80 rounded-3xl p-8 shadow-[0_0_50px_rgba(239,68,68,0.4)] backdrop-blur-xl text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/20 border border-red-500/50 rounded-2xl flex items-center justify-center mx-auto text-3xl">
              ⚠️
            </div>

            <div>
              <h2 className="text-2xl font-black text-red-400 uppercase tracking-wider mb-2">
                {this.props.fallbackTitle || 'Ops! Ocorreu uma falha visual'}
              </h2>
              <p className="text-gray-300 text-sm leading-relaxed">
                Um erro inesperado aconteceu ao renderizar esta tela. Graças ao sistema de reconexão resiliente, seu progresso na partida continua salvo no servidor.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-3 text-left font-mono text-xs text-red-300 overflow-x-auto max-h-32">
                <p className="font-bold text-red-200">{this.state.error.name}: {this.state.error.message}</p>
              </div>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg active:scale-95"
              >
                Recarregar Sala
              </button>
              <button
                onClick={this.handleGoHub}
                className="flex-1 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95"
              >
                Voltar ao Hub
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

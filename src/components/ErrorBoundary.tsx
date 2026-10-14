import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import i18n from '../i18n';

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
        <div className="accent-brand min-h-[100dvh] bg-ground text-body flex items-center justify-center p-6">
          <div role="alert" className="max-w-lg w-full surface border-rose-700 p-8 text-center flex flex-col items-center gap-5">
            <span className="w-16 h-16 rounded-2xl bg-rose-950 text-rose-300 flex items-center justify-center">
              <AlertTriangle size={32} />
            </span>
            <div className="space-y-2">
              <h2 className="font-display font-bold text-2xl text-ink">{this.props.fallbackTitle || i18n.t('error.title')}</h2>
              <p className="text-sm text-body leading-relaxed">{i18n.t('error.body')}</p>
            </div>

            {this.state.error && (
              <pre className="w-full bg-ground border border-line rounded-xl p-3 text-left font-mono text-xs text-rose-200 overflow-x-auto max-h-32 whitespace-pre-wrap">
                {this.state.error.name}: {this.state.error.message}
              </pre>
            )}

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <button type="button" onClick={this.handleGoHub} className="btn btn-secondary btn-lg sm:flex-1">
                {i18n.t('common.back_to_hub')}
              </button>
              <button type="button" onClick={this.handleReload} className="btn btn-primary btn-lg sm:flex-1">
                {i18n.t('error.reload')}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

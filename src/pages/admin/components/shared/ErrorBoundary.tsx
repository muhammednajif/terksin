import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  name?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'unknown'}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-xl border border-black/5 p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-orange-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-800 mb-1">
            {this.props.name || 'Section'} unavailable
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          {this.props.onRetry && (
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); this.props.onRetry?.(); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-emerald text-white rounded-xl text-xs font-medium"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

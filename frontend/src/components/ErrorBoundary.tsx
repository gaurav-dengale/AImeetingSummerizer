import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card col-span-12 p-6 border-accent-rose/30 bg-accent-rose/[0.04] text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-accent-rose/20 text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">
            {this.props.fallbackTitle || "Something went wrong in this section"}
          </h3>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            {this.state.error?.message || "An unexpected error occurred while rendering this tab."}
          </p>
          <button
            onClick={this.handleReset}
            className="btn-secondary text-xs inline-flex items-center gap-1.5 px-3 py-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

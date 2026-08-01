import { Component, type ErrorInfo, type ReactNode } from 'react';
import Button from '../ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Standard Error Boundary component to catch React rendering crashes.
 * Displays a clean recovery page to the user.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
          <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-950 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
            <div className="w-16 h-16 bg-danger-500/10 text-danger-500 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-heading text-slate-900 dark:text-white">
                Something went wrong
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                An unexpected client-side error occurred. We have logged the details and are looking into it.
              </p>
              {this.state.error && (
                <pre className="text-left text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-lg overflow-x-auto text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 max-h-32">
                  {this.state.error.message}
                </pre>
              )}
            </div>
            <Button onClick={this.handleReset} variant="default" className="w-full">
              Back to Home
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Catches render errors under HQ admin routes so a single bad screen does not blank the whole shell.
 */
export default class AdminRouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[hq] Admin route render error', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          className="rounded-xl border border-red-900/50 bg-red-950/30 p-6 text-sm text-red-100 max-w-lg min-w-0"
          role="alert"
        >
          <p className="font-semibold text-red-50">This page hit a render error.</p>
          <p className="mt-2 text-red-200/90 break-words">{this.state.error.message}</p>
          <button
            type="button"
            className="mt-4 rounded-md border border-red-800 px-3 py-2 text-xs text-red-100 hover:bg-red-950/50"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

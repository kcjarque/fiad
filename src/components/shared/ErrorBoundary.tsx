import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Top-level error boundary so a runtime crash in any one screen doesn't
 * white-screen the whole app at the event. Shows a friendly fallback
 * with a reload button. Logs the actual error to the console.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep this — gives the on-site operator something to screenshot.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] caught', error, info);
  }

  reset = () => {
    // Hard reload to flush any wedged state. SW is network-first for the
    // app shell so this always picks up the freshest bundle if available.
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-soft p-6 text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-coral mb-2">
            Something went wrong
          </div>
          <div className="font-display text-plum text-xl mb-2">We hit a snag</div>
          <div className="text-sm text-plum/70 mb-5">
            Tap "Reload" to refresh. If this keeps happening, find a staff
            member and tell them the screen crashed.
          </div>
          <button onClick={this.reset} className="btn-primary w-full">
            Reload
          </button>
          <details className="mt-4 text-left">
            <summary className="text-[10px] text-plum/40 cursor-pointer">
              Technical detail
            </summary>
            <pre className="mt-2 text-[10px] text-plum/60 whitespace-pre-wrap break-all">
              {this.state.error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * React Error Boundary — catches render-time errors in any child tree.
 * Prevents a single component crash from white-screening the full app.
 *
 * Usage:
 *   <ErrorBoundary label="Agent Mesh">
 *     <MeshTopologyGraph ... />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary: ${this.props.label ?? 'unknown'}]`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const label = this.props.label ?? 'This section';
    const compact = this.props.compact ?? false;

    if (compact) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px', background: '#FEF3F2', border: '1px solid #FEE4E2',
          borderRadius: 6, fontSize: 12, color: '#B42318' }}>
          <AlertTriangle size={13} strokeWidth={2} />
          <span>{label} failed to render.</span>
          <button
            onClick={this.handleReset}
            style={{ marginLeft: 'auto', background: 'none', border: 'none',
              cursor: 'pointer', color: '#B42318', fontWeight: 600, fontSize: 12 }}>
            Retry
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '48px 24px', gap: 12,
        background: '#FEF3F2', border: '1px solid #FEE4E2', borderRadius: 8 }}>
        <AlertTriangle size={28} strokeWidth={1.5} style={{ color: '#EF4444' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#101828' }}>
            {label} encountered an error
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#64748B', maxWidth: 420 }}>
            {this.state.error?.message ?? 'An unexpected rendering error occurred.'}
          </p>
        </div>
        <button
          onClick={this.handleReset}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
            background: 'white', border: '1px solid #E2E8F0', borderRadius: 6,
            cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#344054' }}>
          <RotateCcw size={12} strokeWidth={2} />
          Reload section
        </button>
      </div>
    );
  }
}

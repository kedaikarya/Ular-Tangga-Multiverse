import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Terjadi kesalahan tidak terduga pada aplikasi.'
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let displayDetail = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          displayDetail = `${parsed.error} (${parsed.operationType || 'op'} pada ${parsed.path || '-'})`;
        }
      } catch (_) {}

      return (
        <div className="min-h-[100dvh] w-screen bg-[#060913] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-slate-900/95 border border-rose-500/40 p-6 shadow-2xl space-y-4 text-center">
            <div className="text-4xl">⚠️</div>
            <h2 className="font-display text-lg font-extrabold text-white">
              Terjadi Gangguan Koneksi / Data
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed break-words">
              {displayDetail}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-extrabold transition"
            >
              🔄 Muat Ulang Aplikasi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

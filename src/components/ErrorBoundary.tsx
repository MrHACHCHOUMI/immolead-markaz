"use client";

import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#071510] p-6 text-white">
          <div className="max-w-md rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-sm">
            <p className="font-semibold">Erreur application</p>
            <p className="mt-2 text-rose-100">{this.state.message}</p>
            <button
              type="button"
              className="mt-4 rounded-xl bg-white px-4 py-2 text-slate-900"
              onClick={() => window.location.assign("/login")}
            >
              Retour login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

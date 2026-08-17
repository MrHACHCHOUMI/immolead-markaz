"use client";

import { Topbar } from "@/components/layout/Topbar";

type PageShellProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <>
      <Topbar title={title} subtitle={subtitle} actions={actions} />
      <div className="p-6">
        {children ?? (
          <div className="crm-panel px-6 py-16 text-center text-sm text-white/45">
            Module en cours de construction.
          </div>
        )}
      </div>
    </>
  );
}

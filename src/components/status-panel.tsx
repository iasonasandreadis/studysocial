import type { ReactNode } from "react";

type StatusPanelProps = {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  loading?: boolean;
};

/** Shared empty/error presentation; use loading only for an active operation. */
export function StatusPanel({
  title,
  children,
  action,
  loading = false,
}: StatusPanelProps) {
  return (
    <section
      className="status-panel"
      role={loading ? "status" : undefined}
      aria-live={loading ? "polite" : undefined}
    >
      <span
        className={loading ? "status-symbol loading-symbol" : "status-symbol"}
        aria-hidden="true"
      >
        ✳
      </span>
      <h1>{title}</h1>
      <div className="status-description">{children}</div>
      {action && <div className="status-action">{action}</div>}
    </section>
  );
}

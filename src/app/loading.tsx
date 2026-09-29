import { StatusPanel } from "@/components/status-panel";
export default function Loading() {
  return (
    <main id="main" className="container">
      <StatusPanel title="Getting things ready…" loading>
        <p>Just a moment. Your next chapter is on its way.</p>
      </StatusPanel>
    </main>
  );
}

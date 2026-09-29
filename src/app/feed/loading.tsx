import { ProfileShell } from "@/components/profile/profile-shell";
export default function FeedLoading() {
  return (
    <ProfileShell>
      <p role="status">Loading your study circle…</p>
      <div className="feed-list" aria-hidden="true">
        {[1, 2].map((i) => (
          <div className="feed-card skeleton-card" key={i}>
            <div className="skeleton-line" />
            <div className="skeleton-photo" />
            <div className="skeleton-line" />
          </div>
        ))}
      </div>
    </ProfileShell>
  );
}

export function StudySymbol({ kind }: { kind: "clock" | "week" | "flame" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {kind === "clock" ? (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </>
      ) : kind === "week" ? (
        <>
          <rect x="3.5" y="5" width="17" height="16" rx="3" />
          <path d="M7.5 3v4m9-4v4M4 10h16m-12 5 2.5 2.5 5-5" />
        </>
      ) : (
        <>
          <path d="M13 2c1 5-4 6-3 10-2-1-3-3-3-3s-3 4-3 7a8 8 0 0 0 16 0c0-5-4-10-7-14Z" />
          <path d="M12 14c-1 2-3 3-3 5a3 3 0 0 0 6 0c0-2-2-3-3-5Z" />
        </>
      )}
    </svg>
  );
}

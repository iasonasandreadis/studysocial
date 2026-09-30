const paths = {
  home: "M3 10 12 3l9 7v11h-6v-7H9v7H3z",
  search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  plus: "M12 5v14M5 12h14",
  user: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 21v-2a8 8 0 0 1 16 0v2",
  heart:
    "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z",
  comment:
    "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 12.5 3h.5a8.5 8.5 0 0 1 8 8v.5z",
  share: "M12 16V3m-5 5 5-5 5 5M5 12v9h14v-9",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4",
  menu: "M4 6h16M4 12h16M4 18h16",
  back: "m14 5-7 7 7 7",
  camera: "M4 7h4l2-3h4l2 3h4v14H4zM16 13a4 4 0 1 0-8 0 4 4 0 0 0 8 0",
  clock: "M12 8v5l3 2M22 12a10 10 0 1 0-20 0 10 10 0 0 0 20 0",
  group:
    "M9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6M2 20v-3a7 7 0 0 1 14 0v3M16 4a3 3 0 0 1 0 6M19 13a5 5 0 0 1 3 4v3",
};
export type IconName = keyof typeof paths;
export function Icon({
  name,
  filled = false,
}: {
  name: IconName;
  filled?: boolean;
}) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

const paths = {
  account: "M20 21a8 8 0 0 0-16 0 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  participation: "m4 11 16-7-7 16-2.5-6.5L4 11Zm6.5 2.5L20 4",
  calendar: "M7 3v4m10-4v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12a2 2 0 0 0 4 0",
  verified: "M12 22c4.6-2.2 7-5.1 7-9V5l-7-3-7 3v8c0 3.9 2.4 6.8 7 9Zm-3-10 2 2 4-4",
  signOut: "M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4m6-12 4 4-4 4m4-4H8",
  close: "M6 6l12 12M6 18 18 6",
  pencil: "m15 5 4 4M4 20l4.7-1 11-11a2.8 2.8 0 0 0-4-4l-11 11L4 20Z",
  lock: "M7 10V7a5 5 0 0 1 10 0v3M6 10h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Zm6 4v3",
} as const;

export function DashboardIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg className="participant-dashboard-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={paths[name]} />
    </svg>
  );
}

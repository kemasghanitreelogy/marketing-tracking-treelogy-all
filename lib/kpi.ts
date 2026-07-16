// Shared between the server page (validates ?win=) and the client switcher —
// lives outside any "use client" module so the server can use it as a value.
export const KPI_WINDOWS = [7, 14, 30, 60, 90] as const;

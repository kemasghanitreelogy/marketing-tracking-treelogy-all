// Route-level skeleton: instant paint on first load / hard refresh while the
// dashboard payload streams in. Filter toggles use useTransition instead, so
// the old charts stay visible — this only covers cold navigations.
function Sk({ className = "", h = "1rem" }: { className?: string; h?: string }) {
  return <div className={`animate-pulse rounded-lg ${className}`} style={{ height: h, background: "var(--line-soft)" }} />;
}

function SkCard({ h }: { h: string }) {
  return (
    <div className="rounded-xl border p-5" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
      <Sk className="mb-4 w-40" h="0.9rem" />
      <Sk h={h} />
    </div>
  );
}

export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6" aria-busy="true" aria-label="Loading dashboard">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Sk className="w-72" h="0.75rem" />
          <Sk className="w-96" h="1.6rem" />
        </div>
        <div className="flex gap-3">
          <Sk className="w-28 rounded-full" h="1.9rem" />
          <Sk className="w-32 rounded-full" h="1.9rem" />
          <Sk className="w-36 rounded-full" h="1.9rem" />
        </div>
      </header>

      {/* channel filter bar */}
      <div className="mb-6 flex items-center gap-2 rounded-xl border px-4 py-3" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <Sk className="w-16" h="0.7rem" />
        {[1, 2, 3, 4, 5].map((i) => <Sk key={i} className="w-24 rounded-full" h="1.6rem" />)}
      </div>

      {/* automated insights */}
      <Sk className="mb-2 w-40" h="0.7rem" />
      <section className="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
            <Sk className="mb-2 w-20 rounded-full" h="1.1rem" />
            <Sk className="mb-2 w-3/4" h="1rem" />
            <Sk className="w-full" h="0.75rem" />
          </div>
        ))}
      </section>

      {/* KPI row */}
      <Sk className="mb-2 w-48" h="0.7rem" />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
            <Sk className="mb-3 w-16" h="0.6rem" />
            <Sk className="mb-2 w-24" h="1.4rem" />
            <Sk className="w-20" h="0.6rem" />
          </div>
        ))}
      </section>

      {/* chart blocks */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><SkCard h="16rem" /></div>
        <SkCard h="16rem" />
      </section>
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <SkCard h="14rem" />
        <SkCard h="14rem" />
      </section>
      <section className="mt-4"><SkCard h="18rem" /></section>
    </main>
  );
}

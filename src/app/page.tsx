export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold mb-4">AEGIS</h1>
        <p className="text-lg text-muted-foreground">
          Audit Compliance Management System
        </p>
        <div className="mt-8 p-4 border rounded-lg bg-card">
          <p className="text-sm">
            Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
          </p>
        </div>
      </div>
    </main>
  );
}

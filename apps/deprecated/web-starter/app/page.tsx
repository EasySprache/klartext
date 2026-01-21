export default function Home() {
  return (
    <main className="container py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-primary-700">KlarText</h1>
        <p className="text-lg text-[var(--color-text-secondary)]">
          Turn complex text into easy-to-understand language
        </p>
      </header>

      <section aria-labelledby="input-heading" className="mb-8">
        <h2 id="input-heading" className="sr-only">
          Text Input
        </h2>
        <p className="text-[var(--color-text-secondary)]">
          Starter skeleton. Replace with the accessibility-first UI.
        </p>
        <p className="text-sm mt-4 text-[var(--color-text-secondary)]">
          API base: {process.env.NEXT_PUBLIC_API_BASE_URL || "Not configured"}
        </p>
      </section>
    </main>
  );
}

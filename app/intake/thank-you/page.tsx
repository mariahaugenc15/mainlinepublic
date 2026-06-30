export default async function IntakeThankYouPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center bg-sand-50 px-4 py-8 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-2xl text-success">✓</span>
      <h1 className="mb-2 text-xl font-semibold text-navy-900">Request received</h1>
      <p className="text-sm text-ink-500">Thanks for reaching out — our dispatch team will confirm your appointment shortly.</p>
    </div>
  );
}

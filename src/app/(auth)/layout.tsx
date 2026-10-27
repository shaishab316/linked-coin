export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}

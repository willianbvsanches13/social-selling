import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">Social Selling Platform</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Manage your Instagram business conversations and products
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-block px-6 py-3 border border-primary text-primary rounded-lg font-semibold hover:bg-primary/10 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}

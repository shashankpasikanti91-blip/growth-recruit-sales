import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/auth/login');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      padding: '1rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Redirecting to login...</h1>
        <p style={{ color: '#555' }}>If you are not redirected automatically, <Link href="/auth/login">click here</Link>.</p>
      </div>
    </div>
  );
}

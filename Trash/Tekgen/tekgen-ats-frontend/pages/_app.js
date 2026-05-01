import React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import ProtectedRoute from '../lib/ProtectedRoute';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  
  // Public pages that don't need protection
  const publicPages = ['/auth/login', '/auth/signup', '/'];
  const isPublicPage = publicPages.includes(router.pathname);

  // If it's a public page or ProtectedRoute component, render directly
  if (isPublicPage || Component === ProtectedRoute) {
    return <Component {...pageProps} />;
  }

  // All other pages need authentication
  return (
    <ProtectedRoute>
      <Component {...pageProps} />
    </ProtectedRoute>
  );
}

export default MyApp;

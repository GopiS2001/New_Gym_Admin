import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router';

import { gymRoutes } from 'src/gym/routes';
import { AuthSplitLayout } from 'src/layouts/auth-split';

import { SplashScreen } from 'src/components/loading-screen';

import { GuestGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

const SignInPage = lazy(() => import('src/pages/auth/jwt/sign-in'));
const ResetPasswordPage = lazy(() => import('src/gym/auth/reset-password-view'));
const Page403 = lazy(() => import('src/pages/error/403'));
const Page404 = lazy(() => import('src/pages/error/404'));
const Page500 = lazy(() => import('src/pages/error/500'));

const authLayout = (children: React.ReactNode, title?: string) => (
  <Suspense fallback={<SplashScreen />}>
    <AuthSplitLayout
      slotProps={{
        section: {
          title: title ?? 'Premium Fitness Admin',
          subtitle: 'Manage members, exercises, programs and content for the app.',
          imgUrl: '/assets/illustrations/illustration-dashboard.webp',
          methods: [],
        },
      }}
    >
      {children}
    </AuthSplitLayout>
  </Suspense>
);

/**
 * Admin dashboard routes. The template's demo pages remain in the codebase as
 * a component reference but are no longer routed.
 */
export const routesSection: RouteObject[] = [
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  {
    path: 'auth/jwt/sign-in',
    element: <GuestGuard>{authLayout(<SignInPage />, 'Welcome back')}</GuestGuard>,
  },
  {
    path: 'auth/reset-password',
    element: authLayout(<ResetPasswordPage />, 'Reset your password'),
  },

  ...gymRoutes,

  {
    path: 'error',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Navigate to="/error/404" replace />
      </Suspense>
    ),
  },
  {
    path: 'error/403',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Page403 />
      </Suspense>
    ),
  },
  {
    path: 'error/500',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Page500 />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Page404 />
      </Suspense>
    ),
  },
];

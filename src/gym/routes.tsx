import type { RouteObject } from 'react-router';
import type { PermissionKey } from './permissions';

import { lazy, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router';

import { usePathname } from 'src/routes/hooks';

import { DashboardLayout } from 'src/layouts/dashboard';

import { LoadingScreen } from 'src/components/loading-screen';

import { AuthGuard } from 'src/auth/guard';

import { P, usePermissions, PermissionGuard } from './permissions';

// ----------------------------------------------------------------------

const lazyNamed = <T extends Record<string, React.ComponentType<any>>>(
  loader: () => Promise<T>,
  name: keyof T
) => lazy(() => loader().then((m) => ({ default: m[name] as React.ComponentType<any> })));

const OverviewView = lazyNamed(() => import('./overview/overview-view'), 'OverviewView');
const MemberListView = lazyNamed(() => import('./members/member-views'), 'MemberListView');
const MemberDetailView = lazyNamed(() => import('./members/member-views'), 'MemberDetailView');
const ExerciseListView = lazyNamed(
  () => import('./exercises/exercise-list-view'),
  'ExerciseListView'
);
const ExerciseCreateView = lazyNamed(
  () => import('./exercises/exercise-form-view'),
  'ExerciseCreateView'
);
const ExerciseEditView = lazyNamed(
  () => import('./exercises/exercise-form-view'),
  'ExerciseEditView'
);
const ExercisePreviewView = lazyNamed(
  () => import('./exercises/exercise-preview-view'),
  'ExercisePreviewView'
);
const ProgramListView = lazyNamed(() => import('./programs/program-list-view'), 'ProgramListView');
const ProgramCreateView = lazyNamed(
  () => import('./programs/program-form-view'),
  'ProgramCreateView'
);
const ProgramEditView = lazyNamed(() => import('./programs/program-form-view'), 'ProgramEditView');
const ProgramPreviewView = lazyNamed(
  () => import('./programs/program-preview-view'),
  'ProgramPreviewView'
);
const ContentPages = lazyNamed(() => import('./content/content-pages'), 'ContentPage');
const CoachFormView = lazyNamed(() => import('./content/content-forms'), 'CoachFormView');
const TemplateFormView = lazyNamed(() => import('./content/content-forms'), 'TemplateFormView');
const CollectionFormView = lazyNamed(() => import('./content/content-forms'), 'CollectionFormView');
const ReferencePage = lazyNamed(() => import('./reference/reference-page'), 'ReferencePage');
const MediaView = lazyNamed(() => import('./admin/media-view'), 'MediaView');
const NotificationsView = lazyNamed(() => import('./admin/admin-views'), 'NotificationsView');
const AdministratorsView = lazyNamed(() => import('./admin/admin-views'), 'AdministratorsView');
const AuditLogView = lazyNamed(() => import('./admin/admin-views'), 'AuditLogView');
const AccountView = lazyNamed(() => import('./admin/admin-views'), 'AccountView');

// ----------------------------------------------------------------------

function SuspenseOutlet() {
  const pathname = usePathname();
  return (
    <Suspense key={pathname} fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  );
}

const guard = (permission: PermissionKey | PermissionKey[], el: React.ReactNode) => (
  <PermissionGuard permission={permission}>{el}</PermissionGuard>
);

/** Landing page: the dashboard for those who can see it, otherwise the first allowed module. */
function Home() {
  const { can } = usePermissions();
  if (can(P.DASHBOARD_VIEW)) return <OverviewView />;
  if (can(P.USERS_VIEW)) return <Navigate to="/dashboard/members" replace />;
  if (can(P.CONTENT_VIEW)) return <Navigate to="/dashboard/exercises" replace />;
  return <Navigate to="/dashboard/account" replace />;
}

export const gymRoutes: RouteObject[] = [
  {
    path: 'dashboard',
    element: (
      <AuthGuard>
        <DashboardLayout>
          <SuspenseOutlet />
        </DashboardLayout>
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Home /> },
      {
        path: 'members',
        children: [
          { index: true, element: guard(P.USERS_VIEW, <MemberListView />) },
          { path: ':id', element: guard(P.USERS_VIEW, <MemberDetailView />) },
        ],
      },
      {
        path: 'exercises',
        children: [
          { index: true, element: guard(P.CONTENT_VIEW, <ExerciseListView />) },
          { path: 'new', element: guard(P.CONTENT_MANAGE, <ExerciseCreateView />) },
          { path: ':id', element: guard(P.CONTENT_VIEW, <ExercisePreviewView />) },
          { path: ':id/edit', element: guard(P.CONTENT_MANAGE, <ExerciseEditView />) },
        ],
      },
      {
        path: 'programs',
        children: [
          { index: true, element: guard(P.CONTENT_VIEW, <ProgramListView />) },
          { path: 'new', element: guard(P.CONTENT_MANAGE, <ProgramCreateView />) },
          { path: ':id', element: guard(P.CONTENT_VIEW, <ProgramPreviewView />) },
          { path: ':id/edit', element: guard(P.CONTENT_MANAGE, <ProgramEditView />) },
        ],
      },
      {
        path: 'workout-templates',
        children: [
          { index: true, element: guard(P.CONTENT_VIEW, <ContentPages kind="templates" />) },
          { path: 'new', element: guard(P.CONTENT_MANAGE, <TemplateFormView />) },
          { path: ':id/edit', element: guard(P.CONTENT_MANAGE, <TemplateFormView />) },
        ],
      },
      {
        path: 'coaches',
        children: [
          { index: true, element: guard(P.CONTENT_VIEW, <ContentPages kind="coaches" />) },
          { path: 'new', element: guard(P.CONTENT_MANAGE, <CoachFormView />) },
          { path: ':id/edit', element: guard(P.CONTENT_MANAGE, <CoachFormView />) },
        ],
      },
      {
        path: 'collections',
        children: [
          { index: true, element: guard(P.CONTENT_VIEW, <ContentPages kind="collections" />) },
          { path: 'new', element: guard(P.CONTENT_MANAGE, <CollectionFormView />) },
          { path: ':id/edit', element: guard(P.CONTENT_MANAGE, <CollectionFormView />) },
        ],
      },
      { path: 'catalog/:resource', element: guard(P.CONTENT_VIEW, <ReferencePage />) },
      { path: 'media', element: guard(P.CONTENT_VIEW, <MediaView />) },
      { path: 'notifications', element: guard(P.NOTIFICATIONS_MANAGE, <NotificationsView />) },
      { path: 'administrators', element: guard(P.ADMINS_MANAGE, <AdministratorsView />) },
      { path: 'audit-logs', element: guard(P.AUDIT_VIEW, <AuditLogView />) },
      { path: 'account', element: <AccountView /> },
    ],
  },
];

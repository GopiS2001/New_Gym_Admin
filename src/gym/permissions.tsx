import { m } from 'framer-motion';

import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { ForbiddenIllustration } from 'src/assets/illustrations';

import { varBounce, MotionContainer } from 'src/components/animate';

import { useAuthContext } from 'src/auth/hooks';

import { gymPaths } from './paths';

// ----------------------------------------------------------------------

export const P = {
  DASHBOARD_VIEW: 'dashboard.view',
  USERS_VIEW: 'users.view',
  USERS_MANAGE: 'users.manage',
  USERS_EXPORT: 'users.export',
  CONTENT_VIEW: 'content.view',
  CONTENT_MANAGE: 'content.manage',
  MEDIA_MANAGE: 'media.manage',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
  ADMINS_MANAGE: 'admins.manage',
  AUDIT_VIEW: 'audit.view',
} as const;

export type PermissionKey = (typeof P)[keyof typeof P];

/** UI-side permission check. The API enforces the same permissions on every request. */
export function usePermissions() {
  const { user } = useAuthContext();
  const granted: string[] = user?.permissions ?? [];
  const can = (...keys: PermissionKey[]) => keys.every((k) => granted.includes(k));
  return { can, granted };
}

type GateProps = {
  permission: PermissionKey | PermissionKey[];
  children: React.ReactNode;
};

/** Route-level guard that shows a 403 screen instead of the page. */
export function PermissionGuard({ permission, children }: GateProps) {
  const { can } = usePermissions();
  const keys = Array.isArray(permission) ? permission : [permission];

  if (can(...keys)) return <>{children}</>;

  return (
    <MotionContainer sx={{ textAlign: 'center', py: 10, px: 3 }}>
      <m.div variants={varBounce('in')}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Permission denied
        </Typography>
      </m.div>
      <m.div variants={varBounce('in')}>
        <Typography sx={{ color: 'text.secondary' }}>
          Your role does not include access to this page. Ask a Super Admin if you need it.
        </Typography>
      </m.div>
      <m.div variants={varBounce('in')}>
        <ForbiddenIllustration sx={{ my: { xs: 5, sm: 8 }, height: 240 }} />
      </m.div>
      <Button component={RouterLink} href={gymPaths.root} variant="contained" size="large">
        Back to dashboard
      </Button>
    </MotionContainer>
  );
}

/** Inline gate: renders children only with the permission. */
export function Can({ permission, children }: GateProps) {
  const { can } = usePermissions();
  const keys = Array.isArray(permission) ? permission : [permission];
  return can(...keys) ? <>{children}</> : null;
}

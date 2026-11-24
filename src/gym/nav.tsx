import type { PermissionKey } from './permissions';
import type { NavSectionProps } from 'src/components/nav-section';

import { P } from './permissions';
import { gymPaths } from './paths';
import { Iconify } from './components/icon';
import { RESOURCES } from './reference/config';

// ----------------------------------------------------------------------

const icon = (name: string) => <Iconify icon={name} width={24} />;

type Item = NavSectionProps['data'][number]['items'][number] & { permission?: PermissionKey };

const sections: { subheader: string; items: Item[] }[] = [
  {
    subheader: 'Overview',
    items: [
      {
        title: 'Dashboard',
        path: gymPaths.root,
        icon: icon('solar:chart-square-outline'),
        permission: P.DASHBOARD_VIEW,
      },
    ],
  },
  {
    subheader: 'Members',
    items: [
      {
        title: 'Members',
        path: gymPaths.members.root,
        icon: icon('solar:users-group-rounded-bold-duotone'),
        permission: P.USERS_VIEW,
        deepMatch: true,
      },
    ],
  },
  {
    subheader: 'Content',
    items: [
      {
        title: 'Exercises',
        path: gymPaths.exercises.root,
        icon: icon('solar:dumbbell-large-minimalistic-bold'),
        permission: P.CONTENT_VIEW,
        deepMatch: true,
      },
      {
        title: 'Programs',
        path: gymPaths.programs.root,
        icon: icon('solar:notebook-bold-duotone'),
        permission: P.CONTENT_VIEW,
        deepMatch: true,
      },
      {
        title: 'Workout templates',
        path: gymPaths.templates.root,
        icon: icon('solar:clipboard-list-bold-duotone'),
        permission: P.CONTENT_VIEW,
        deepMatch: true,
      },
      {
        title: 'Coaches',
        path: gymPaths.coaches.root,
        icon: icon('solar:user-id-bold'),
        permission: P.CONTENT_VIEW,
        deepMatch: true,
      },
      {
        title: 'Featured collections',
        path: gymPaths.collections.root,
        icon: icon('solar:star-bold-duotone'),
        permission: P.CONTENT_VIEW,
        deepMatch: true,
      },
      {
        title: 'Media library',
        path: gymPaths.media,
        icon: icon('solar:gallery-wide-bold'),
        permission: P.CONTENT_VIEW,
      },
    ],
  },
  {
    subheader: 'Catalog setup',
    items: RESOURCES.map((r) => ({
      title: r.label,
      path: gymPaths.reference(r.key),
      icon: icon(r.icon),
      permission: P.CONTENT_VIEW,
    })),
  },
  {
    subheader: 'Engagement',
    items: [
      {
        title: 'Notifications',
        path: gymPaths.notifications,
        icon: icon('solar:bell-bing-bold-duotone'),
        permission: P.NOTIFICATIONS_MANAGE,
      },
    ],
  },
  {
    subheader: 'Administration',
    items: [
      {
        title: 'Administrators',
        path: gymPaths.admins,
        icon: icon('solar:shield-keyhole-bold-duotone'),
        permission: P.ADMINS_MANAGE,
      },
      {
        title: 'Audit logs',
        path: gymPaths.audit,
        icon: icon('solar:file-check-bold-duotone'),
        permission: P.AUDIT_VIEW,
      },
    ],
  },
];

/** Navigation filtered to the signed-in admin's permissions. */
export function buildNav(granted: string[]): NavSectionProps['data'] {
  return sections
    .map((s) => ({
      subheader: s.subheader,
      items: s.items
        .filter((i) => !i.permission || granted.includes(i.permission))
        .map(({ permission: _p, ...i }) => i),
    }))
    .filter((s) => s.items.length);
}

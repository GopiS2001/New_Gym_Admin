const ROOT = '/dashboard';

export const gymPaths = {
  root: ROOT,
  signIn: '/auth/jwt/sign-in',
  members: {
    root: `${ROOT}/members`,
    details: (id: number | string) => `${ROOT}/members/${id}`,
  },
  exercises: {
    root: `${ROOT}/exercises`,
    new: `${ROOT}/exercises/new`,
    edit: (id: number | string) => `${ROOT}/exercises/${id}/edit`,
    preview: (id: number | string) => `${ROOT}/exercises/${id}`,
  },
  programs: {
    root: `${ROOT}/programs`,
    new: `${ROOT}/programs/new`,
    edit: (id: number | string) => `${ROOT}/programs/${id}/edit`,
    preview: (id: number | string) => `${ROOT}/programs/${id}`,
  },
  templates: {
    root: `${ROOT}/workout-templates`,
    new: `${ROOT}/workout-templates/new`,
    edit: (id: number | string) => `${ROOT}/workout-templates/${id}/edit`,
  },
  coaches: {
    root: `${ROOT}/coaches`,
    new: `${ROOT}/coaches/new`,
    edit: (id: number | string) => `${ROOT}/coaches/${id}/edit`,
  },
  collections: {
    root: `${ROOT}/collections`,
    new: `${ROOT}/collections/new`,
    edit: (id: number | string) => `${ROOT}/collections/${id}/edit`,
  },
  reference: (key: string) => `${ROOT}/catalog/${key}`,
  media: `${ROOT}/media`,
  notifications: `${ROOT}/notifications`,
  admins: `${ROOT}/administrators`,
  audit: `${ROOT}/audit-logs`,
  account: `${ROOT}/account`,
};

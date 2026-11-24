import type { IconifyProps } from 'src/components/iconify';
import type { IconifyName } from 'src/components/iconify/register-icons';

import { Iconify as BaseIconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/** Iconify with a plain `string` icon name (gym icons are registered offline in icon-sets). */
export function Iconify({ icon, ...other }: Omit<IconifyProps, 'icon'> & { icon: string }) {
  return <BaseIconify icon={icon as IconifyName} {...other} />;
}

import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';
import { CustomPopover } from 'src/components/custom-popover';

import { useAuthContext } from 'src/auth/hooks';
import { signOut } from 'src/auth/context/jwt/action';

import { Iconify } from './icon';
import { gymPaths } from '../paths';

// ----------------------------------------------------------------------

export function AdminAccountMenu() {
  const router = useRouter();
  const popover = usePopover();
  const { user, checkUserSession } = useAuthContext();

  const logout = async () => {
    try {
      await signOut();
      await checkUserSession?.();
      popover.onClose();
      router.refresh();
    } catch {
      toast.error('Unable to sign out');
    }
  };

  return (
    <>
      <IconButton onClick={popover.onOpen} aria-label="Account menu" sx={{ p: 0.25 }}>
        <Avatar
          src={user?.avatarUrl ?? undefined}
          sx={{
            width: 36,
            height: 36,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 700,
          }}
        >
          {user?.name?.[0]?.toUpperCase()}
        </Avatar>
      </IconButton>
      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ paper: { sx: { width: 240 } } }}
      >
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {user?.name}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {user?.email}
          </Typography>
          <Typography variant="caption" sx={{ color: 'primary.main' }}>
            {user?.roleName}
          </Typography>
        </Box>
        <Divider sx={{ borderStyle: 'dashed' }} />
        <MenuList>
          <MenuItem
            onClick={() => {
              popover.onClose();
              router.push(gymPaths.account);
            }}
          >
            <Iconify icon="solar:user-rounded-bold" />
            My account
          </MenuItem>
          <MenuItem onClick={logout} sx={{ color: 'error.main' }}>
            <Iconify icon="solar:logout-2-bold" />
            Sign out
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}

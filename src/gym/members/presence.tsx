import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { fToNow } from 'src/utils/format-time';

import { Label } from 'src/components/label';

// ----------------------------------------------------------------------

export function lastSeenText(lastSeenAt: string | null) {
  if (!lastSeenAt) return 'Never seen';
  const secs = (Date.now() - new Date(lastSeenAt).getTime()) / 1000;
  if (secs < 60) return 'Last seen just now';
  return `Last seen ${fToNow(lastSeenAt)} ago`;
}

/** Green pulsing dot "Online" or grey "Offline" with last-seen time. */
export function PresenceBadge({
  online,
  lastSeenAt,
  compact,
}: {
  online: boolean;
  lastSeenAt: string | null;
  compact?: boolean;
}) {
  return (
    <Tooltip title={online ? 'Using the app right now' : lastSeenText(lastSeenAt)} arrow>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            flexShrink: 0,
            borderRadius: '50%',
            bgcolor: online ? 'success.main' : 'grey.500',
            ...(online && {
              boxShadow: (t) => `0 0 0 0 ${t.vars.palette.success.main}`,
              animation: 'presencePulse 2s infinite',
              '@keyframes presencePulse': {
                '0%': { boxShadow: '0 0 0 0 rgba(34,197,94,0.6)' },
                '70%': { boxShadow: '0 0 0 8px rgba(34,197,94,0)' },
                '100%': { boxShadow: '0 0 0 0 rgba(34,197,94,0)' },
              },
            }),
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            sx={{ color: online ? 'success.main' : 'text.secondary', lineHeight: 1.3 }}
          >
            {online ? 'Online' : 'Offline'}
          </Typography>
          {!online && !compact && (
            <Typography variant="caption" noWrap component="div" sx={{ color: 'text.disabled' }}>
              {lastSeenText(lastSeenAt).replace('Last seen ', '')}
            </Typography>
          )}
        </Box>
      </Stack>
    </Tooltip>
  );
}

export function SignedInLabel({ devices }: { devices: number }) {
  return devices > 0 ? (
    <Label variant="soft" color="info">
      {devices} device{devices === 1 ? '' : 's'}
    </Label>
  ) : (
    <Label variant="soft" color="default">
      Signed out
    </Label>
  );
}

/** Short, readable device name from a user-agent string. */
export function deviceName(ua: string | null) {
  if (!ua) return 'Unknown device';
  const os = /Android/i.test(ua)
    ? 'Android'
    : /iPhone|iPad|iOS/i.test(ua)
      ? 'iPhone / iPad'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS/i.test(ua)
          ? 'Mac'
          : /Linux/i.test(ua)
            ? 'Linux'
            : null;
  const app = /Expo|okhttp|CFNetwork|Dalvik/i.test(ua)
    ? 'FitFlow app'
    : /Edg\//i.test(ua)
      ? 'Edge'
      : /Chrome\//i.test(ua)
        ? 'Chrome'
        : /Safari\//i.test(ua)
          ? 'Safari'
          : /Firefox\//i.test(ua)
            ? 'Firefox'
            : null;
  return [app, os].filter(Boolean).join(' · ') || ua.slice(0, 40);
}

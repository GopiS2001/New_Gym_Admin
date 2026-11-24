import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from './icon';

// ----------------------------------------------------------------------

/**
 * Member-app preview frame. Mirrors the mobile design direction:
 * near-black foundation, warm off-white text, a single strong accent.
 */
export const APP_TOKENS = {
  bg: '#0E0F12',
  surface: '#17191E',
  surface2: '#20232A',
  text: '#F5F1EA',
  muted: '#9A9AA3',
  accent: '#D7FF3A',
  accentText: '#0E0F12',
};

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: 390,
        maxWidth: 1,
        height: 780,
        mx: 'auto',
        borderRadius: '44px',
        p: '12px',
        bgcolor: '#050506',
        boxShadow: '0 30px 60px -20px rgba(0,0,0,.45), inset 0 0 0 2px #2a2b30',
      }}
    >
      <Box
        sx={{
          width: 1,
          height: 1,
          borderRadius: '34px',
          overflow: 'hidden',
          bgcolor: APP_TOKENS.bg,
          color: APP_TOKENS.text,
          overflowY: 'auto',
          position: 'relative',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function AppChip({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <Box
      component="span"
      sx={{
        px: 1.25,
        py: 0.5,
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        bgcolor: accent ? APP_TOKENS.accent : APP_TOKENS.surface2,
        color: accent ? APP_TOKENS.accentText : APP_TOKENS.text,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}

export function AppHero({
  imageUrl,
  title,
  eyebrow,
  chips,
}: {
  imageUrl?: string | null;
  title: string;
  eyebrow?: string;
  chips?: React.ReactNode;
}) {
  return (
    <Box sx={{ position: 'relative', height: 340 }}>
      {imageUrl ? (
        <Box
          component="img"
          src={imageUrl}
          alt=""
          sx={{ width: 1, height: 1, objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            width: 1,
            height: 1,
            background: `linear-gradient(135deg, ${APP_TOKENS.surface2}, ${APP_TOKENS.bg})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Iconify
            icon="solar:dumbbell-large-minimalistic-bold"
            width={72}
            sx={{ color: APP_TOKENS.surface2, filter: 'brightness(1.8)' }}
          />
        </Box>
      )}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(180deg, rgba(14,15,18,0) 35%, ${APP_TOKENS.bg} 100%)`,
        }}
      />
      <Stack spacing={1} sx={{ position: 'absolute', left: 20, right: 20, bottom: 16 }}>
        {eyebrow && (
          <Typography
            sx={{
              color: APP_TOKENS.accent,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            }}
          >
            {eyebrow}
          </Typography>
        )}
        <Typography sx={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>{title}</Typography>
        {chips && (
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            {chips}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

export function AppTabs({ tabs }: { tabs: { label: string; content: React.ReactNode }[] }) {
  const [tab, setTab] = useState(0);
  return (
    <>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{
          mx: 2.5,
          minHeight: 40,
          borderRadius: 99,
          bgcolor: APP_TOKENS.surface,
          '& .MuiTabs-indicator': {
            height: 1,
            top: 4,
            bottom: 4,
            borderRadius: 99,
            bgcolor: APP_TOKENS.accent,
            zIndex: 0,
          },
          '& .MuiTab-root': {
            minHeight: 40,
            zIndex: 1,
            color: APP_TOKENS.muted,
            fontWeight: 600,
            mr: '0 !important',
          },
          '& .Mui-selected': { color: `${APP_TOKENS.accentText} !important` },
        }}
        slotProps={{ indicator: { style: { height: 32, top: 4 } } }}
      >
        {tabs.map((t) => (
          <Tab key={t.label} label={t.label} />
        ))}
      </Tabs>
      <Box sx={{ p: 2.5 }}>{tabs[tab]?.content}</Box>
    </>
  );
}

export function AppSectionTitle({ children }: { children: React.ReactNode }) {
  return <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1, mt: 2.5 }}>{children}</Typography>;
}

export function AppEmpty({ icon, text }: { icon: string; text: string }) {
  return (
    <Stack
      alignItems="center"
      spacing={1.5}
      sx={{ py: 5, color: APP_TOKENS.muted, textAlign: 'center' }}
    >
      <Iconify icon={icon} width={40} />
      <Typography sx={{ fontSize: 14 }}>{text}</Typography>
    </Stack>
  );
}

import type { Program } from '../api';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useApi } from '../api';
import { gymPaths } from '../paths';
import { P, Can } from '../permissions';
import { Iconify } from '../components/icon';
import { Page, humanize, KeyValue, ErrorState, StatusLabel } from '../components/common';
import {
  AppTabs,
  AppChip,
  AppHero,
  APP_TOKENS,
  PhoneFrame,
  AppSectionTitle,
} from '../components/phone-preview';

// ----------------------------------------------------------------------

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ProgramPreviewView() {
  const { id } = useParams();
  const { data: p, error, mutate } = useApi<Program>(id ? `/admin/programs/${id}` : null);
  const [week, setWeek] = useState(0);

  if (error) {
    return (
      <Page
        title="Program preview"
        crumbs={[{ name: 'Programs', href: gymPaths.programs.root }, { name: 'Preview' }]}
      >
        <ErrorState error={error} onRetry={() => mutate()} />
      </Page>
    );
  }

  const weeks = p?.weeks ?? [];
  const totalWorkouts = weeks.reduce((n, w) => n + w.workouts.length, 0);

  return (
    <Page
      title={p?.name ?? 'Program preview'}
      crumbs={[{ name: 'Programs', href: gymPaths.programs.root }, { name: 'Preview' }]}
      action={
        p && (
          <Can permission={P.CONTENT_MANAGE}>
            <Button
              component={RouterLink}
              href={gymPaths.programs.edit(p.id)}
              variant="contained"
              startIcon={<Iconify icon="solar:pen-bold" />}
            >
              Edit
            </Button>
          </Can>
        )
      }
    >
      <Grid container spacing={4}>
        <Grid size={{ xs: 12, md: 5 }}>
          {!p ? (
            <Skeleton
              variant="rounded"
              height={780}
              sx={{ borderRadius: '44px', maxWidth: 390, mx: 'auto' }}
            />
          ) : (
            <PhoneFrame>
              <AppHero
                imageUrl={p.imageUrl}
                title={p.name}
                eyebrow={p.goal?.name}
                chips={
                  <>
                    <AppChip accent>{humanize(p.difficulty)}</AppChip>
                    <AppChip>{p.durationWeeks} weeks</AppChip>
                    <AppChip>{p.daysPerWeek}× / week</AppChip>
                  </>
                }
              />
              <AppTabs
                tabs={[
                  {
                    label: 'Overview',
                    content: (
                      <Box>
                        <Typography sx={{ fontSize: 14, color: APP_TOKENS.muted, lineHeight: 1.6 }}>
                          {p.description || p.shortDescription}
                        </Typography>
                        {p.targetAudience && (
                          <>
                            <AppSectionTitle>Who it&apos;s for</AppSectionTitle>
                            <Typography sx={{ fontSize: 14, color: APP_TOKENS.muted }}>
                              {p.targetAudience}
                            </Typography>
                          </>
                        )}
                        <AppSectionTitle>Equipment</AppSectionTitle>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {p.equipment.map((e) => (
                            <AppChip key={e.id}>{e.name}</AppChip>
                          ))}
                        </Stack>
                        {p.coach && (
                          <>
                            <AppSectionTitle>Coach</AppSectionTitle>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  bgcolor: APP_TOKENS.surface2,
                                  backgroundImage: p.coach.imageUrl
                                    ? `url(${p.coach.imageUrl})`
                                    : undefined,
                                  backgroundSize: 'cover',
                                }}
                              />
                              <Typography sx={{ fontWeight: 700 }}>{p.coach.name}</Typography>
                            </Stack>
                          </>
                        )}
                      </Box>
                    ),
                  },
                  {
                    label: 'Schedule',
                    content: (
                      <Box>
                        <Stack direction="row" spacing={0.75} sx={{ overflowX: 'auto', pb: 1.5 }}>
                          {weeks.map((w, i) => (
                            <Box
                              key={w.id ?? i}
                              onClick={() => setWeek(i)}
                              sx={{
                                cursor: 'pointer',
                                px: 1.5,
                                py: 0.75,
                                borderRadius: 99,
                                fontSize: 13,
                                fontWeight: 700,
                                whiteSpace: 'nowrap',
                                bgcolor: i === week ? APP_TOKENS.accent : APP_TOKENS.surface,
                                color: i === week ? APP_TOKENS.accentText : APP_TOKENS.text,
                              }}
                            >
                              Week {w.weekNumber}
                            </Box>
                          ))}
                        </Stack>
                        <Stack spacing={1.25}>
                          {weeks[week]?.workouts.map((wo, i) => (
                            <Box
                              key={wo.id ?? i}
                              sx={{ p: 1.75, borderRadius: 2.5, bgcolor: APP_TOKENS.surface }}
                            >
                              <Typography
                                sx={{ fontSize: 12, color: APP_TOKENS.accent, fontWeight: 700 }}
                              >
                                {DAYS[wo.dayNumber - 1]}
                              </Typography>
                              <Typography sx={{ fontWeight: 700 }}>{wo.title}</Typography>
                              <Typography sx={{ fontSize: 13, color: APP_TOKENS.muted }}>
                                {wo.exercises.length} exercises
                                {wo.estimatedMinutes ? ` · ~${wo.estimatedMinutes} min` : ''}
                              </Typography>
                            </Box>
                          ))}
                        </Stack>
                      </Box>
                    ),
                  },
                  {
                    label: 'Exercises',
                    content: (
                      <Stack spacing={2}>
                        {weeks[week]?.workouts.map((wo, i) => (
                          <Box key={wo.id ?? i}>
                            <Typography sx={{ fontWeight: 700, mb: 1 }}>{wo.title}</Typography>
                            {wo.exercises.map((e, j) => (
                              <Stack
                                key={e.id ?? j}
                                direction="row"
                                spacing={1.5}
                                alignItems="center"
                                sx={{ py: 0.75 }}
                              >
                                <Box
                                  sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 1.5,
                                    flexShrink: 0,
                                    bgcolor: APP_TOKENS.surface2,
                                    backgroundImage: e.exercise?.imageUrl
                                      ? `url(${e.exercise.imageUrl})`
                                      : undefined,
                                    backgroundSize: 'cover',
                                  }}
                                />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography noWrap sx={{ fontSize: 14, fontWeight: 600 }}>
                                    {e.exercise?.name}
                                  </Typography>
                                  <Typography sx={{ fontSize: 12, color: APP_TOKENS.muted }}>
                                    {[
                                      e.sets && `${e.sets} sets`,
                                      e.reps && `${e.reps} reps`,
                                      e.durationSeconds && `${e.durationSeconds}s`,
                                      e.restSeconds && `rest ${e.restSeconds}s`,
                                    ]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </Typography>
                                </Box>
                              </Stack>
                            ))}
                          </Box>
                        ))}
                      </Stack>
                    ),
                  },
                ]}
              />
              <Box
                sx={{
                  position: 'sticky',
                  bottom: 0,
                  p: 2,
                  background: `linear-gradient(180deg, transparent, ${APP_TOKENS.bg} 30%)`,
                }}
              >
                <Box
                  sx={{
                    py: 1.5,
                    textAlign: 'center',
                    borderRadius: 99,
                    bgcolor: APP_TOKENS.accent,
                    color: APP_TOKENS.accentText,
                    fontWeight: 800,
                  }}
                >
                  Start program
                </Box>
              </Box>
            </PhoneFrame>
          )}
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          {p && (
            <Stack spacing={3}>
              {p.status !== 'PUBLISHED' && (
                <Alert severity="warning">
                  This program is {p.status.toLowerCase()} — members cannot see it yet.
                </Alert>
              )}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Program data
                </Typography>
                <KeyValue label="Status">
                  <StatusLabel status={p.status} />
                </KeyValue>
                <KeyValue label="Goal">{p.goal?.name ?? '—'}</KeyValue>
                <KeyValue label="Coach">{p.coach?.name ?? '—'}</KeyValue>
                <KeyValue label="Weeks scheduled">
                  {weeks.length} of {p.durationWeeks}
                </KeyValue>
                <KeyValue label="Total workouts">{totalWorkouts}</KeyValue>
                <KeyValue label="Followers / saves">
                  {p.enrollmentCount} / {p.saveCount}
                </KeyValue>
              </Card>
            </Stack>
          )}
        </Grid>
      </Grid>
    </Page>
  );
}

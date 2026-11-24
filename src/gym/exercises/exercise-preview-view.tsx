import type { ExerciseDetail } from '../api';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { useParams } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { Label } from 'src/components/label';

import { useApi } from '../api';
import { gymPaths } from '../paths';
import { P, Can } from '../permissions';
import { Iconify } from '../components/icon';
import { Page, fDate, humanize, KeyValue, ErrorState, StatusLabel } from '../components/common';
import {
  AppTabs,
  AppChip,
  AppHero,
  AppEmpty,
  APP_TOKENS,
  PhoneFrame,
  AppSectionTitle,
} from '../components/phone-preview';

// ----------------------------------------------------------------------

export function ExercisePreviewView() {
  const { id } = useParams();
  const { data: ex, error, mutate } = useApi<ExerciseDetail>(id ? `/admin/exercises/${id}` : null);
  const { data: programs } = useApi<{ id: number; name: string }[]>(
    id ? `/exercises/${id}/programs` : null
  );

  if (error) {
    return (
      <Page
        title="Exercise preview"
        crumbs={[{ name: 'Exercises', href: gymPaths.exercises.root }, { name: 'Preview' }]}
      >
        <ErrorState error={error} onRetry={() => mutate()} />
      </Page>
    );
  }

  return (
    <Page
      title={ex?.name ?? 'Exercise preview'}
      crumbs={[{ name: 'Exercises', href: gymPaths.exercises.root }, { name: 'Preview' }]}
      action={
        ex && (
          <Can permission={P.CONTENT_MANAGE}>
            <Button
              component={RouterLink}
              href={gymPaths.exercises.edit(ex.id)}
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
          {!ex ? (
            <Skeleton
              variant="rounded"
              height={780}
              sx={{ borderRadius: '44px', maxWidth: 390, mx: 'auto' }}
            />
          ) : (
            <PhoneFrame>
              <AppHero
                imageUrl={ex.imageUrl}
                title={ex.name}
                eyebrow={ex.categories.map((c) => c.name).join(' · ')}
                chips={
                  <>
                    <AppChip accent>{humanize(ex.difficulty)}</AppChip>
                    <AppChip>{ex.exerciseType.name}</AppChip>
                    {ex.equipment.slice(0, 2).map((e) => (
                      <AppChip key={e.id}>{e.name}</AppChip>
                    ))}
                  </>
                }
              />
              <AppTabs
                tabs={[
                  {
                    label: 'About',
                    content: (
                      <Box>
                        {ex.description && (
                          <Typography
                            sx={{ fontSize: 14, color: APP_TOKENS.muted, lineHeight: 1.6 }}
                          >
                            {ex.description}
                          </Typography>
                        )}
                        <AppSectionTitle>Muscles worked</AppSectionTitle>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                          {ex.primaryMuscles.map((m) => (
                            <AppChip key={m.id} accent>
                              {m.name}
                            </AppChip>
                          ))}
                          {ex.secondaryMuscles.map((m) => (
                            <AppChip key={m.id}>{m.name}</AppChip>
                          ))}
                        </Stack>
                        <AppSectionTitle>How to do it</AppSectionTitle>
                        <Stack spacing={1.5}>
                          {ex.instructions.map((s, i) => (
                            <Stack key={i} direction="row" spacing={1.5}>
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  flexShrink: 0,
                                  borderRadius: '50%',
                                  bgcolor: APP_TOKENS.accent,
                                  color: APP_TOKENS.accentText,
                                  fontSize: 12,
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {i + 1}
                              </Box>
                              <Typography sx={{ fontSize: 14, lineHeight: 1.5 }}>{s}</Typography>
                            </Stack>
                          ))}
                        </Stack>
                        {!!ex.tips.length && (
                          <>
                            <AppSectionTitle>Tips</AppSectionTitle>
                            {ex.tips.map((t, i) => (
                              <Typography
                                key={i}
                                sx={{ fontSize: 14, color: APP_TOKENS.muted, mb: 0.75 }}
                              >
                                • {t}
                              </Typography>
                            ))}
                          </>
                        )}
                        {!!ex.commonMistakes.length && (
                          <>
                            <AppSectionTitle>Common mistakes</AppSectionTitle>
                            {ex.commonMistakes.map((t, i) => (
                              <Typography
                                key={i}
                                sx={{ fontSize: 14, color: APP_TOKENS.muted, mb: 0.75 }}
                              >
                                • {t}
                              </Typography>
                            ))}
                          </>
                        )}
                        {ex.safetyNotes && (
                          <Box
                            sx={{
                              mt: 2.5,
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: APP_TOKENS.surface,
                              fontSize: 13,
                              color: APP_TOKENS.muted,
                            }}
                          >
                            {ex.safetyNotes}
                          </Box>
                        )}
                        {!!ex.alternatives.length && (
                          <>
                            <AppSectionTitle>Alternatives</AppSectionTitle>
                            <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 1 }}>
                              {ex.alternatives.map((a) => (
                                <Box
                                  key={a.id}
                                  sx={{
                                    width: 140,
                                    flexShrink: 0,
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    bgcolor: APP_TOKENS.surface,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      height: 90,
                                      bgcolor: APP_TOKENS.surface2,
                                      backgroundImage: a.imageUrl
                                        ? `url(${a.imageUrl})`
                                        : undefined,
                                      backgroundSize: 'cover',
                                    }}
                                  />
                                  <Typography sx={{ fontSize: 13, fontWeight: 600, p: 1 }}>
                                    {a.name}
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          </>
                        )}
                      </Box>
                    ),
                  },
                  {
                    label: 'History',
                    content: (
                      <AppEmpty
                        icon="solar:chart-square-outline"
                        text="Log this exercise to see your progress."
                      />
                    ),
                  },
                  {
                    label: 'Programs',
                    content: programs?.length ? (
                      <Stack spacing={1}>
                        {programs.map((p) => (
                          <Box
                            key={p.id}
                            sx={{
                              p: 1.5,
                              borderRadius: 2,
                              bgcolor: APP_TOKENS.surface,
                              fontWeight: 600,
                              fontSize: 14,
                            }}
                          >
                            {p.name}
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <AppEmpty
                        icon="solar:notebook-bold-duotone"
                        text="Not part of a published program yet."
                      />
                    ),
                  },
                ]}
              />
              <Box
                sx={{
                  position: 'sticky',
                  bottom: 0,
                  p: 2,
                  display: 'flex',
                  gap: 1,
                  background: `linear-gradient(180deg, transparent, ${APP_TOKENS.bg} 30%)`,
                }}
              >
                <Box
                  sx={{
                    flex: 1,
                    py: 1.5,
                    textAlign: 'center',
                    borderRadius: 99,
                    bgcolor: APP_TOKENS.accent,
                    color: APP_TOKENS.accentText,
                    fontWeight: 800,
                  }}
                >
                  Add to workout
                </Box>
                <Box
                  sx={{
                    width: 52,
                    borderRadius: 99,
                    bgcolor: APP_TOKENS.surface2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Iconify icon="solar:bookmark-bold" />
                </Box>
              </Box>
            </PhoneFrame>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          {ex && (
            <Stack spacing={3}>
              {ex.status !== 'PUBLISHED' && (
                <Alert severity="warning">
                  This exercise is {ex.status.toLowerCase()} — members cannot discover it until it
                  is published.
                </Alert>
              )}
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Catalogue data
                </Typography>
                <KeyValue label="Status">
                  <StatusLabel status={ex.status} />
                </KeyValue>
                <KeyValue label="Slug">{ex.slug}</KeyValue>
                <KeyValue label="Type / logging">
                  {ex.exerciseType.name} —{' '}
                  {ex.exerciseType.loggingFields.map((f) => (
                    <Label key={f} variant="soft" sx={{ mr: 0.5 }}>
                      {f}
                    </Label>
                  ))}
                </KeyValue>
                <KeyValue label="Focus areas">
                  {ex.focusAreas.map((f) => f.name).join(', ') || '—'}
                </KeyValue>
                <KeyValue label="Equipment">
                  {ex.equipment.map((f) => f.name).join(', ') || '—'}
                </KeyValue>
                <KeyValue label="Training goals">
                  {ex.goals.map((f) => f.name).join(', ') || '—'}
                </KeyValue>
                <Divider sx={{ my: 1.5, borderStyle: 'dashed' }} />
                <KeyValue label="Views / saves">
                  {ex.viewCount} / {ex.saveCount}
                </KeyValue>
                <KeyValue label="Used in">
                  {ex.usage.programs} program workouts · {ex.usage.sessions} logged sessions
                </KeyValue>
                <KeyValue label="Published">{fDate(ex.publishedAt, true)}</KeyValue>
                <KeyValue label="Created by">{ex.createdBy?.name ?? '—'}</KeyValue>
                <KeyValue label="Last updated">
                  {fDate(ex.updatedAt, true)} {ex.updatedBy ? `by ${ex.updatedBy.name}` : ''}
                </KeyValue>
              </Card>
            </Stack>
          )}
        </Grid>
      </Grid>
    </Page>
  );
}

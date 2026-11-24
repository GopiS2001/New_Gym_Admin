import type { Program } from '../api';

import * as z from 'zod';
import { useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, useFieldArray, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Accordion from '@mui/material/Accordion';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { RouterLink } from 'src/routes/components';
import { useParams, useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { gymPaths } from '../paths';
import { Iconify } from '../components/icon';
import { MediaField } from '../components/media';
import { api, useApi, invalidate, useOptions, DIFFICULTIES } from '../api';
import { RefMultiField, ExercisePicker, RefSelectField } from '../components/fields';
import {
  Page,
  Section,
  onInvalid,
  ErrorState,
  StatusLabel,
  handleFormError,
} from '../components/common';

// ----------------------------------------------------------------------

const intOrNull = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? null : Number(v)),
  z.number().int().min(0).nullable()
);

const ExerciseRow = z.object({
  id: z.number().optional(),
  exerciseId: z
    .number({ error: 'Choose an exercise' })
    .nullable()
    .refine((v) => !!v, { error: 'Choose an exercise' }),
  exercise: z.any().optional(),
  sets: intOrNull,
  reps: z.string().nullable().optional(),
  durationSeconds: intOrNull,
  restSeconds: intOrNull,
  notes: z.string().nullable().optional(),
});

const Workout = z.object({
  id: z.number().optional(),
  dayNumber: z.coerce.number().int().min(1).max(7),
  title: z.string().trim().min(1, { error: 'Workout title is required' }),
  description: z.string().nullable().optional(),
  estimatedMinutes: intOrNull,
  exercises: z.array(ExerciseRow),
});

const Week = z.object({
  id: z.number().optional(),
  weekNumber: z.number().int(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  workouts: z.array(Workout),
});

const Schema = z
  .object({
    name: z.string().trim().min(2, { error: 'Name is required' }),
    slug: z.string().optional(),
    shortDescription: z.string().max(255).nullable().optional(),
    description: z.string().nullable().optional(),
    imageUrl: z.string().nullable().optional(),
    goalId: z.number().nullable().optional(),
    coachId: z.number().nullable().optional(),
    difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
    durationWeeks: z.coerce.number().int().min(1).max(104),
    daysPerWeek: z.coerce.number().int().min(1).max(7),
    targetAudience: z.string().nullable().optional(),
    minExperienceRank: intOrNull,
    maxExperienceRank: intOrNull,
    equipmentIds: z.array(z.number()),
    weeks: z.array(Week),
  })
  .refine((v) => v.weeks.length <= v.durationWeeks, {
    path: ['durationWeeks'],
    error: 'Duration is shorter than the number of weeks scheduled',
  });

type FormValues = z.infer<typeof Schema>;
type WeekValues = FormValues['weeks'][number];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const emptyWorkout = (dayNumber = 1): WeekValues['workouts'][number] => ({
  dayNumber,
  title: `Day ${dayNumber}`,
  description: '',
  estimatedMinutes: 45,
  exercises: [],
});

// ----------------------------------------------------------------------

export function ProgramEditView() {
  const { id } = useParams();
  const { data, error, mutate } = useApi<Program>(id ? `/admin/programs/${id}` : null, {
    keepPreviousData: false,
  });
  if (error) {
    return (
      <Page
        title="Edit program"
        crumbs={[{ name: 'Programs', href: gymPaths.programs.root }, { name: 'Edit' }]}
      >
        <ErrorState error={error} onRetry={() => mutate()} />
      </Page>
    );
  }
  if (!data) {
    return (
      <Page
        title="Edit program"
        crumbs={[{ name: 'Programs', href: gymPaths.programs.root }, { name: 'Edit' }]}
      >
        <Skeleton variant="rounded" height={480} />
      </Page>
    );
  }
  return <ProgramForm current={data} />;
}

export function ProgramCreateView() {
  return <ProgramForm />;
}

// ----------------------------------------------------------------------

function ProgramForm({ current }: { current?: Program }) {
  const router = useRouter();
  const { options: levels } = useOptions<{ id: number; name: string; rank: number }>(
    '/admin/experience-levels'
  );

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: current?.name ?? '',
      slug: current?.slug ?? '',
      shortDescription: current?.shortDescription ?? '',
      description: current?.description ?? '',
      imageUrl: current?.imageUrl ?? null,
      goalId: current?.goalId ?? null,
      coachId: current?.coachId ?? null,
      difficulty: current?.difficulty ?? 'BEGINNER',
      durationWeeks: current?.durationWeeks ?? 4,
      daysPerWeek: current?.daysPerWeek ?? 3,
      targetAudience: current?.targetAudience ?? '',
      minExperienceRank: (current?.minExperienceRank ?? '') as any,
      maxExperienceRank: (current?.maxExperienceRank ?? '') as any,
      equipmentIds: current?.equipment.map((e) => e.id) ?? [],
      weeks: current?.weeks?.map((w) => ({
        id: w.id,
        weekNumber: w.weekNumber,
        title: w.title ?? '',
        notes: w.notes ?? '',
        workouts: w.workouts.map((wo) => ({
          id: wo.id,
          dayNumber: wo.dayNumber,
          title: wo.title,
          description: wo.description ?? '',
          estimatedMinutes: wo.estimatedMinutes,
          exercises: wo.exercises.map((e) => ({
            id: e.id,
            exerciseId: e.exerciseId,
            exercise: e.exercise,
            sets: e.sets,
            reps: e.reps ?? '',
            durationSeconds: e.durationSeconds,
            restSeconds: e.restSeconds,
            notes: e.notes ?? '',
          })),
        })),
      })) ?? [{ weekNumber: 1, title: 'Week 1', notes: '', workouts: [emptyWorkout(1)] }],
    }),
    [current]
  );

  const methods = useForm<FormValues>({ resolver: zodResolver(Schema) as any, defaultValues });
  const weeks = useFieldArray({ control: methods.control, name: 'weeks', keyName: 'key' });
  const [expanded, setExpanded] = useState<number | false>(0);

  const save = (status?: 'DRAFT' | 'PUBLISHED') =>
    methods.handleSubmit(async (values) => {
      const body = {
        ...values,
        slug: values.slug || undefined,
        weeks: values.weeks.map((w, i) => ({
          ...w,
          weekNumber: i + 1,
          workouts: w.workouts.map((wo) => ({
            ...wo,
            exercises: wo.exercises.map(({ exercise: _e, ...ex }) => ({
              ...ex,
              reps: ex.reps || null,
              notes: ex.notes || null,
            })),
          })),
        })),
        ...(status ? { status } : current ? {} : { status: 'DRAFT' }),
      };
      try {
        const saved = current
          ? await api.patch<Program>(`/admin/programs/${current.id}`, body)
          : await api.post<Program>('/admin/programs', body);
        toast.success(status === 'PUBLISHED' ? 'Published' : 'Saved');
        invalidate('/admin/programs');
        if (current) {
          invalidate(`/admin/programs/${current.id}`);
        } else {
          router.replace(gymPaths.programs.edit(saved.id));
        }
      } catch (e) {
        handleFormError(e, methods);
      }
    }, onInvalid);

  const addWeek = (copyFrom?: WeekValues) => {
    const n = weeks.fields.length + 1;
    weeks.append(
      copyFrom
        ? {
            weekNumber: n,
            title: `Week ${n}`,
            notes: copyFrom.notes,
            workouts: copyFrom.workouts.map((wo) => ({
              ...wo,
              id: undefined,
              exercises: wo.exercises.map((e) => ({ ...e, id: undefined })),
            })),
          }
        : { weekNumber: n, title: `Week ${n}`, notes: '', workouts: [emptyWorkout(1)] }
    );
    setExpanded(weeks.fields.length);
  };

  const isPublished = current?.status === 'PUBLISHED';
  const { errors } = methods.formState;

  return (
    <Page
      title={current ? current.name : 'New program'}
      crumbs={[
        { name: 'Programs', href: gymPaths.programs.root },
        { name: current ? 'Edit' : 'New' },
      ]}
      action={
        current && (
          <Button
            component={RouterLink}
            href={gymPaths.programs.preview(current.id)}
            variant="outlined"
            color="inherit"
            startIcon={<Iconify icon="solar:eye-bold" />}
          >
            Preview
          </Button>
        )
      }
    >
      <Form methods={methods} onSubmit={save()}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              <Section title="Overview">
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2.5,
                    gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
                  }}
                >
                  <Field.Text name="name" label="Program name" required />
                  <Field.Text name="slug" label="Slug" helperText="Auto-generated if empty" />
                </Box>
                <Field.Text name="shortDescription" label="Short description" />
                <Field.Text name="description" label="Description" multiline minRows={4} />
                <Field.Text
                  name="targetAudience"
                  label="Intended audience"
                  placeholder="e.g. New lifters returning to the gym"
                />
              </Section>

              <Card>
                <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">Schedule</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      Program → week → workout day → ordered exercises
                    </Typography>
                  </Box>
                  <Button
                    variant="soft"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={() => addWeek()}
                  >
                    Add week
                  </Button>
                </Box>
                {errors.weeks?.message && (
                  <Alert severity="error" sx={{ mx: 3, mb: 2 }}>
                    {errors.weeks.message}
                  </Alert>
                )}
                <Box sx={{ px: 2, pb: 2 }}>
                  {weeks.fields.map((w, wi) => (
                    <Accordion
                      key={w.key}
                      expanded={expanded === wi}
                      onChange={(_, open) => setExpanded(open ? wi : false)}
                      disableGutters
                    >
                      <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
                        <WeekSummary index={wi} />
                      </AccordionSummary>
                      <AccordionDetails>
                        <WeekEditor index={wi} />
                        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
                          <Button
                            size="small"
                            startIcon={<Iconify icon="solar:copy-bold" />}
                            onClick={() => addWeek(methods.getValues(`weeks.${wi}`))}
                          >
                            Duplicate week
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                            onClick={() => weeks.remove(wi)}
                            disabled={weeks.fields.length === 1}
                          >
                            Remove week
                          </Button>
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              </Card>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3} sx={{ position: { md: 'sticky' }, top: { md: 88 } }}>
              <Card sx={{ p: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">Visibility</Typography>
                    <StatusLabel status={current?.status ?? 'DRAFT'} />
                  </Stack>
                  {current && current.enrollmentCount > 0 && (
                    <Alert severity="info">
                      {current.enrollmentCount} member(s) follow this program. Removing workouts
                      keeps their logged history.
                    </Alert>
                  )}
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="inherit"
                      onClick={save(isPublished ? undefined : 'DRAFT')}
                      loading={methods.formState.isSubmitting}
                    >
                      {isPublished ? 'Save' : 'Save draft'}
                    </Button>
                    {!isPublished && (
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={save('PUBLISHED')}
                        loading={methods.formState.isSubmitting}
                      >
                        Publish
                      </Button>
                    )}
                  </Stack>
                  {isPublished && (
                    <Button color="warning" onClick={save('DRAFT')}>
                      Unpublish
                    </Button>
                  )}
                </Stack>
              </Card>

              <Section title="Cover">
                <MediaField name="imageUrl" label="Cover image" folder="programs" />
              </Section>

              <Section title="Settings">
                <RefSelectField name="goalId" label="Goal" path="/admin/goals" />
                <RefSelectField name="coachId" label="Coach" path="/admin/coaches" />
                <Field.Select name="difficulty" label="Difficulty">
                  {DIFFICULTIES.map((d) => (
                    <MenuItem key={d.value} value={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </Field.Select>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                  <Field.Text name="durationWeeks" label="Duration (weeks)" type="number" />
                  <Field.Text name="daysPerWeek" label="Days per week" type="number" />
                </Box>
                {levels.length > 0 && (
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
                    <Field.Select name="minExperienceRank" label="Min experience">
                      <MenuItem value="">Any</MenuItem>
                      {levels.map((l) => (
                        <MenuItem key={l.id} value={l.rank}>
                          {l.name}
                        </MenuItem>
                      ))}
                    </Field.Select>
                    <Field.Select name="maxExperienceRank" label="Max experience">
                      <MenuItem value="">Any</MenuItem>
                      {levels.map((l) => (
                        <MenuItem key={l.id} value={l.rank}>
                          {l.name}
                        </MenuItem>
                      ))}
                    </Field.Select>
                  </Box>
                )}
                <RefMultiField
                  name="equipmentIds"
                  label="Required equipment"
                  path="/admin/equipment"
                />
              </Section>
            </Stack>
          </Grid>
        </Grid>
      </Form>
    </Page>
  );
}

// ----------------------------------------------------------------------

function WeekSummary({ index }: { index: number }) {
  const week = useWatch({ name: `weeks.${index}` }) as WeekValues | undefined;
  const { formState } = useFormContext<FormValues>();
  const hasError = !!formState.errors.weeks?.[index];
  const exerciseCount = week?.workouts.reduce((n, w) => n + w.exercises.length, 0) ?? 0;
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: 1, pr: 1 }}>
      <Typography variant="subtitle1" sx={{ color: hasError ? 'error.main' : undefined }}>
        Week {index + 1}
        {week?.title && week.title !== `Week ${index + 1}` ? ` — ${week.title}` : ''}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {week?.workouts.length ?? 0} workouts · {exerciseCount} exercises
      </Typography>
      {hasError && <Iconify icon="solar:danger-triangle-bold" sx={{ color: 'error.main' }} />}
    </Stack>
  );
}

function WeekEditor({ index }: { index: number }) {
  const { control } = useFormContext<FormValues>();
  const workouts = useFieldArray({ control, name: `weeks.${index}.workouts`, keyName: 'key' });
  const daysUsed =
    (useWatch({ name: `weeks.${index}.workouts` }) as WeekValues['workouts'] | undefined)?.map(
      (w) => Number(w.dayNumber)
    ) ?? [];

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 2fr' } }}>
        <Field.Text size="small" name={`weeks.${index}.title`} label="Week title" />
        <Field.Text size="small" name={`weeks.${index}.notes`} label="Week notes" />
      </Box>
      {workouts.fields.map((wo, woi) => (
        <WorkoutEditor
          key={wo.key}
          weekIndex={index}
          index={woi}
          onRemove={() => workouts.remove(woi)}
        />
      ))}
      <Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<Iconify icon="mingcute:add-line" />}
          onClick={() => {
            const free = [1, 2, 3, 4, 5, 6, 7].find((d) => !daysUsed.includes(d)) ?? 1;
            workouts.append(emptyWorkout(free));
          }}
        >
          Add workout day
        </Button>
      </Box>
    </Stack>
  );
}

function WorkoutEditor({
  weekIndex,
  index,
  onRemove,
}: {
  weekIndex: number;
  index: number;
  onRemove: () => void;
}) {
  const { control, setValue, formState } = useFormContext<FormValues>();
  const base = `weeks.${weekIndex}.workouts.${index}` as const;
  const exercises = useFieldArray({ control, name: `${base}.exercises`, keyName: 'key' });
  const rows =
    (useWatch({ name: `${base}.exercises` }) as
      | WeekValues['workouts'][number]['exercises']
      | undefined) ?? [];
  const errs = formState.errors.weeks?.[weekIndex]?.workouts?.[index]?.exercises;

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '110px 1fr 130px auto' },
          alignItems: 'start',
        }}
      >
        <Field.Select size="small" name={`${base}.dayNumber`} label="Day">
          {DAYS.map((d, i) => (
            <MenuItem key={d} value={i + 1}>
              {d} (day {i + 1})
            </MenuItem>
          ))}
        </Field.Select>
        <Field.Text size="small" name={`${base}.title`} label="Workout title" />
        <Field.Text
          size="small"
          name={`${base}.estimatedMinutes`}
          label="Est. minutes"
          type="number"
        />
        <Tooltip title="Remove workout">
          <IconButton color="error" onClick={onRemove}>
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        </Tooltip>
      </Box>

      <Stack spacing={1.5} sx={{ mt: 2 }}>
        {exercises.fields.map((ex, ei) => {
          const row = rows[ei];
          return (
            <Box
              key={ex.key}
              sx={{
                display: 'grid',
                gap: 1,
                alignItems: 'start',
                gridTemplateColumns: {
                  xs: '1fr 1fr',
                  md: '28px minmax(200px, 3fr) 70px 90px 90px 90px auto',
                },
                p: 1,
                borderRadius: 1,
                bgcolor: 'background.neutral',
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ pt: 1, display: { xs: 'none', md: 'block' }, textAlign: 'center' }}
              >
                {ei + 1}
              </Typography>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
                <ExercisePicker
                  size="small"
                  value={
                    row?.exercise ??
                    (row?.exerciseId
                      ? { id: row.exerciseId, name: `#${row.exerciseId}`, imageUrl: null }
                      : null)
                  }
                  error={(errs?.[ei]?.exerciseId?.message as string) ?? undefined}
                  onChange={(o) => {
                    setValue(`${base}.exercises.${ei}.exerciseId`, o?.id ?? (null as any), {
                      shouldValidate: true,
                    });
                    setValue(`${base}.exercises.${ei}.exercise`, o);
                  }}
                />
              </Box>
              <Field.Text
                size="small"
                name={`${base}.exercises.${ei}.sets`}
                label="Sets"
                type="number"
              />
              <Field.Text
                size="small"
                name={`${base}.exercises.${ei}.reps`}
                label="Reps"
                placeholder="8-12"
              />
              <Field.Text
                size="small"
                name={`${base}.exercises.${ei}.durationSeconds`}
                label="Time (s)"
                type="number"
              />
              <Field.Text
                size="small"
                name={`${base}.exercises.${ei}.restSeconds`}
                label="Rest (s)"
                type="number"
              />
              <Stack
                direction="row"
                sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, justifyContent: 'flex-end' }}
              >
                <IconButton
                  size="small"
                  disabled={ei === 0}
                  onClick={() => exercises.move(ei, ei - 1)}
                >
                  <Iconify icon="eva:arrow-ios-upward-fill" />
                </IconButton>
                <IconButton
                  size="small"
                  disabled={ei === exercises.fields.length - 1}
                  onClick={() => exercises.move(ei, ei + 1)}
                >
                  <Iconify icon="eva:arrow-ios-downward-fill" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => exercises.remove(ei)}>
                  <Iconify icon="mingcute:close-line" />
                </IconButton>
              </Stack>
              {row?.exercise?.status && row.exercise.status !== 'PUBLISHED' && (
                <Typography variant="caption" sx={{ color: 'warning.main', gridColumn: '1 / -1' }}>
                  This exercise is {String(row.exercise.status).toLowerCase()} — publish it before
                  publishing the program.
                </Typography>
              )}
            </Box>
          );
        })}
        <Box>
          <Button
            size="small"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() =>
              exercises.append({
                exerciseId: null as any,
                sets: 3,
                reps: '10',
                durationSeconds: null,
                restSeconds: 90,
                notes: '',
              })
            }
          >
            Add exercise
          </Button>
        </Box>
      </Stack>
    </Card>
  );
}

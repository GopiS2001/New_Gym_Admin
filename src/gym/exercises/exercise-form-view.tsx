import type { ExerciseDetail } from '../api';

import * as z from 'zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';
import { useParams, useRouter } from 'src/routes/hooks';

import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { gymPaths } from '../paths';
import { Iconify } from '../components/icon';
import { MediaField } from '../components/media';
import { api, useApi, invalidate, DIFFICULTIES } from '../api';
import {
  RefMultiField,
  RefSelectField,
  StringListField,
  ExerciseMultiField,
} from '../components/fields';
import {
  Page,
  fDate,
  Section,
  onInvalid,
  ErrorState,
  StatusLabel,
  handleFormError,
} from '../components/common';

// ----------------------------------------------------------------------

const Schema = z.object({
  name: z.string().trim().min(2, { error: 'Name is required' }),
  slug: z.string().optional(),
  shortDescription: z
    .string()
    .max(255, { error: 'Keep it under 255 characters' })
    .optional()
    .nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  exerciseTypeId: z
    .number({ error: 'Choose an exercise type' })
    .nullable()
    .refine((v) => !!v, { error: 'Choose an exercise type' }),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  instructions: z.array(z.string()),
  tips: z.array(z.string()),
  commonMistakes: z.array(z.string()),
  safetyNotes: z.string().optional().nullable(),
  categoryIds: z.array(z.number()),
  focusAreaIds: z.array(z.number()),
  primaryMuscleIds: z.array(z.number()),
  secondaryMuscleIds: z.array(z.number()),
  equipmentIds: z.array(z.number()),
  goalIds: z.array(z.number()),
  alternativeIds: z.array(z.number()),
});
type FormValues = z.infer<typeof Schema>;

const DEFAULT_SAFETY =
  'Warm up before training. Stop immediately if you feel pain, dizziness or discomfort. This is not medical advice.';

// ----------------------------------------------------------------------

export function ExerciseEditView() {
  const { id } = useParams();
  const { data, error, isLoading, mutate } = useApi<ExerciseDetail>(
    id ? `/admin/exercises/${id}` : null,
    { keepPreviousData: false }
  );

  if (error) {
    return (
      <Page
        title="Edit exercise"
        crumbs={[{ name: 'Exercises', href: gymPaths.exercises.root }, { name: 'Edit' }]}
      >
        <ErrorState error={error} onRetry={() => mutate()} />
      </Page>
    );
  }
  if (isLoading || !data) return <FormSkeleton />;
  return <ExerciseForm current={data} />;
}

export function ExerciseCreateView() {
  return <ExerciseForm />;
}

function FormSkeleton() {
  return (
    <Page
      title="Edit exercise"
      crumbs={[{ name: 'Exercises', href: gymPaths.exercises.root }, { name: 'Edit' }]}
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Skeleton variant="rounded" height={420} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Skeleton variant="rounded" height={240} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" height={320} />
        </Grid>
      </Grid>
    </Page>
  );
}

// ----------------------------------------------------------------------

function ExerciseForm({ current }: { current?: ExerciseDetail }) {
  const router = useRouter();

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: current?.name ?? '',
      slug: current?.slug ?? '',
      shortDescription: current?.shortDescription ?? '',
      description: current?.description ?? '',
      imageUrl: current?.imageUrl ?? null,
      videoUrl: current?.videoUrl ?? null,
      exerciseTypeId: current?.exerciseType.id ?? null,
      difficulty: current?.difficulty ?? 'BEGINNER',
      instructions: current?.instructions ?? [''],
      tips: current?.tips ?? [],
      commonMistakes: current?.commonMistakes ?? [],
      safetyNotes: current?.safetyNotes ?? DEFAULT_SAFETY,
      categoryIds: current?.categories.map((c) => c.id) ?? [],
      focusAreaIds: current?.focusAreas.map((c) => c.id) ?? [],
      primaryMuscleIds: current?.primaryMuscles.map((c) => c.id) ?? [],
      secondaryMuscleIds: current?.secondaryMuscles.map((c) => c.id) ?? [],
      equipmentIds: current?.equipment.map((c) => c.id) ?? [],
      goalIds: current?.goals.map((c) => c.id) ?? [],
      alternativeIds: current?.alternatives.map((c) => c.id) ?? [],
    }),
    [current]
  );

  const methods = useForm<FormValues>({ resolver: zodResolver(Schema) as any, defaultValues });
  const { handleSubmit, formState, watch } = methods;
  const primary = watch('primaryMuscleIds');

  const save = (status?: 'DRAFT' | 'PUBLISHED') =>
    handleSubmit(async (values) => {
      const body = {
        ...values,
        slug: values.slug || undefined,
        instructions: values.instructions.map((s) => s.trim()).filter(Boolean),
        tips: values.tips.map((s) => s.trim()).filter(Boolean),
        commonMistakes: values.commonMistakes.map((s) => s.trim()).filter(Boolean),
        secondaryMuscleIds: values.secondaryMuscleIds.filter(
          (m) => !values.primaryMuscleIds.includes(m)
        ),
        ...(status ? { status } : current ? {} : { status: 'DRAFT' }),
      };
      try {
        const saved = current
          ? await api.patch<ExerciseDetail>(`/admin/exercises/${current.id}`, body)
          : await api.post<ExerciseDetail>('/admin/exercises', body);
        toast.success(status === 'PUBLISHED' ? 'Published' : 'Saved');
        invalidate('/admin/exercises');
        if (!current) router.replace(gymPaths.exercises.edit(saved.id));
        methods.reset(methods.getValues());
      } catch (e) {
        handleFormError(e, methods);
      }
    }, onInvalid);

  const isPublished = current?.status === 'PUBLISHED';

  return (
    <Page
      title={current ? current.name : 'New exercise'}
      crumbs={[
        { name: 'Exercises', href: gymPaths.exercises.root },
        { name: current ? 'Edit' : 'New' },
      ]}
      action={
        current && (
          <Button
            component={RouterLink}
            href={gymPaths.exercises.preview(current.id)}
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
              <Section title="Details" subheader="Name and descriptions shown to members">
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2.5,
                    gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
                  }}
                >
                  <Field.Text name="name" label="Exercise name" required />
                  <Field.Text name="slug" label="Slug" helperText="Auto-generated if empty" />
                </Box>
                <Field.Text
                  name="shortDescription"
                  label="Short description"
                  helperText="One line used on exercise cards"
                />
                <Field.Text name="description" label="About this exercise" multiline minRows={4} />
              </Section>

              <Section
                title="Instructions"
                subheader="Ordered steps (at least one is required to publish)"
              >
                <StringListField
                  name="instructions"
                  label="Steps"
                  numbered
                  placeholder="Describe one step…"
                />
              </Section>

              <Section title="Coaching notes">
                <StringListField name="tips" label="Tips" placeholder="A cue that helps…" />
                <StringListField
                  name="commonMistakes"
                  label="Common mistakes"
                  placeholder="A mistake to avoid…"
                />
                <Field.Text
                  name="safetyNotes"
                  label="Safety notes"
                  multiline
                  minRows={2}
                  helperText="Content must not be presented as medical advice."
                />
              </Section>

              <Section title="Alternatives" subheader="Linked exercise records members can swap to">
                <ExerciseMultiField
                  name="alternativeIds"
                  label="Add alternative exercise"
                  initial={current?.alternatives ?? []}
                  excludeIds={current ? [current.id] : []}
                />
              </Section>
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
                  {current && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Updated {fDate(current.updatedAt, true)}
                      {current.updatedBy ? ` by ${current.updatedBy.name}` : ''}
                      {current.usage &&
                        ` · used in ${current.usage.programs} program workouts, ${current.usage.sessions} logged sessions`}
                    </Typography>
                  )}
                  {current?.status === 'ARCHIVED' && (
                    <Alert severity="info">
                      Archived exercises are hidden from discovery but stay in members&apos; history
                      and libraries.
                    </Alert>
                  )}
                  <Stack direction="row" spacing={1.5}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="inherit"
                      onClick={save(isPublished ? undefined : 'DRAFT')}
                      loading={formState.isSubmitting}
                    >
                      {isPublished ? 'Save' : 'Save draft'}
                    </Button>
                    {!isPublished && (
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={save('PUBLISHED')}
                        loading={formState.isSubmitting}
                      >
                        Publish
                      </Button>
                    )}
                  </Stack>
                  {isPublished && (
                    <Button color="warning" onClick={save('DRAFT')}>
                      Unpublish (move to draft)
                    </Button>
                  )}
                </Stack>
              </Card>

              <Section title="Media">
                <MediaField
                  name="imageUrl"
                  label="Cover image"
                  folder="exercises"
                  aspectRatio="4 / 3"
                />
                <MediaField
                  name="videoUrl"
                  label="Instruction video (optional)"
                  folder="exercises"
                  mediaType="VIDEO"
                />
              </Section>

              <Section title="Classification">
                <RefSelectField
                  name="exerciseTypeId"
                  label="Exercise type"
                  path="/admin/exercise-types"
                  required
                  helperText="Decides the logging fields in the app"
                />
                <Field.Select name="difficulty" label="Difficulty">
                  {DIFFICULTIES.map((d) => (
                    <MenuItem key={d.value} value={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </Field.Select>
                <RefMultiField
                  name="categoryIds"
                  label="Categories"
                  path="/admin/exercise-categories"
                  helperText="Where it appears in Explore"
                />
                <RefMultiField
                  name="focusAreaIds"
                  label="Body parts / focus areas"
                  path="/admin/focus-areas"
                />
                <RefMultiField name="equipmentIds" label="Equipment" path="/admin/equipment" />
                <RefMultiField name="goalIds" label="Training goals" path="/admin/goals" />
              </Section>

              <Section title="Muscles">
                <RefMultiField
                  name="primaryMuscleIds"
                  label="Primary muscles"
                  path="/admin/muscles"
                />
                <RefMultiField
                  name="secondaryMuscleIds"
                  label="Secondary muscles"
                  path="/admin/muscles"
                  helperText={
                    primary.length ? 'Muscles chosen as primary are ignored here' : undefined
                  }
                />
              </Section>
            </Stack>
          </Grid>
        </Grid>
      </Form>
    </Page>
  );
}

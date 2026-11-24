import * as z from 'zod';
import { useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, useFieldArray } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { useParams, useRouter } from 'src/routes/hooks';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';

import { gymPaths } from '../paths';
import { Iconify } from '../components/icon';
import { MediaField } from '../components/media';
import { api, useApi, invalidate, DIFFICULTIES } from '../api';
import {
  Page,
  Section,
  onInvalid,
  ErrorState,
  StatusLabel,
  handleFormError,
} from '../components/common';
import {
  RefMultiField,
  ExercisePicker,
  RefSelectField,
  StringListField,
  ExerciseMultiField,
} from '../components/fields';

// ----------------------------------------------------------------------
// Shared form shell (load → form → publish card)

type ShellProps<T> = {
  title: string;
  listHref: string;
  apiPath: string;
  editHref: (id: number) => string;
  render: (current: T | undefined) => React.ReactNode;
};

function useLoadedEntity<T>(apiPath: string) {
  const { id } = useParams();
  const result = useApi<T>(id ? `${apiPath}/${id}` : null, { keepPreviousData: false });
  return { id, ...result };
}

function Loader<T>({ title, listHref, apiPath, render }: ShellProps<T>) {
  const { id, data, error, mutate } = useLoadedEntity<T>(apiPath);
  const crumbs = [{ name: title, href: listHref }, { name: id ? 'Edit' : 'New' }];
  if (!id) return <>{render(undefined)}</>;
  if (error)
    return (
      <Page title={title} crumbs={crumbs}>
        <ErrorState error={error} onRetry={() => mutate()} />
      </Page>
    );
  if (!data)
    return (
      <Page title={title} crumbs={crumbs}>
        <Skeleton variant="rounded" height={420} />
      </Page>
    );
  return <>{render(data)}</>;
}

function PublishCard({
  status,
  submitting,
  onSave,
}: {
  status?: string;
  submitting: boolean;
  onSave: (s?: 'DRAFT' | 'PUBLISHED') => () => void;
}) {
  const published = status === 'PUBLISHED';
  return (
    <Card sx={{ p: 3 }}>
      <Stack spacing={2}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1">Visibility</Typography>
          <StatusLabel status={status ?? 'DRAFT'} />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            loading={submitting}
            onClick={onSave(published ? undefined : 'DRAFT')}
          >
            {published ? 'Save' : 'Save draft'}
          </Button>
          {!published && (
            <Button
              fullWidth
              variant="contained"
              loading={submitting}
              onClick={onSave('PUBLISHED')}
            >
              Publish
            </Button>
          )}
        </Stack>
        {published && (
          <Button color="warning" onClick={onSave('DRAFT')}>
            Unpublish
          </Button>
        )}
      </Stack>
    </Card>
  );
}

function useSaver<T extends { id: number }>(
  apiPath: string,
  editHref: (id: number) => string,
  current: T | undefined,
  methods: any,
  transform: (v: any) => any
) {
  const router = useRouter();
  return (status?: 'DRAFT' | 'PUBLISHED') =>
    methods.handleSubmit(async (values: any) => {
      const body = {
        ...transform(values),
        ...(status ? { status } : current ? {} : { status: 'DRAFT' }),
      };
      if (!body.slug) delete body.slug;
      try {
        const saved = current
          ? await api.patch<T>(`${apiPath}/${current.id}`, body)
          : await api.post<T>(apiPath, body);
        toast.success(status === 'PUBLISHED' ? 'Published' : 'Saved');
        invalidate(apiPath);
        if (!current) router.replace(editHref(saved.id));
      } catch (e) {
        handleFormError(e, methods);
      }
    }, onInvalid);
}

// ======================================================================
// Coach
// ======================================================================

type Coach = {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  headline: string | null;
  bio: string | null;
  specialities: string[] | null;
  credentials:
    | { title: string; issuer: string | null; year: number | null; verified: boolean }[]
    | null;
  experienceYears: number | null;
  socialLinks: Record<string, string> | null;
  status: string;
  programIds: number[];
};

const CoachSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name is required' }),
  slug: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  headline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  specialities: z.array(z.string()),
  experienceYears: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().int().min(0).max(80).nullable()
  ),
  credentials: z.array(
    z.object({
      title: z.string().trim().min(1, { error: 'Title is required' }),
      issuer: z.string().nullable().optional(),
      year: z.preprocess(
        (v) => (v === '' || v == null ? null : Number(v)),
        z.number().int().min(1950).max(2100).nullable()
      ),
      verified: z.boolean(),
    })
  ),
  instagram: z.string().optional(),
  website: z.string().optional(),
  programIds: z.array(z.number()),
});

export function CoachFormView() {
  return (
    <Loader<Coach>
      title="Coaches"
      listHref={gymPaths.coaches.root}
      apiPath="/admin/coaches"
      editHref={gymPaths.coaches.edit}
      render={(current) => <CoachForm current={current} />}
    />
  );
}

function CoachForm({ current }: { current?: Coach }) {
  const methods = useForm({
    resolver: zodResolver(CoachSchema) as any,
    defaultValues: {
      name: current?.name ?? '',
      slug: current?.slug ?? '',
      imageUrl: current?.imageUrl ?? null,
      headline: current?.headline ?? '',
      bio: current?.bio ?? '',
      specialities: current?.specialities ?? [],
      experienceYears: current?.experienceYears ?? null,
      credentials: current?.credentials ?? [],
      instagram: current?.socialLinks?.instagram ?? '',
      website: current?.socialLinks?.website ?? '',
      programIds: current?.programIds ?? [],
    },
  });
  const creds = useFieldArray({ control: methods.control, name: 'credentials' });
  const credValues = (useWatch({ control: methods.control, name: 'credentials' }) ?? []) as {
    verified: boolean;
  }[];

  const save = useSaver(
    '/admin/coaches',
    gymPaths.coaches.edit,
    current,
    methods,
    ({ instagram, website, ...v }) => ({
      ...v,
      specialities: v.specialities.map((s: string) => s.trim()).filter(Boolean),
      socialLinks: Object.fromEntries(Object.entries({ instagram, website }).filter(([, x]) => x)),
    })
  );

  return (
    <Page
      title={current?.name ?? 'New coach'}
      crumbs={[
        { name: 'Coaches', href: gymPaths.coaches.root },
        { name: current ? 'Edit' : 'New' },
      ]}
    >
      <Form methods={methods} onSubmit={save()}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              <Section title="Profile">
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2.5,
                    gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
                  }}
                >
                  <Field.Text name="name" label="Name" required />
                  <Field.Text name="slug" label="Slug" helperText="Auto-generated if empty" />
                </Box>
                <Field.Text
                  name="headline"
                  label="Headline"
                  placeholder="Strength & conditioning coach"
                />
                <Field.Text name="bio" label="Bio" multiline minRows={4} />
                <Field.Text
                  name="experienceYears"
                  label="Years of experience"
                  type="number"
                  sx={{ maxWidth: 220 }}
                />
                <StringListField
                  name="specialities"
                  label="Specialities"
                  placeholder="e.g. Powerlifting"
                />
              </Section>
              <Section
                title="Qualifications & credentials"
                subheader="Only credentials marked as verified are ever shown to members."
              >
                <Alert severity="info">
                  Verify certificates before marking them as verified. Unverified claims stay
                  private.
                </Alert>
                {creds.fields.map((c, i) => (
                  <Box
                    key={c.id}
                    sx={{
                      display: 'grid',
                      gap: 1.5,
                      gridTemplateColumns: { xs: '1fr', sm: '2fr 1.5fr 90px auto auto' },
                      alignItems: 'center',
                    }}
                  >
                    <Field.Text size="small" name={`credentials.${i}.title`} label="Title" />
                    <Field.Text size="small" name={`credentials.${i}.issuer`} label="Issuer" />
                    <Field.Text
                      size="small"
                      name={`credentials.${i}.year`}
                      label="Year"
                      type="number"
                    />
                    <Field.Switch
                      name={`credentials.${i}.verified`}
                      label={
                        credValues[i]?.verified ? (
                          <Label color="success">Verified</Label>
                        ) : (
                          'Verified'
                        )
                      }
                    />
                    <IconButton color="error" onClick={() => creds.remove(i)}>
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Box>
                ))}
                <Box>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={() =>
                      creds.append({ title: '', issuer: '', year: null, verified: false })
                    }
                  >
                    Add credential
                  </Button>
                </Box>
              </Section>
              <Section title="Programs">
                <RefMultiField name="programIds" label="Assigned programs" path="/admin/programs" />
              </Section>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              <PublishCard
                status={current?.status}
                submitting={methods.formState.isSubmitting}
                onSave={save}
              />
              <Section title="Photo">
                <MediaField
                  name="imageUrl"
                  label="Profile image"
                  folder="coaches"
                  aspectRatio="1 / 1"
                />
              </Section>
              <Section title="Social links (optional)">
                <Field.Text name="instagram" label="Instagram URL" />
                <Field.Text name="website" label="Website" />
              </Section>
            </Stack>
          </Grid>
        </Grid>
      </Form>
    </Page>
  );
}

// ======================================================================
// Workout template
// ======================================================================

type Template = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  goalId: number | null;
  difficulty: string;
  daysPerWeek: number;
  split: string | null;
  progressionNotes: string | null;
  status: string;
  equipmentIds: number[];
  exercises: {
    exerciseId: number;
    dayNumber: number;
    sets: number | null;
    reps: string | null;
    durationSeconds: number | null;
    restSeconds: number | null;
    notes: string | null;
    exercise: { id: number; name: string; imageUrl: string | null; status: string };
  }[];
};

const num = z.preprocess(
  (v) => (v === '' || v == null || Number.isNaN(v) ? null : Number(v)),
  z.number().int().min(0).nullable()
);

const TemplateSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name is required' }),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  goalId: z.number().nullable().optional(),
  difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  daysPerWeek: z.coerce.number().int().min(1).max(7),
  split: z.string().nullable().optional(),
  progressionNotes: z.string().nullable().optional(),
  equipmentIds: z.array(z.number()),
  exercises: z.array(
    z.object({
      exerciseId: z
        .number({ error: 'Choose an exercise' })
        .nullable()
        .refine((v) => !!v, { error: 'Choose an exercise' }),
      exercise: z.any().optional(),
      dayNumber: z.coerce.number().int().min(1).max(7),
      sets: num,
      reps: z.string().nullable().optional(),
      durationSeconds: num,
      restSeconds: num,
      notes: z.string().nullable().optional(),
    })
  ),
});

export function TemplateFormView() {
  return (
    <Loader<Template>
      title="Workout templates"
      listHref={gymPaths.templates.root}
      apiPath="/admin/workout-templates"
      editHref={gymPaths.templates.edit}
      render={(current) => <TemplateForm current={current} />}
    />
  );
}

function TemplateForm({ current }: { current?: Template }) {
  const methods = useForm({
    resolver: zodResolver(TemplateSchema) as any,
    defaultValues: {
      name: current?.name ?? '',
      slug: current?.slug ?? '',
      description: current?.description ?? '',
      imageUrl: current?.imageUrl ?? null,
      goalId: current?.goalId ?? null,
      difficulty: (current?.difficulty as any) ?? 'BEGINNER',
      daysPerWeek: current?.daysPerWeek ?? 3,
      split: current?.split ?? '',
      progressionNotes: current?.progressionNotes ?? '',
      equipmentIds: current?.equipmentIds ?? [],
      exercises:
        current?.exercises.map((e) => ({ ...e, reps: e.reps ?? '', notes: e.notes ?? '' })) ?? [],
    },
  });
  const rows = useFieldArray({ control: methods.control, name: 'exercises' });
  const values = (useWatch({ control: methods.control, name: 'exercises' }) ?? []) as any[];
  const days = Number(useWatch({ control: methods.control, name: 'daysPerWeek' }) || 1);
  const errs = methods.formState.errors.exercises as any;

  const save = useSaver(
    '/admin/workout-templates',
    gymPaths.templates.edit,
    current,
    methods,
    (v) => ({
      ...v,
      exercises: v.exercises.map(({ exercise: _e, ...e }: any) => ({
        ...e,
        reps: e.reps || null,
        notes: e.notes || null,
      })),
    })
  );

  return (
    <Page
      title={current?.name ?? 'New workout template'}
      crumbs={[
        { name: 'Workout templates', href: gymPaths.templates.root },
        { name: current ? 'Edit' : 'New' },
      ]}
    >
      <Form methods={methods} onSubmit={save()}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              <Section
                title="Template"
                subheader="A reusable workout structure (distinct from multi-week programs)"
              >
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2.5,
                    gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
                  }}
                >
                  <Field.Text name="name" label="Name" required />
                  <Field.Text name="slug" label="Slug" helperText="Auto-generated if empty" />
                </Box>
                <Field.Text name="description" label="Description" multiline minRows={3} />
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2.5,
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                  }}
                >
                  <Field.Text name="split" label="Workout split" placeholder="Upper / Lower" />
                  <Field.Text name="daysPerWeek" label="Weekly frequency (days)" type="number" />
                </Box>
                <Field.Text
                  name="progressionNotes"
                  label="Progression notes"
                  multiline
                  minRows={2}
                />
              </Section>
              <Section title="Exercises" subheader="Ordered per day">
                {rows.fields.map((r, i) => (
                  <Box
                    key={r.id}
                    sx={{
                      display: 'grid',
                      gap: 1,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: 'background.neutral',
                      gridTemplateColumns: {
                        xs: '1fr 1fr',
                        md: '90px minmax(200px,3fr) 70px 90px 90px auto',
                      },
                      alignItems: 'start',
                    }}
                  >
                    <Field.Select size="small" name={`exercises.${i}.dayNumber`} label="Day">
                      {Array.from({ length: days }, (_, d) => (
                        <MenuItem key={d} value={d + 1}>
                          Day {d + 1}
                        </MenuItem>
                      ))}
                    </Field.Select>
                    <Box sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }}>
                      <ExercisePicker
                        size="small"
                        value={values[i]?.exercise ?? null}
                        error={errs?.[i]?.exerciseId?.message}
                        onChange={(o) => {
                          methods.setValue(
                            `exercises.${i}.exerciseId` as any,
                            (o?.id ?? null) as any,
                            { shouldValidate: true }
                          );
                          methods.setValue(`exercises.${i}.exercise` as any, o as any);
                        }}
                      />
                    </Box>
                    <Field.Text
                      size="small"
                      name={`exercises.${i}.sets`}
                      label="Sets"
                      type="number"
                    />
                    <Field.Text size="small" name={`exercises.${i}.reps`} label="Reps" />
                    <Field.Text
                      size="small"
                      name={`exercises.${i}.restSeconds`}
                      label="Rest (s)"
                      type="number"
                    />
                    <Stack
                      direction="row"
                      sx={{ justifyContent: 'flex-end', gridColumn: { xs: '1 / -1', md: 'auto' } }}
                    >
                      <IconButton
                        size="small"
                        disabled={i === 0}
                        onClick={() => rows.move(i, i - 1)}
                      >
                        <Iconify icon="eva:arrow-ios-upward-fill" />
                      </IconButton>
                      <IconButton
                        size="small"
                        disabled={i === rows.fields.length - 1}
                        onClick={() => rows.move(i, i + 1)}
                      >
                        <Iconify icon="eva:arrow-ios-downward-fill" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => rows.remove(i)}>
                        <Iconify icon="mingcute:close-line" />
                      </IconButton>
                    </Stack>
                  </Box>
                ))}
                <Box>
                  <Button
                    size="small"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                    onClick={() =>
                      rows.append({
                        exerciseId: null as any,
                        dayNumber: 1,
                        sets: 3,
                        reps: '10',
                        durationSeconds: null,
                        restSeconds: 90,
                        notes: '',
                      } as any)
                    }
                  >
                    Add exercise
                  </Button>
                </Box>
              </Section>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              <PublishCard
                status={current?.status}
                submitting={methods.formState.isSubmitting}
                onSave={save}
              />
              <Section title="Settings">
                <RefSelectField name="goalId" label="Goal" path="/admin/goals" />
                <Field.Select name="difficulty" label="Difficulty">
                  {DIFFICULTIES.map((d) => (
                    <MenuItem key={d.value} value={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </Field.Select>
                <RefMultiField
                  name="equipmentIds"
                  label="Equipment requirements"
                  path="/admin/equipment"
                />
              </Section>
              <Section title="Cover">
                <MediaField name="imageUrl" label="Cover image" folder="programs" />
              </Section>
            </Stack>
          </Grid>
        </Grid>
      </Form>
    </Page>
  );
}

// ======================================================================
// Featured collection
// ======================================================================

type Collection = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isFeatured: boolean;
  status: string;
  exercises: { id: number; name: string; imageUrl: string | null; status: string }[];
  exerciseIds: number[];
  programIds: number[];
};

const CollectionSchema = z.object({
  name: z.string().trim().min(2, { error: 'Name is required' }),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.coerce.number().int().min(0),
  isFeatured: z.boolean(),
  exerciseIds: z.array(z.number()),
  programIds: z.array(z.number()),
});

export function CollectionFormView() {
  return (
    <Loader<Collection>
      title="Featured collections"
      listHref={gymPaths.collections.root}
      apiPath="/admin/collections"
      editHref={gymPaths.collections.edit}
      render={(current) => <CollectionForm current={current} />}
    />
  );
}

function CollectionForm({ current }: { current?: Collection }) {
  const methods = useForm({
    resolver: zodResolver(CollectionSchema) as any,
    defaultValues: {
      name: current?.name ?? '',
      slug: current?.slug ?? '',
      description: current?.description ?? '',
      imageUrl: current?.imageUrl ?? null,
      sortOrder: current?.sortOrder ?? 0,
      isFeatured: current?.isFeatured ?? false,
      exerciseIds: current?.exerciseIds ?? [],
      programIds: current?.programIds ?? [],
    },
  });
  const save = useSaver(
    '/admin/collections',
    gymPaths.collections.edit,
    current,
    methods,
    (v) => v
  );
  const initial = useMemo(() => current?.exercises ?? [], [current]);

  return (
    <Page
      title={current?.name ?? 'New collection'}
      crumbs={[
        { name: 'Featured collections', href: gymPaths.collections.root },
        { name: current ? 'Edit' : 'New' },
      ]}
    >
      <Form methods={methods} onSubmit={save()}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              <Section
                title="Collection"
                subheader="Admin-curated. Member collections are private and managed in the app."
              >
                <Box
                  sx={{
                    display: 'grid',
                    gap: 2.5,
                    gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' },
                  }}
                >
                  <Field.Text name="name" label="Name" required />
                  <Field.Text name="slug" label="Slug" helperText="Auto-generated if empty" />
                </Box>
                <Field.Text name="description" label="Description" multiline minRows={3} />
              </Section>
              <Section title="Content">
                <ExerciseMultiField name="exerciseIds" label="Add exercise" initial={initial} />
                <RefMultiField name="programIds" label="Programs" path="/admin/programs" />
              </Section>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              <PublishCard
                status={current?.status}
                submitting={methods.formState.isSubmitting}
                onSave={save}
              />
              <Section title="Display">
                <Field.Switch name="isFeatured" label="Featured on Home" />
                <Field.Text name="sortOrder" label="Display order" type="number" />
                <MediaField name="imageUrl" label="Cover image" folder="collections" />
              </Section>
            </Stack>
          </Grid>
        </Grid>
      </Form>
    </Page>
  );
}

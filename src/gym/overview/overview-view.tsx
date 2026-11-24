import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import LinearProgress from '@mui/material/LinearProgress';

import { RouterLink } from 'src/routes/components';

import { fNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';
import { DashboardContent } from 'src/layouts/dashboard';
import { MotivationIllustration } from 'src/assets/illustrations';

import { Label } from 'src/components/label';
import { EmptyContent } from 'src/components/empty-content';
import { Chart, useChart, ChartLegends } from 'src/components/chart';

import { AppWelcome } from 'src/sections/overview/app/app-welcome';
import { AppCurrentDownload } from 'src/sections/overview/app/app-current-download';
import { CourseWidgetSummary } from 'src/sections/overview/course/course-widget-summary';
import { AnalyticsWidgetSummary } from 'src/sections/overview/analytics/analytics-widget-summary';

import { useAuthContext } from 'src/auth/hooks';

import { gymPaths } from '../paths';
import { Iconify } from '../components/icon';
import { ErrorState } from '../components/common';
import { useApi, toQuery, useOptions } from '../api';
import { P, Can, usePermissions } from '../permissions';

// ----------------------------------------------------------------------

type Delta = { value: number; change: number };
type Point = { date: string; count: number };

type Summary = {
  range: { from: string; to: string };
  health: {
    onboarding: Record<string, number>;
    enrollments: Record<string, number>;
    exercises: Record<string, number>;
    mediaAssets: number;
    publishedCoaches: number;
  };
  kpis: {
    totalMembers: number;
    activeMembers: Delta;
    newRegistrations: Delta;
    workoutsLogged: Delta;
    activePrograms: number;
    activeEnrollments: number;
    totalExercises: number;
    draftExercises: number;
  };
  mostViewedExercises: { id: number; name: string; imageUrl: string | null; views: number }[];
  mostFollowedPrograms: {
    id: number;
    name: string;
    imageUrl: string | null;
    enrollments: number;
    completed: number;
  }[];
  charts: {
    registrations: Point[];
    workouts: Point[];
    goalDistribution: { id: number; name: string; count: number }[];
    popularCategories: { id: number; name: string; views: number; saves: number }[];
  };
};

const RANGES = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 365, label: 'Last 12 months' },
];

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Compresses a daily series into ~8 buckets for the KPI sparklines. */
function sparkline(points: Point[] = [], buckets = 8) {
  if (!points.length)
    return { series: Array(buckets).fill(0), categories: Array(buckets).fill('') };
  const size = Math.max(1, Math.ceil(points.length / buckets));
  const series: number[] = [];
  const categories: string[] = [];
  for (let i = 0; i < points.length; i += size) {
    const slice = points.slice(i, i + size);
    series.push(slice.reduce((s, p) => s + p.count, 0));
    categories.push(
      new Date(slice[0].date).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
    );
  }
  return { series, categories };
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${fNumber(n)} ${n === 1 ? one : many}`;

const pct = (part: number, total: number) => (total ? Math.round((part / total) * 100) : 0);

// ----------------------------------------------------------------------

export function OverviewView() {
  const theme = useTheme();
  const { user } = useAuthContext();
  const { can } = usePermissions();
  const [days, setDays] = useState(30);
  const [goalId, setGoalId] = useState('');
  const [status, setStatus] = useState('');
  const [segment, setSegment] = useState('');
  const { options: goals } = useOptions('/admin/goals');

  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 86_400_000);
  const { data, error, isLoading, mutate } = useApi<Summary>(
    `/admin/dashboard/summary${toQuery({ from: isoDay(from), to: isoDay(to), goalId, status, segment })}`
  );

  const k = data?.kpis;
  const h = data?.health;
  const rangeLabel = RANGES.find((r) => r.value === days)?.label.toLowerCase();

  const loading = isLoading && !data;

  const onboardingTotal = h ? Object.values(h.onboarding).reduce((a, b) => a + b, 0) : 0;
  const enrollTotal = h ? Object.values(h.enrollments).reduce((a, b) => a + b, 0) : 0;
  const exerciseTotal = h ? Object.values(h.exercises).reduce((a, b) => a + b, 0) : 0;

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>
        {/* ---------------------------------------------------- Welcome */}
        <Grid size={{ xs: 12, md: 8 }}>
          <AppWelcome
            title={`Welcome back 👋 \n ${user?.name ?? ''}`}
            description={
              k
                ? `${plural(k.workoutsLogged.value, 'workout')} logged and ${plural(k.newRegistrations.value, 'new member')} in the ${rangeLabel}. ${plural(k.totalExercises, 'exercise')} and ${plural(k.activePrograms, 'program')} are live in the app.`
                : 'Loading the latest activity from your members…'
            }
            img={<MotivationIllustration hideBackground />}
            action={
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Can permission={P.CONTENT_MANAGE}>
                  <Button
                    component={RouterLink}
                    href={gymPaths.exercises.new}
                    variant="contained"
                    color="primary"
                    startIcon={<Iconify icon="mingcute:add-line" />}
                  >
                    New exercise
                  </Button>
                </Can>
                {can(P.USERS_VIEW) && (
                  <Button
                    component={RouterLink}
                    href={gymPaths.members.root}
                    variant="outlined"
                    sx={{
                      color: 'common.white',
                      borderColor: varAlpha(theme.vars.palette.common.whiteChannel, 0.32),
                    }}
                  >
                    View members
                  </Button>
                )}
              </Stack>
            }
          />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3} sx={{ height: 1 }}>
            <CourseWidgetSummary
              title="Published exercises"
              total={k?.totalExercises ?? 0}
              color="primary"
              icon={`${CONFIG.assetsDir}/assets/icons/courses/ic-courses-completed.svg`}
              sx={{ flex: 1, position: 'relative' }}
            />
            <CourseWidgetSummary
              title={`Published programs · ${fNumber(k?.activeEnrollments ?? 0)} active followers`}
              total={k?.activePrograms ?? 0}
              color="info"
              icon={`${CONFIG.assetsDir}/assets/icons/courses/ic-courses-progress.svg`}
              sx={{ flex: 1, position: 'relative' }}
            />
          </Stack>
        </Grid>

        {/* ---------------------------------------------------- Filters */}
        <Grid size={12}>
          <Card sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mr: 'auto' }}>
              <Iconify icon="solar:chart-square-outline" sx={{ color: 'primary.main' }} />
              <Typography variant="subtitle1">Performance</Typography>
              {isLoading && data && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                  updating…
                </Typography>
              )}
            </Stack>
            <TextField
              select
              size="small"
              label="Date range"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              sx={{ minWidth: 160 }}
            >
              {RANGES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Goal"
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="">All goals</MenuItem>
              {goals.map((g) => (
                <MenuItem key={g.id} value={String(g.id)}>
                  {g.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Member status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
              <MenuItem value="SUSPENDED">Suspended</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Segment"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              sx={{ minWidth: 190 }}
            >
              <MenuItem value="">All members</MenuItem>
              <MenuItem value="COMPLETED">Onboarding completed</MenuItem>
              <MenuItem value="IN_PROGRESS">Onboarding in progress</MenuItem>
              <MenuItem value="NOT_STARTED">Onboarding not started</MenuItem>
            </TextField>
          </Card>
        </Grid>

        {error && (
          <Grid size={12}>
            <ErrorState error={error} onRetry={() => mutate()} />
          </Grid>
        )}

        {/* ---------------------------------------------------- KPI cards */}
        {[
          {
            title: 'Total members',
            total: k?.totalMembers,
            percent: k
              ? pct(
                  k.newRegistrations.value,
                  Math.max(1, k.totalMembers - k.newRegistrations.value)
                )
              : 0,
            color: 'primary' as const,
            icon: 'solar:users-group-rounded-bold-duotone',
            points: data?.charts.registrations,
            cumulative: true,
          },
          {
            title: 'Active members',
            total: k?.activeMembers.value,
            percent: k?.activeMembers.change,
            color: 'secondary' as const,
            icon: 'solar:running-round-bold-duotone',
            points: data?.charts.workouts,
          },
          {
            title: 'New registrations',
            total: k?.newRegistrations.value,
            percent: k?.newRegistrations.change,
            color: 'warning' as const,
            icon: 'solar:user-plus-bold',
            points: data?.charts.registrations,
          },
          {
            title: 'Workouts logged',
            total: k?.workoutsLogged.value,
            percent: k?.workoutsLogged.change,
            color: 'error' as const,
            icon: 'solar:dumbbell-large-minimalistic-bold',
            points: data?.charts.workouts,
          },
        ].map((w) => (
          <Grid key={w.title} size={{ xs: 12, sm: 6, md: 3 }}>
            {loading ? (
              <Skeleton variant="rounded" height={176} sx={{ borderRadius: 2 }} />
            ) : (
              <AnalyticsWidgetSummary
                title={w.title}
                total={w.total ?? 0}
                percent={w.percent ?? 0}
                color={w.color}
                icon={<Iconify icon={w.icon} width={48} />}
                chart={(() => {
                  const s = sparkline(w.points);
                  if (w.cumulative) {
                    let run = Math.max(0, (w.total ?? 0) - s.series.reduce((a, b) => a + b, 0));
                    s.series = s.series.map((v) => (run += v));
                  }
                  return s;
                })()}
              />
            )}
          </Grid>
        ))}

        {/* ---------------------------------------------------- Activity + goals */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <ActivityChart
            registrations={data?.charts.registrations}
            workouts={data?.charts.workouts}
            loading={loading}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          {loading ? (
            <Skeleton variant="rounded" height={460} sx={{ borderRadius: 2 }} />
          ) : data && data.charts.goalDistribution.some((g) => g.count > 0) ? (
            <AppCurrentDownload
              title="Goal distribution"
              subheader="Members by primary goal"
              chart={{
                colors: [
                  theme.palette.primary.main,
                  theme.palette.info.main,
                  theme.palette.warning.main,
                  theme.palette.secondary.main,
                  theme.palette.grey[500],
                ],
                series: data.charts.goalDistribution
                  .filter((g) => g.count > 0)
                  .map((g) => ({ label: g.name, value: g.count })),
              }}
              sx={{ height: 1 }}
            />
          ) : (
            <Card sx={{ height: 1 }}>
              <CardHeader title="Goal distribution" subheader="Members by primary goal" />
              <EmptyContent
                title="No members yet"
                description="Goals appear once members finish onboarding."
                sx={{ py: 8 }}
              />
            </Card>
          )}
        </Grid>

        {/* ---------------------------------------------------- Health radials */}
        <Grid size={{ xs: 12, md: 6, lg: 12 }} sx={{ order: { md: 1, lg: 0 } }}>
          <HealthWidgets
            loading={loading}
            items={[
              {
                label: 'Onboarding completed',
                caption: `${fNumber(h?.onboarding.COMPLETED ?? 0)} of ${fNumber(onboardingTotal)} members`,
                percent: pct(h?.onboarding.COMPLETED ?? 0, onboardingTotal),
                color: 'primary',
              },
              {
                label: `Active in ${rangeLabel}`,
                caption: `${fNumber(k?.activeMembers.value ?? 0)} of ${fNumber(k?.totalMembers ?? 0)} members`,
                percent: pct(k?.activeMembers.value ?? 0, k?.totalMembers ?? 0),
                color: 'info',
              },
              {
                label: 'Program completion',
                caption: `${fNumber(h?.enrollments.COMPLETED ?? 0)} of ${fNumber(enrollTotal)} enrollments`,
                percent: pct(h?.enrollments.COMPLETED ?? 0, enrollTotal),
                color: 'warning',
              },
              {
                label: 'Catalogue published',
                caption: `${fNumber(h?.exercises.PUBLISHED ?? 0)} of ${fNumber(exerciseTotal)} exercises`,
                percent: pct(h?.exercises.PUBLISHED ?? 0, exerciseTotal),
                color: 'secondary',
              },
            ]}
          />
        </Grid>

        {/* ---------------------------------------------------- Categories + top lists */}
        <Grid size={{ xs: 12, md: 6, lg: 4 }}>
          <CategoryProgress loading={loading} rows={data?.charts.popularCategories ?? []} />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }} sx={{ order: { md: 2, lg: 0 } }}>
          <RankList
            title="Most viewed exercises"
            subheader={`In the ${rangeLabel}`}
            icon="solar:dumbbell-large-minimalistic-bold"
            loading={loading}
            empty="No exercise views in this period"
            href={(id) => gymPaths.exercises.preview(id)}
            rows={
              data?.mostViewedExercises.map((e) => ({
                id: e.id,
                name: e.name,
                imageUrl: e.imageUrl,
                value: fNumber(e.views),
                unit: 'views',
              })) ?? []
            }
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6, lg: 4 }} sx={{ order: { md: 2, lg: 0 } }}>
          <RankList
            title="Most followed programs"
            subheader={`Started in the ${rangeLabel}`}
            icon="solar:notebook-bold-duotone"
            loading={loading}
            empty="No program enrollments in this period"
            href={(id) => gymPaths.programs.preview(id)}
            rows={
              data?.mostFollowedPrograms.map((p) => ({
                id: p.id,
                name: p.name,
                imageUrl: p.imageUrl,
                value: fNumber(p.enrollments),
                unit: 'started',
                extra: p.completed ? `${fNumber(p.completed)} completed` : undefined,
              })) ?? []
            }
          />
        </Grid>
      </Grid>
    </DashboardContent>
  );
}

// ----------------------------------------------------------------------

function ActivityChart({
  registrations,
  workouts,
  loading,
}: {
  registrations?: Point[];
  workouts?: Point[];
  loading?: boolean;
}) {
  const theme = useTheme();
  const colors = [theme.palette.primary.main, theme.palette.warning.main];
  const totals = [registrations, workouts].map((s) => s?.reduce((a, p) => a + p.count, 0) ?? 0);

  const options = useChart({
    colors,
    chart: { toolbar: { show: false } },
    stroke: { width: 2, curve: 'smooth' },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.32, opacityTo: 0 } },
    legend: { show: false },
    xaxis: {
      type: 'datetime',
      categories: registrations?.map((p) => p.date) ?? [],
      labels: { datetimeUTC: true },
      tooltip: { enabled: false },
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      labels: { formatter: (v: number) => fNumber(Math.round(v)) },
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { format: 'dd MMM yyyy' },
      y: { formatter: (v: number) => fNumber(v) },
    },
  });

  return (
    <Card sx={{ height: 1 }}>
      <CardHeader
        title="Member activity"
        subheader="New registrations and completed workouts per day"
        sx={{ mb: 2 }}
      />
      <ChartLegends
        colors={colors}
        labels={['Registrations', 'Workouts']}
        values={totals.map((t) => fNumber(t))}
        sx={{ px: 3, gap: 3 }}
      />
      {loading ? (
        <Skeleton variant="rounded" height={320} sx={{ m: 3 }} />
      ) : (
        <Chart
          type="area"
          series={[
            { name: 'Registrations', data: registrations?.map((p) => p.count) ?? [] },
            { name: 'Workouts', data: workouts?.map((p) => p.count) ?? [] },
          ]}
          options={options}
          sx={{ pl: 1, py: 2.5, pr: 2.5, height: 340 }}
        />
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

type HealthItem = {
  label: string;
  caption: string;
  percent: number;
  color: 'primary' | 'info' | 'warning' | 'secondary';
};

/** Radial progress strip, after the template's check-in widget. */
function HealthWidgets({ items, loading }: { items: HealthItem[]; loading?: boolean }) {
  const theme = useTheme();
  const smUp = useMediaQuery(theme.breakpoints.up('sm'));
  const lgUp = useMediaQuery(theme.breakpoints.up('lg'));

  const base = useChart({
    chart: { sparkline: { enabled: true } },
    stroke: { width: 0 },
    plotOptions: {
      radialBar: {
        hollow: { size: '62%' },
        track: { margin: 0 },
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: 6,
            fontSize: theme.typography.subtitle2.fontSize as string,
            fontWeight: theme.typography.subtitle2.fontWeight,
          },
        },
      },
    },
  });

  if (loading) return <Skeleton variant="rounded" height={170} sx={{ borderRadius: 2 }} />;

  return (
    <Card sx={{ height: 1 }}>
      <Box
        sx={{
          height: 1,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
          '& > *:not(:last-of-type)': lgUp
            ? { borderRight: `1px dashed ${theme.vars.palette.divider}` }
            : {},
          '& > *':
            !lgUp && smUp ? { borderBottom: `1px dashed ${theme.vars.palette.divider}` } : {},
        }}
      >
        {items.map((item) => (
          <Box
            key={item.label}
            sx={{
              py: 4,
              px: 3,
              gap: 2.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: { lg: 'center' },
            }}
          >
            <Chart
              type="radialBar"
              series={[item.percent]}
              options={{
                ...base,
                fill: {
                  type: 'gradient',
                  gradient: {
                    colorStops: [
                      { offset: 0, color: theme.palette[item.color].light, opacity: 1 },
                      { offset: 100, color: theme.palette[item.color].main, opacity: 1 },
                    ],
                  },
                },
              }}
              sx={{ width: 84, height: 84, flexShrink: 0 }}
            />
            <div>
              <Typography variant="subtitle1">{item.label}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {item.caption}
              </Typography>
            </div>
          </Box>
        ))}
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

function CategoryProgress({
  rows,
  loading,
}: {
  rows: Summary['charts']['popularCategories'];
  loading?: boolean;
}) {
  const total = rows.reduce((s, r) => s + r.views, 0);
  const sorted = [...rows]
    .filter((r) => r.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  return (
    <Card sx={{ height: 1 }}>
      <CardHeader title="Popular categories" subheader="Share of exercise views" />
      {loading ? (
        <Skeleton variant="rounded" height={280} sx={{ m: 3 }} />
      ) : !total ? (
        <EmptyContent
          title="No exercise views yet"
          description="Category popularity appears as members explore."
          sx={{ py: 8 }}
        />
      ) : (
        <Box sx={{ gap: 3.5, px: 3, py: 4, display: 'flex', flexDirection: 'column' }}>
          {sorted.map((r, i) => {
            const share = Math.round((r.views / total) * 100);
            return (
              <div key={r.id}>
                <Box
                  sx={{
                    mb: 1,
                    gap: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    typography: 'subtitle2',
                  }}
                >
                  <Box component="span" sx={{ flexGrow: 1 }}>
                    {r.name}
                  </Box>
                  <Box component="span">{fNumber(r.views)}</Box>
                  <Box component="span" sx={{ typography: 'body2', color: 'text.secondary' }}>
                    ({share}%)
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={share}
                  color={i === 0 ? 'primary' : i === 1 ? 'info' : 'inherit'}
                  sx={(theme) => ({
                    height: 8,
                    bgcolor: varAlpha(theme.vars.palette.grey['500Channel'], 0.16),
                    ...(i > 1 && { color: 'text.disabled' }),
                  })}
                />
              </div>
            );
          })}
        </Box>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------

type RankRow = {
  id: number;
  name: string;
  imageUrl: string | null;
  value: string;
  unit: string;
  extra?: string;
};

function RankList({
  title,
  subheader,
  icon,
  rows,
  empty,
  loading,
  href,
}: {
  title: string;
  subheader: string;
  icon: string;
  rows: RankRow[];
  empty: string;
  loading?: boolean;
  href: (id: number) => string;
}) {
  const medal = ['primary', 'info', 'warning'] as const;
  return (
    <Card sx={{ height: 1 }}>
      <CardHeader title={title} subheader={subheader} />
      {loading ? (
        <Skeleton variant="rounded" height={280} sx={{ m: 3 }} />
      ) : !rows.length ? (
        <EmptyContent title={empty} sx={{ py: 8 }} />
      ) : (
        <Stack divider={<Divider sx={{ borderStyle: 'dashed' }} />} sx={{ px: 3, py: 2 }}>
          {rows.map((r, i) => (
            <Box
              key={r.id}
              component={RouterLink}
              href={href(r.id)}
              sx={{
                py: 1.5,
                gap: 2,
                display: 'flex',
                alignItems: 'center',
                color: 'inherit',
                textDecoration: 'none',
                '&:hover .rank-name': { color: 'primary.main' },
              }}
            >
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  variant="rounded"
                  src={r.imageUrl ?? undefined}
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: 'background.neutral',
                    color: 'text.disabled',
                  }}
                >
                  <Iconify icon={icon} width={24} />
                </Avatar>
                <Box
                  sx={(theme) => ({
                    top: -6,
                    left: -6,
                    width: 22,
                    height: 22,
                    fontSize: 11,
                    fontWeight: 800,
                    borderRadius: '50%',
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${theme.vars.palette.background.paper}`,
                    bgcolor: i < 3 ? `${medal[i]}.main` : 'grey.500',
                    color: i < 3 ? `${medal[i]}.contrastText` : 'common.white',
                  })}
                >
                  {i + 1}
                </Box>
              </Box>
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography
                  className="rank-name"
                  variant="subtitle2"
                  noWrap
                  sx={{ transition: 'color .2s' }}
                >
                  {r.name}
                </Typography>
                {r.extra && (
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {r.extra}
                  </Typography>
                )}
              </Box>
              <Label variant="soft" color={i < 3 ? medal[i] : 'default'} sx={{ flexShrink: 0 }}>
                {r.value} {r.unit}
              </Label>
            </Box>
          ))}
        </Stack>
      )}
    </Card>
  );
}

import type { SWRConfiguration } from 'swr';

import useSWR, { mutate as globalMutate } from 'swr';

import axios, { fetcher } from 'src/lib/axios';

// ----------------------------------------------------------------------
// Shared types

export type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  statusCounts?: Record<string, number>;
};

export type Status = 'ACTIVE' | 'INACTIVE';
export type ContentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Difficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

export type Ref = { id: number; name: string; slug?: string };

export const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

export const CONTENT_STATUSES: { value: ContentStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

// ----------------------------------------------------------------------
// Query helpers

export type QueryParams = Record<
  string,
  string | number | boolean | (string | number)[] | null | undefined
>;

export function toQuery(params: QueryParams = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) {
      if (v.length) sp.set(k, v.join(','));
    } else sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

const swrDefaults: SWRConfiguration = {
  revalidateOnFocus: false,
  keepPreviousData: true,
  shouldRetryOnError: false,
};

/** GET with SWR; pass `null` as url to skip. */
export function useApi<T>(url: string | null, config?: SWRConfiguration) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(url, fetcher, {
    ...swrDefaults,
    ...config,
  });
  return { data, error: error as Error | undefined, isLoading, isValidating, mutate };
}

export function useList<T>(path: string | null, params?: QueryParams, config?: SWRConfiguration) {
  return useApi<Paginated<T>>(path ? `${path}${toQuery(params)}` : null, config);
}

/** Lightweight option lists for selects (reference data). */
export function useOptions<T extends { id: number } = Ref>(path: string, params?: QueryParams) {
  const { data, isLoading } = useList<T>(path, { limit: 500, ...params });
  return { options: data?.data ?? [], isLoading };
}

/** Revalidate every cached key starting with the prefix (e.g. after a mutation). */
export function invalidate(prefix: string) {
  return globalMutate((key) => typeof key === 'string' && key.startsWith(prefix), undefined, {
    revalidate: true,
  });
}

// ----------------------------------------------------------------------
// Mutations

export const api = {
  get: async <T>(url: string) => (await axios.get<T>(url)).data,
  post: async <T>(url: string, body?: unknown) => (await axios.post<T>(url, body)).data,
  put: async <T>(url: string, body?: unknown) => (await axios.put<T>(url, body)).data,
  patch: async <T>(url: string, body?: unknown) => (await axios.patch<T>(url, body)).data,
  delete: async <T>(url: string) => (await axios.delete<T>(url)).data,
  upload: async <T>(
    url: string,
    file: File,
    fields: Record<string, string> = {},
    method: 'post' | 'put' = 'post',
    onProgress?: (pct: number) => void
  ) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    const res = await axios.request<T>({
      url,
      method,
      data: form,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
    });
    return res.data;
  },
  download: async (url: string, filename: string) => {
    const res = await axios.get(url, { responseType: 'blob' });
    const href = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(href);
  },
};

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

// ----------------------------------------------------------------------
// Domain types (subset of API responses used by the UI)

export type ExerciseCard = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  imageUrl: string | null;
  difficulty: Difficulty;
  status: ContentStatus;
  viewCount: number;
  saveCount: number;
  exerciseType: { id: number; name: string; loggingFields: string[] };
  categories: Ref[];
  focusAreas: Ref[];
  equipment: Ref[];
  createdAt: string;
  updatedAt: string;
};

export type ExerciseDetail = ExerciseCard & {
  description: string | null;
  videoUrl: string | null;
  instructions: string[];
  tips: string[];
  commonMistakes: string[];
  safetyNotes: string | null;
  publishedAt: string | null;
  primaryMuscles: Ref[];
  secondaryMuscles: Ref[];
  goals: Ref[];
  alternatives: (Ref & {
    imageUrl: string | null;
    difficulty: Difficulty;
    status: ContentStatus;
  })[];
  createdBy: Ref | null;
  updatedBy: Ref | null;
  usage: { programs: number; sessions: number };
};

export type ProgramWorkoutExercise = {
  id?: number;
  exerciseId: number;
  sets: number | null;
  reps: string | null;
  durationSeconds: number | null;
  restSeconds: number | null;
  notes: string | null;
  exercise?: { id: number; name: string; imageUrl: string | null; status: ContentStatus };
};

export type ProgramWorkout = {
  id?: number;
  dayNumber: number;
  title: string;
  description: string | null;
  estimatedMinutes: number | null;
  exercises: ProgramWorkoutExercise[];
};

export type ProgramWeek = {
  id?: number;
  weekNumber: number;
  title: string | null;
  notes: string | null;
  workouts: ProgramWorkout[];
};

export type Program = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  imageUrl: string | null;
  goalId: number | null;
  coachId: number | null;
  goal: Ref | null;
  coach: (Ref & { imageUrl: string | null }) | null;
  difficulty: Difficulty;
  durationWeeks: number;
  daysPerWeek: number;
  targetAudience: string | null;
  minExperienceRank: number | null;
  maxExperienceRank: number | null;
  status: ContentStatus;
  publishedAt: string | null;
  equipment: Ref[];
  enrollmentCount: number;
  saveCount: number;
  updatedAt: string;
  weeks?: ProgramWeek[];
};

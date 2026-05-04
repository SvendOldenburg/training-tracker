import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@3/+esm';

export const db = new Dexie('TrainingTracker');

db.version(1).stores({
  strength_sessions: '++id, date, type',
  bodyweight: '++id, date',
  rower_sessions: '++id, date',
  kettlebell_sessions: '++id, date, exercise',
  settings: 'key',
});

db.version(2).stores({
  strength_sessions: '++id, date, type',
  bodyweight: '++id, date',
  rower_sessions: '++id, date',
  kettlebell_sessions: '++id, date, exercise',
  barbell_sessions: '++id, date, exercise',
  dumbbell_sessions: '++id, date, exercise',
  body_measurements: '++id, date',
  settings: 'key',
});

export const WORKOUTS = {
  A: [
    { name: 'Squat',       sets: 5, reps: 5, increment_kg: 2.5 },
    { name: 'Bench Press', sets: 5, reps: 5, increment_kg: 2.5 },
    { name: 'Barbell Row', sets: 5, reps: 5, increment_kg: 2.5 },
  ],
  B: [
    { name: 'Squat',          sets: 5, reps: 5, increment_kg: 2.5 },
    { name: 'Overhead Press', sets: 5, reps: 5, increment_kg: 2.5 },
    { name: 'Deadlift',       sets: 1, reps: 5, increment_kg: 5   },
  ],
};

export const KB_EXERCISES = [
  'OH Russian Swing',
  'TH Russian Swing',
  'Snatch',
  'Clean & Jerk',
  'Shoulder Press',
  'OH Row',
  'TH Row',
  'Gorilla Row',
  'Lunges',
  'Reverse Lunges',
  'Clean',
  'Goblet Squat',
  'Deadlift',
  'Turkish Get-Up',
  'Windmill',
];

export const BB_EXERCISES = [
  'Incline Bench Press',
  'Curls',
];

export const DB_EXERCISES = [
  'DB Bench Press',
  'DB Incline Bench Press',
  'Pullovers',
  'DB Overhead Press',
  'Lateral Raises',
  'Rear Delt Flyes',
  'Hammer Curls',
  'Overhead Tricep Extensions',
  'DB Skull Crushers',
];

export async function getSetting(key, defaultVal) {
  const row = await db.settings.get(key);
  return row !== undefined ? row.value : defaultVal;
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value });
}

export async function getLastOfType(type) {
  const all = await db.strength_sessions.where('type').equals(type).toArray();
  return all.length ? all[all.length - 1] : null;
}

export interface LoginRequest {
  username: string;
}

export interface LoginResponse {
  username: string;
}

export interface WorkoutsResponse<TWorkout = unknown> {
  workouts: TWorkout[];
}

export interface SessionsResponse<TSession = unknown> {
  sessions: TSession[];
}

export interface ImportRequest<TWorkout = unknown, TSession = unknown> {
  workouts: TWorkout[];
  sessions: TSession[];
}

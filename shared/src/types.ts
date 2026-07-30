export type AuthUser = {
  id: number;
  full_name: string;
  email: string;
  farm_name: string | null;
  region: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

export type Farm = {
  id: number;
  name: string;
  region: string | null;
  owner_name: string | null;
};

export type CampSummary = {
  id: number;
  name: string;
  region: string | null;
  area_ha: number | null;
  cattle_count: number;
  goat_count: number;
  sheep_count: number;
  latest_status: string | null;
  latest_confidence: string | null;
};

export type Camp = {
  id: number;
  farm_id: number;
  name: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  area_ha: number | null;
  cattle_count: number;
  goat_count: number;
  sheep_count: number;
  other_livestock: string | null;
  grazing_start_date: string | null;
  rotational_grazing: boolean;
  observations: string | null;
};

export type Weather = {
  available: boolean;
  rainfall_7d_mm: number | null;
  rainfall_14d_mm: number | null;
  rainfall_30d_mm: number | null;
  rainfall_forecast_7d_mm: number | null;
  current_temp_c: number | null;
  forecast_max_temp_c: number | null;
  note: string | null;
};

export type Reference = {
  plot_name: string;
  site_name: string | null;
  ecoregion: string | null;
  distance_km: number | null;
  comparability: string;
  grass_cover_pct: number | null;
  bare_ground_pct: number | null;
  woody_cover_pct: number | null;
  standing_crop_estimate: number | null;
  dominant_herbaceous: string | null;
  dominant_woody: string | null;
};

export type Assessment = {
  id: number;
  camp_id: number;
  status: string;
  direct_answer: string | null;
  recommendation: string | null;
  confidence: string | null;
  reasons: string[];
  evidence: string[];
  limitations: string[];
  next_steps: string[];
  herd_snapshot: Record<string, unknown>;
  weather_snapshot: Weather & Record<string, unknown>;
  references: Reference[];
  photo_findings: Record<string, unknown>[];
  calculations: Record<string, unknown>;
  question: string | null;
  created_at: string;
};

export type Photo = {
  id: number;
  direction: string;
  filename: string;
  assessment_id: number | null;
  analysis: Record<string, unknown> | null;
  created_at: string | null;
};

export type CoverRound = {
  round: string;
  grass_cover_pct: number | null;
  bare_ground_pct: number | null;
  woody_cover_pct: number | null;
};

export type PlotDetail = {
  plot: Record<string, unknown> | null;
  cover_rounds: CoverRound[];
};

export type ChatReply = {
  reply: string;
  tools_used: string[];
};

export type CompareResult = {
  camps: Record<string, unknown>[];
  conclusion: string;
  tools_used: string[];
};

export type RegisterBody = {
  full_name: string;
  email: string;
  password: string;
  farm_name?: string;
  region?: string;
};

export type AssessmentBody = {
  camp_id: number;
  herd?: Record<string, unknown>;
  photo_ids?: number[];
  question?: string;
};

export type ChatBody = {
  farm_id?: number;
  camp_id?: number;
  message: string;
  history?: unknown[];
};

export type PhotoDirection = "general" | "north" | "east" | "south" | "west";

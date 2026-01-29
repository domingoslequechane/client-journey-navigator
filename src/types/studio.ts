export interface StudioProject {
  id: string;
  organization_id: string;
  created_by: string;
  name: string;
  description: string | null;
  niche: string | null;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  ai_instructions: string | null;
  ai_restrictions: string | null;
  logo_images: string[];
  reference_images: string[];
  template_image: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudioFlyer {
  id: string;
  project_id: string;
  organization_id: string;
  created_by: string;
  prompt: string;
  image_url: string;
  size: string;
  style: string;
  niche: string | null;
  model: string;
  generation_mode: string;
  created_at: string;
}

export interface StudioFlyerRating {
  id: string;
  flyer_id: string;
  user_id: string;
  rating: number;
  feedback: string | null;
  created_at: string;
}

export interface StudioAILearning {
  id: string;
  project_id: string;
  user_id: string;
  learning_type: 'preference' | 'correction' | 'style' | 'feedback';
  content: string;
  context: string | null;
  created_at: string;
}

export type GenerationMode = 'original' | 'copy' | 'inspiration' | 'template';

export interface GenerationSettings {
  prompt: string;
  size: string;
  style: 'vivid' | 'natural';
  mode: GenerationMode;
  model: 'gemini-flash' | 'gemini-pro';
}

export interface DraftFile {
  id: string;
  file: File;
  description?: string;
  url?: string;
  embed?: boolean;
  is_thumbnail?: boolean;
  spoiler?: boolean;
  duration_secs?: number;
}

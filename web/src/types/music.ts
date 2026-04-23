export interface MusicTrack {
  id: string;
  publicId: string;
  title: string;
  country: string;
  mood: string;
  duration: number;
  url: string;
  coverImage: string | null;
  waveformImage: string | null;
  tags: string[];
  bytes: number;
  format: string;
  normalizedGain: number;
}

export interface MusicCatalogFilters {
  country?: string;
  mood?: string;
  tag?: string;
}

export interface MusicCatalog {
  items: MusicTrack[];
  countries: string[];
  moods: string[];
  tags: string[];
  generatedAt: string;
}

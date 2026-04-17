export enum UserRole {
  PUBLIC = 'PUBLIC',
  ADMIN = 'ADMIN', // Owner
  STAFF = 'STAFF', // Crew
  CLIENT = 'CLIENT',
}

export type ProjectCategory =
  | 'Commercial'
  | 'Documentary'
  | 'Sports'
  | 'Fashion'
  | 'Retail'
  | 'Civic'
  | 'Spec';

export type GalleryAspect = 'video' | 'portrait' | 'square' | 'wide';

export interface VideoProjectGalleryItem {
  src: string;
  caption?: string;
  aspect: GalleryAspect;
}

export interface VideoProjectCredit {
  label: string;
  value: string;
}

export interface VideoProject {
  id: string;
  slug: string;
  title: string;
  client: string;
  year: string;
  category: ProjectCategory;
  tags: string[];
  aspectRatio: 'video' | 'portrait' | 'square';
  thumbnail: string;
  heroImage: string;
  logline: string;
  role: string;
  location?: string;
  deliverables: string[];
  gallery: VideoProjectGalleryItem[];
  credits: VideoProjectCredit[];
}

export interface Invoice {
  id: string;
  client: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
}

export interface Shoot {
  id: string;
  title: string;
  date: string;
  location: string;
  crew: string[];
}

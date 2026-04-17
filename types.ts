export enum UserRole {
  PUBLIC = 'PUBLIC',
  ADMIN = 'ADMIN', // Owner
  STAFF = 'STAFF', // Crew
  CLIENT = 'CLIENT',
}

export interface VideoProject {
  id: string;
  title: string;
  client: string;
  year: string;
  thumbnail: string;
  aspectRatio: 'video' | 'portrait' | 'square';
  tags: string[];
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

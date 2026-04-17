import { VideoProject, Invoice, Shoot } from './types';

export const HERO_VIDEO_FALLBACK = "https://images.unsplash.com/photo-1535016120720-40c6874c3b1c?q=80&w=2664&auto=format&fit=crop";

export const PROJECTS: VideoProject[] = [
  {
    id: '1',
    title: 'Neon Drift',
    client: 'Red Bull',
    year: '2024',
    thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1000&auto=format&fit=crop',
    aspectRatio: 'video',
    tags: ['Commercial', 'Auto'],
  },
  {
    id: '2',
    title: 'Urban Flow',
    client: 'Nike',
    year: '2024',
    thumbnail: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=1000&auto=format&fit=crop',
    aspectRatio: 'portrait',
    tags: ['Social', 'Lifestyle'],
  },
  {
    id: '3',
    title: 'The Architect',
    client: 'AD',
    year: '2023',
    thumbnail: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=1000&auto=format&fit=crop',
    aspectRatio: 'video',
    tags: ['Doc', 'Design'],
  },
  {
    id: '4',
    title: 'Silk & Stone',
    client: 'Vogue',
    year: '2023',
    thumbnail: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?q=80&w=1000&auto=format&fit=crop',
    aspectRatio: 'portrait',
    tags: ['Fashion', 'Vertical'],
  },
  {
    id: '5',
    title: 'Origins',
    client: 'Aesop',
    year: '2023',
    thumbnail: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4f9d?q=80&w=1000&auto=format&fit=crop',
    aspectRatio: 'square',
    tags: ['Product', 'Clean'],
  },
  {
    id: '6',
    title: 'Velocity',
    client: 'Porsche',
    year: '2024',
    thumbnail: 'https://images.unsplash.com/photo-1503376763036-066120622c74?q=80&w=1000&auto=format&fit=crop',
    aspectRatio: 'video',
    tags: ['Auto', 'Cinematic'],
  },
];

export const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-2024-001', client: 'Red Bull', amount: 12500, status: 'paid', date: '2024-02-15' },
  { id: 'INV-2024-002', client: 'Nike', amount: 8400, status: 'pending', date: '2024-03-01' },
  { id: 'INV-2024-003', client: 'Porsche', amount: 24000, status: 'overdue', date: '2024-01-20' },
];

export const MOCK_SCHEDULE: Shoot[] = [
  { id: 'S-01', title: 'Nike Summer Campaign', date: 'Mar 12, 08:00 AM', location: 'Downtown LA Studio 4', crew: ['Sarah', 'Mike', 'Davide'] },
  { id: 'S-02', title: 'Porsche Track Day', date: 'Mar 15, 06:00 AM', location: 'Willow Springs', crew: ['Davide', 'Jessica'] },
];

export const TRUST_LOGOS = [
  "NIKE", 
  "JORDAN Brand", 
  "Franklin County", 
  "Ransom Supply", 
  "Sole Classics", 
  "Maurice Clarett", 
  "Columbus Crew", 
  "Kingdom Image Arts"
];
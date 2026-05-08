import { describe, expect, it } from 'vitest';
import { firestoreDataToVideoProject } from './portfolioLandingRepository';

describe('firestoreDataToVideoProject', () => {
  it('maps valid document data', () => {
    const vp = firestoreDataToVideoProject('doc1', {
      slug: 'crew-after-dark',
      title: 'Crew After Dark',
      client: 'Columbus Crew',
      year: '2024',
      category: 'Sports',
      tags: ['Match Day'],
      aspectRatio: 'video',
      thumbnail: 'https://example.com/t.jpg',
      heroImage: 'https://example.com/h.jpg',
      logline: 'Story',
      role: 'Edit',
      location: 'Columbus',
      deliverables: ['Hero cut'],
      gallery: [{ src: 'https://example.com/g.jpg', aspect: 'wide', caption: 'Cap' }],
      credits: [{ label: 'Director', value: 'TORP' }],
    });
    expect(vp).not.toBeNull();
    expect(vp!.id).toBe('doc1');
    expect(vp!.slug).toBe('crew-after-dark');
    expect(vp!.gallery).toHaveLength(1);
    expect(vp!.credits).toHaveLength(1);
  });

  it('returns null without slug or title', () => {
    expect(firestoreDataToVideoProject('id', { slug: '', title: 'T' })).toBeNull();
    expect(firestoreDataToVideoProject('id', { slug: 's', title: '' })).toBeNull();
  });

  it('sanitizes invalid category', () => {
    const vp = firestoreDataToVideoProject('d', {
      slug: 'x',
      title: 'X',
      category: 'Not real',
      tags: [],
      aspectRatio: 'bogus',
      thumbnail: '',
      heroImage: '',
      logline: '',
      role: '',
      deliverables: [],
      gallery: [],
      credits: [],
      client: '',
      year: '',
    });
    expect(vp!.category).toBe('Spec');
    expect(vp!.aspectRatio).toBe('video');
  });
});

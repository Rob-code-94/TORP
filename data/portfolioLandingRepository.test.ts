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

  it('maps featured video and gallery mediaType', () => {
    const vp = firestoreDataToVideoProject('doc2', {
      slug: 'reel',
      title: 'Reel',
      client: 'Client',
      year: '2024',
      category: 'Brand',
      tags: [],
      aspectRatio: 'video',
      thumbnail: 'https://example.com/t.jpg',
      featuredVideoUrl: 'https://example.com/hero.mp4',
      heroImage: 'https://example.com/h.jpg',
      logline: '',
      role: '',
      deliverables: [],
      gallery: [{ src: 'https://example.com/film.mp4', aspect: 'video', mediaType: 'video' }],
      credits: [],
    });
    expect(vp!.featuredVideoUrl).toBe('https://example.com/hero.mp4');
    expect(vp!.gallery[0]!.mediaType).toBe('video');
  });

  it('defaults gallery mediaType to video when omitted', () => {
    const vp = firestoreDataToVideoProject('doc3', {
      slug: 'reel-2',
      title: 'Reel 2',
      client: '',
      year: '',
      category: 'Spec',
      tags: [],
      aspectRatio: 'video',
      thumbnail: '',
      heroImage: '',
      logline: '',
      role: '',
      deliverables: [],
      gallery: [{ src: 'https://example.com/v.mp4', aspect: 'square' }],
      credits: [],
    });
    expect(vp!.gallery[0]!.mediaType).toBe('video');
  });

  it('maps fullFilmUrl', () => {
    const vp = firestoreDataToVideoProject('doc4', {
      slug: 'gracelynn',
      title: 'Gracelynn',
      client: '',
      year: '2024',
      category: 'Documentary',
      tags: [],
      aspectRatio: 'portrait',
      thumbnail: '',
      heroImage: '',
      fullFilmUrl: 'https://vimeo.com/123456',
      logline: '',
      role: '',
      deliverables: [],
      gallery: [],
      credits: [],
    });
    expect(vp!.fullFilmUrl).toBe('https://vimeo.com/123456');
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

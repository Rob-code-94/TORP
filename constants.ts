import { VideoProject, Invoice, Shoot, ProjectCategory } from './types';

export const HERO_VIDEO_FALLBACK =
  'https://images.unsplash.com/photo-1535016120720-40c6874c3b1c?q=80&w=2664&auto=format&fit=crop';

/** Card thumbnails — Retina-friendly */
const thumb = (path: string) =>
  `https://images.unsplash.com/${path}?q=85&w=1800&auto=format&fit=crop`;

/** Detail heroes + key stills */
const hero = (path: string) =>
  `https://images.unsplash.com/${path}?q=90&w=2400&auto=format&fit=crop`;

const still = (path: string) =>
  `https://images.unsplash.com/${path}?q=85&w=1800&auto=format&fit=crop`;

export const WORK_CATEGORY_FILTERS: Array<'All' | ProjectCategory> = [
  'All',
  'Commercial',
  'Sports',
  'Documentary',
  'Fashion',
  'Retail',
  'Civic',
  'Spec',
];

export const PROJECTS: VideoProject[] = [
  {
    id: '1',
    slug: 'crew-after-dark',
    title: 'Crew After Dark',
    client: 'Columbus Crew',
    year: '2024',
    category: 'Sports',
    tags: ['Match Day', 'Broadcast'],
    aspectRatio: 'video',
    thumbnail: thumb('photo-1461896836934-ffe607ba8211'),
    heroImage: hero('photo-1461896836934-ffe607ba8211'),
    logline:
      'A kinetic match-night film built from tunnel energy, crowd roar, and the moment the pitch goes electric under the lights.',
    role: 'Production & edit',
    location: 'Lower.com Field, Columbus, OH',
    deliverables: ['90s hero cut', '6× vertical socials', 'Stadium board loop'],
    gallery: [
      { src: still('photo-1519501025264-65ba15a82390'), aspect: 'wide', caption: 'Tunnel sequence' },
      { src: still('photo-1514565131-fce0801e5785'), aspect: 'video', caption: 'Pitch wide' },
      { src: still('photo-1449824913935-59a10b8d2000'), aspect: 'video', caption: 'Crowd heat' },
      { src: still('photo-1540497077202-7c8a3999166f'), aspect: 'square', caption: 'Locker still' },
    ],
    credits: [
      { label: 'Director', value: 'TORP' },
      { label: 'DP', value: 'TORP' },
      { label: 'Editor', value: 'TORP' },
      { label: 'Colorist', value: 'TORP' },
      { label: 'Producer', value: 'TORP' },
    ],
  },
  {
    id: '2',
    slug: 'clarett-ohio',
    title: 'Clarett: Ohio',
    client: 'Maurice Clarett',
    year: '2024',
    category: 'Documentary',
    tags: ['Portrait', 'Long-form'],
    aspectRatio: 'portrait',
    thumbnail: thumb('photo-1571019613454-1cb2f99b2d8b'),
    heroImage: hero('photo-1571019613454-1cb2f99b2d8b'),
    logline:
      'Intimate vertical frames that hold space for legacy, discipline, and the weight of a second act.',
    role: 'Director & cinematography',
    location: 'Columbus, OH',
    deliverables: ['12 min doc cut', 'Trailer', 'Stills package'],
    gallery: [
      { src: still('photo-1517836357463-d25dfeac3438'), aspect: 'portrait', caption: 'Training' },
      { src: still('photo-1540497077202-7c8a3999166f'), aspect: 'portrait', caption: 'Portrait' },
      { src: still('photo-1517836357463-d25dfeac3438'), aspect: 'video', caption: 'Gym floor' },
      { src: still('photo-1540497077202-7c8a3999166f'), aspect: 'square', caption: 'Detail' },
    ],
    credits: [
      { label: 'Director', value: 'TORP' },
      { label: 'DP', value: 'TORP' },
      { label: 'Editor', value: 'TORP' },
      { label: 'Colorist', value: 'TORP' },
      { label: 'Producer', value: 'TORP' },
    ],
  },
  {
    id: '3',
    slug: 'sole-classics-floor-2',
    title: 'Sole Classics — Floor 2',
    client: 'Sole Classics',
    year: '2024',
    category: 'Retail',
    tags: ['Lookbook', 'Retail'],
    aspectRatio: 'square',
    thumbnail: thumb('photo-1552346154-21d32810aba3'),
    heroImage: hero('photo-1552346154-21d32810aba3'),
    logline:
      'Shelf-to-street storytelling for a new floor launch — texture, silhouette, and brand rhythm in every rack pull.',
    role: 'Creative direction & capture',
    location: 'Sole Classics, Columbus, OH',
    deliverables: ['45s hero', 'Still set', 'Paid social cutdowns'],
    gallery: [
      { src: still('photo-1549298916-b41d501d3772'), aspect: 'square', caption: 'Product hero' },
      { src: still('photo-1608231387042-66d1773070a5'), aspect: 'video', caption: 'Floor walk' },
      { src: still('photo-1595950653106-6c9ebd614d3a'), aspect: 'square', caption: 'Detail macro' },
      { src: still('photo-1549298916-b41d501d3772'), aspect: 'portrait', caption: 'Fit' },
    ],
    credits: [
      { label: 'Director', value: 'TORP' },
      { label: 'DP', value: 'TORP' },
      { label: 'Editor', value: 'TORP' },
      { label: 'Colorist', value: 'TORP' },
      { label: 'Producer', value: 'TORP' },
    ],
  },
  {
    id: '4',
    slug: 'jordan-blacktop',
    title: 'Jordan: Blacktop',
    client: 'Jordan Brand',
    year: '2024',
    category: 'Commercial',
    tags: ['Basketball', 'Commercial'],
    aspectRatio: 'video',
    thumbnail: thumb('photo-1546519638-68e109498ffc'),
    heroImage: hero('photo-1546519638-68e109498ffc'),
    logline:
      'High-contrast blacktop energy — hand speed, chain nets, and the sound of summer in every cut.',
    role: 'Production',
    location: 'Chicago, IL',
    deliverables: ['60s master', '15s spots', '9×16 social suite'],
    gallery: [
      { src: still('photo-1546519638-68e109498ffc'), aspect: 'video', caption: 'Court wide' },
      { src: still('photo-1476480862126-209bfaa8edc8'), aspect: 'wide', caption: 'Sun flare' },
      { src: still('photo-1521572163474-6864f9cf17ab'), aspect: 'square', caption: 'Ball detail' },
      { src: still('photo-1461896836934-ffe607ba8211'), aspect: 'video', caption: 'Night run' },
    ],
    credits: [
      { label: 'Director', value: 'TORP' },
      { label: 'DP', value: 'TORP' },
      { label: 'Editor', value: 'TORP' },
      { label: 'Colorist', value: 'TORP' },
      { label: 'Producer', value: 'TORP' },
    ],
  },
  {
    id: '5',
    slug: 'franklin-county-we-are',
    title: 'Franklin County: We Are',
    client: 'Franklin County',
    year: '2023',
    category: 'Civic',
    tags: ['Brand Film', 'Community'],
    aspectRatio: 'video',
    thumbnail: thumb('photo-1449824913935-59a10b8d2000'),
    heroImage: hero('photo-1449824913935-59a10b8d2000'),
    logline:
      'A civic brand piece that threads courthouse glass, neighborhood blocks, and the people who hold the county together.',
    role: 'Production & post',
    location: 'Franklin County, OH',
    deliverables: ['3 min anthem', '30s cutdowns', 'VO + captions'],
    gallery: [
      { src: still('photo-1449824913935-59a10b8d2000'), aspect: 'wide', caption: 'Skyline' },
      { src: still('photo-1480714378408-67cf0d13bc1b'), aspect: 'video', caption: 'Street level' },
      { src: still('photo-1514565131-fce0801e5785'), aspect: 'video', caption: 'Civic detail' },
      { src: still('photo-1519501025264-65ba15a82390'), aspect: 'square', caption: 'Portrait B-roll' },
    ],
    credits: [
      { label: 'Director', value: 'TORP' },
      { label: 'DP', value: 'TORP' },
      { label: 'Editor', value: 'TORP' },
      { label: 'Colorist', value: 'TORP' },
      { label: 'Producer', value: 'TORP' },
    ],
  },
  {
    id: '6',
    slug: 'ransom-fw25',
    title: 'Ransom FW25',
    client: 'Ransom Supply',
    year: '2024',
    category: 'Fashion',
    tags: ['Lookbook', 'Campaign'],
    aspectRatio: 'portrait',
    thumbnail: thumb('photo-1521572163474-6864f9cf17ab'),
    heroImage: hero('photo-1521572163474-6864f9cf17ab'),
    logline:
      'FW25 captured as editorial motion — drape, shadow, and negative space as loud as the garments.',
    role: 'Creative & cinematography',
    location: 'Studio, Columbus, OH',
    deliverables: ['Campaign hero', 'Lookbook stills', 'Paid social'],
    gallery: [
      { src: still('photo-1490481651871-ab68de25d43d'), aspect: 'portrait', caption: 'Look 1' },
      { src: still('photo-1521572163474-6864f9cf17ab'), aspect: 'portrait', caption: 'Rack' },
      { src: still('photo-1542291026-7eec264c27ff'), aspect: 'square', caption: 'Texture' },
      { src: still('photo-1519501025264-65ba15a82390'), aspect: 'video', caption: 'Runway' },
    ],
    credits: [
      { label: 'Director', value: 'TORP' },
      { label: 'DP', value: 'TORP' },
      { label: 'Editor', value: 'TORP' },
      { label: 'Colorist', value: 'TORP' },
      { label: 'Producer', value: 'TORP' },
    ],
  },
  {
    id: '7',
    slug: 'kingdom-frames',
    title: 'Kingdom Frames',
    client: 'Kingdom Image Arts',
    year: '2023',
    category: 'Commercial',
    tags: ['Collab', 'Print'],
    aspectRatio: 'square',
    thumbnail: thumb('photo-1516035069371-29a1b244cc32'),
    heroImage: hero('photo-1516035069371-29a1b244cc32'),
    logline:
      'A print-forward collaboration where glass, grain, and patience meet — stills that feel like cinema paused mid-breath.',
    role: 'Director of photography',
    location: 'Columbus, OH',
    deliverables: ['Stills series', 'BTS film', 'Gallery loop'],
    gallery: [
      { src: still('photo-1502920917128-1aa500764cbd'), aspect: 'square', caption: 'Darkroom' },
      { src: still('photo-1452587925148-ce544e77e70d'), aspect: 'video', caption: 'Lens table' },
      { src: still('photo-1452587925148-ce544e77e70d'), aspect: 'wide', caption: 'Studio wide' },
      { src: still('photo-1516035069371-29a1b244cc32'), aspect: 'portrait', caption: 'Hand & camera' },
    ],
    credits: [
      { label: 'Director', value: 'TORP' },
      { label: 'DP', value: 'TORP' },
      { label: 'Editor', value: 'TORP' },
      { label: 'Colorist', value: 'TORP' },
      { label: 'Producer', value: 'TORP' },
    ],
  },
  {
    id: '8',
    slug: 'nike-silver-hour',
    title: 'Nike: Silver Hour',
    client: 'Nike',
    year: '2024',
    category: 'Commercial',
    tags: ['Running', 'Commercial'],
    aspectRatio: 'video',
    thumbnail: thumb('photo-1476480862126-209bfaa8edc8'),
    heroImage: hero('photo-1476480862126-209bfaa8edc8'),
    logline:
      'Silver-hour miles — breath, asphalt, and the quiet confidence of a runner owning the frame.',
    role: 'Production',
    location: 'Portland, OR',
    deliverables: ['45s hero', '6× vertical', 'Stills'],
    gallery: [
      { src: still('photo-1476480862126-209bfaa8edc8'), aspect: 'video', caption: 'Road' },
      { src: still('photo-1449824913935-59a10b8d2000'), aspect: 'wide', caption: 'Silhouette' },
      { src: still('photo-1542291026-7eec264c27ff'), aspect: 'square', caption: 'Shoe' },
      { src: still('photo-1514565131-fce0801e5785'), aspect: 'portrait', caption: 'Stride' },
    ],
    credits: [
      { label: 'Director', value: 'TORP' },
      { label: 'DP', value: 'TORP' },
      { label: 'Editor', value: 'TORP' },
      { label: 'Colorist', value: 'TORP' },
      { label: 'Producer', value: 'TORP' },
    ],
  },
  {
    id: '9',
    slug: 'velocity-spec',
    title: 'Velocity (Spec)',
    client: 'TORP Original',
    year: '2025',
    category: 'Spec',
    tags: ['Auto', 'Cinematic'],
    aspectRatio: 'portrait',
    thumbnail: thumb('photo-1494905998402-395d579af36f'),
    heroImage: hero('photo-1494905998402-395d579af36f'),
    logline:
      'An internal reel exercise — velocity as light trails, chrome, and the hum between gears.',
    role: 'Creative direction',
    location: 'Columbus, OH',
    deliverables: ['90s spec cut', 'Sound design pass', 'Color bible'],
    gallery: [
      { src: still('photo-1502877338535-766e1452684a'), aspect: 'video', caption: 'Night drive' },
      { src: still('photo-1494905998402-395d579af36f'), aspect: 'wide', caption: 'Highway' },
      { src: still('photo-1452587925148-ce544e77e70d'), aspect: 'square', caption: 'Detail' },
      { src: still('photo-1514565131-fce0801e5785'), aspect: 'portrait', caption: 'Headlight' },
    ],
    credits: [
      { label: 'Director', value: 'TORP' },
      { label: 'DP', value: 'TORP' },
      { label: 'Editor', value: 'TORP' },
      { label: 'Colorist', value: 'TORP' },
      { label: 'Producer', value: 'TORP' },
    ],
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
  'NIKE',
  'JORDAN Brand',
  'Franklin County',
  'Ransom Supply',
  'Sole Classics',
  'Maurice Clarett',
  'Columbus Crew',
  'Kingdom Image Arts',
];

# Landing portfolio media

Public **marketing** portfolio (Selected Works + case studies) is separate from HQ operational projects. Metadata lives in Firestore `tenants/{marketingTenantId}/portfolioProjects` (default `torp-default`, override with `VITE_MARKETING_TENANT_ID`); files live in Firebase Storage under `public/portfolio/{assetId}/`.

HQ and the public site always read/write the **same marketing tenant** — not the signed-in JWT tenant. On first load after this fix, HQ may auto-merge media that was previously saved under your JWT tenant into the marketing tenant (matching slugs).

## Where each field appears

| HQ field | Shows on public site |
|----------|----------------------|
| **Thumbnail** | Selected Works grid (at rest) + Next project card — **required for fast mobile load** |
| **Featured video** | Selected Works hover preview + case-study hero |
| **Hero poster** | Case-study hero fallback (when no featured video frame) |
| **Films (gallery)** | Case-study Films section only — never the grid |
| **Card aspect** | Selected Works card shape: Horizontal (16:9), Vertical (9:16), or Square (1:1) |

## Size policy

| Type | Hard max | Soft warn |
|------|----------|-----------|
| Images (poster) | 80 MB | — |
| Video (featured, Films) | **500 MB** | **200 MB** (upload succeeds; UI shows amber hint) |

- **Soft warn (200 MB):** Upload continues. HQ shows an amber message recommending a shorter H.264 export for grid/hero playback.
- **Hard max (500 MB):** Browser rejects the file before upload starts. Compress with ffmpeg or host the full master on Vimeo/YouTube and use **Watch full film** (`fullFilmUrl`).
- **Start / Loop end (sec):** Controls which segment loops on the public site only. It does **not** reduce upload size — the full file is still stored and transferred.

Files over 500 MB are rejected in the browser. Compress with ffmpeg or host the full master on Vimeo/YouTube and use **Watch full film** (`fullFilmUrl`).

## Formats

| Asset | Field | Format | Shows on |
|-------|--------|--------|----------|
| Card poster | `thumbnail` | JPEG, PNG, WebP, GIF — **optional**; without it, grid shows a clear paused frame from the featured video until hover (then it plays) | Selected Works grid + Next project |
| Hero poster | `heroImage` | Same — optional when featured video is set | Case-study hero fallback |
| Featured reel | `featuredVideoUrl` | MP4, MOV, WebM (H.264 recommended) — grid hover + case-study hero | Selected Works hover + case-study hero |
| Featured loop | `featuredVideoStartSeconds`, `featuredVideoEndSeconds` | Optional segment (e.g. start `5`, end `25`) loops that range on grid hover and hero; omit end to loop from start to EOF | Grid + hero playback only |
| Films | `gallery[].src` | Video URL (`mediaType: video`) | Case-study Films only |
| Full master | `fullFilmUrl` | External Vimeo/YouTube only | Watch full film link |

### Featured reel segment

Set **Start (sec)** and optional **Loop end (sec)** on the featured video in HQ or inline edit (`/?marketingEdit=1`). Grid hover and the case-study hero seek to the start frame at rest, then loop the segment (start → end). Leave loop end empty to play from start through the end of the file and repeat. Start `0` with no end matches full-file loop behavior.

## Admin workflow

1. **HQ → Settings → Org → Landing portfolio** → **Seed 12 showcase** (creates marketing case studies; not tied to HQ projects).
2. Per row: upload **Thumbnail**, **Hero poster**, **Featured video**, optional **Films**, optional **Watch full film** URL → **Save**.
3. Stay on the page until the upload progress bar reaches 100% and shows success — large files (400 MB+) can take many minutes.
4. Reload `/` — grid loads from Firestore.
5. Optional inline edit: `/?marketingEdit=1#landing-selected-works` → **Poster** / **Preview** per card.

## Media Assets → portfolio slug map

Primary source folder (ArmorATD volume):

`/Volumes/ArmorATD/T.O.R.P/Media Assets Original`

Legacy path (also valid for local exports):

`/Users/cherobinson/T.O.R.P/Media Assets`

| Source file | Slug |
|-------------|------|
| The Crew.01.mov | `crew-after-dark` |
| SoleClassics.HeGotGame (1).mp4 | `sole-classics-he-got-game` |
| A.TORP.Collection.01.mov | `torp-collection` |
| Fihp.Co.JP.01.mov | `fihp-co-jp` |
| Fihp.Co.Run.Kollin.01.mov | `fihp-co-run-kollin` |
| Fihp.Morning.Vert (1).mov | `fihp-morning-vert` |
| A.Night.With.Our.Buds.01.25.mp4 | `a-night-with-our-buds` |
| Destany.Gym.Shark.Draft.02.mov | `destany-gymshark` |
| Don.Life.Car.Draft.03 (1).mov | `don-life-car` |
| Gracelynn.mov | `gracelynn` |
| UL.SKY.LIMIT.JOHN.01 (1).mov | `ul-sky-limit-john` |
| ULTD.Debo (1).mov | `ultd-debo` |

## ffmpeg batch export

Each slug produces four files in `torp-web-exports/`:

| File | Use | Target size |
|------|-----|-------------|
| `{slug}-poster.jpg` | Hero poster (`heroImage`) | Full-res frame @ 2s |
| `{slug}-thumb.jpg` | Grid thumbnail (`thumbnail`) | Max 1280px wide JPEG |
| `{slug}-hero.mp4` | Featured reel (`featuredVideoUrl`) | **15s**, 720p H.264, no audio, faststart (~3–8 MB) |
| `{slug}-film.mp4` | Films gallery slot | 75s H.264 with audio |

Run all 12 from ArmorATD masters:

```bash
chmod +x scripts/batch-export-portfolio-armoratd.sh
./scripts/batch-export-portfolio-armoratd.sh
```

Single file:

```bash
chmod +x scripts/export-portfolio-hero.sh
./scripts/export-portfolio-hero.sh "/Volumes/ArmorATD/T.O.R.P/Media Assets Original/Fihp.Co.Run.Kollin.01.mov" fihp-co-run-kollin
```

## Batch upload to Firebase

After exports finish, upload Storage files and patch Firestore (requires service account):

```bash
TORP_ALLOW_PORTFOLIO_UPLOAD=true \
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json \
node scripts/upload-portfolio-exports.mjs
```

Optional: `EXPORTS_DIR=...` `TORP_MARKETING_TENANT_ID=torp-default`

Maps `{slug}-thumb.jpg` → `thumbnail`, `{slug}-poster.jpg` → `heroImage`, `{slug}-hero.mp4` → `featuredVideoUrl`, `{slug}-film.mp4` → first gallery video when empty.

Legacy manual upload: `{slug}-poster.jpg` to Thumbnail + Hero poster, `{slug}-hero.mp4` to Featured video, `{slug}-film.mp4` to Films.

For masters over 500 MB (e.g. Gracelynn.mov, Don Life): export short web cuts only; upload full piece to Vimeo and paste URL in **Watch full film**.

## Inline Save

- ADMIN session required.
- **Save & publish** works from bundled fallback; Firestore not required beforehand.
- Portfolio rows are marketing-only — no link to HQ production projects.

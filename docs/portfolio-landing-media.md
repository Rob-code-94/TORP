# Landing portfolio media

Public **marketing** portfolio (Selected Works + case studies) is separate from HQ operational projects. Metadata lives in Firestore `portfolioProjects`; files live in Firebase Storage under `public/portfolio/{assetId}/`.

## Size policy

| Type | Hard max | Soft warn |
|------|----------|-----------|
| Images (poster) | 80 MB | — |
| Video (featured, Films) | **500 MB** | **200 MB** (upload succeeds; UI shows amber hint) |

Files over 500 MB are rejected in the browser. Compress with ffmpeg or host the full master on Vimeo/YouTube and use **Watch full film** (`fullFilmUrl`).

## Formats

| Asset | Field | Format |
|-------|--------|--------|
| Card poster | `thumbnail` | JPEG, PNG, WebP, GIF — **optional**; without it, grid shows a clear paused frame from the featured video until hover (then it plays) |
| Hero poster | `heroImage` | Same — optional when featured video is set |
| Featured reel | `featuredVideoUrl` | MP4, MOV, WebM (H.264 recommended) — grid hover + case-study hero |
| Featured loop | `featuredVideoStartSeconds`, `featuredVideoEndSeconds` | Optional segment (e.g. start `5`, end `25`) loops that range on grid hover and hero; omit end to loop from start to EOF |
| Films | `gallery[].src` | Video URL (`mediaType: video`) |
| Full master | `fullFilmUrl` | External Vimeo/YouTube only |

### Featured reel segment

Set **Start (sec)** and optional **Loop end (sec)** on the featured video in HQ or inline edit (`/?marketingEdit=1`). Grid hover and the case-study hero seek to the start frame at rest, then loop the segment (start → end). Leave loop end empty to play from start through the end of the file and repeat. Start `0` with no end matches full-file loop behavior.

## Admin workflow

1. **HQ → Settings → Org → Landing portfolio** → **Seed 12 showcase** (creates marketing case studies; not tied to HQ projects).
2. Per row: upload **Thumbnail**, **Hero poster**, **Featured video**, optional **Films**, optional **Watch full film** URL → **Save**.
3. Reload `/` — grid loads from Firestore.
4. Optional inline edit: `/?marketingEdit=1#landing-selected-works` → **Poster** / **Preview** per card.

## Media Assets → portfolio slug map

Local folder: `/Users/cherobinson/T.O.R.P/Media Assets`

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

```bash
SRC="/Users/cherobinson/T.O.R.P/Media Assets"
OUT="$HOME/Desktop/torp-portfolio-exports"
mkdir -p "$OUT"

export_one() {
  local IN="$1" BASE="$2"
  ffmpeg -y -i "$IN" -ss 00:00:02 -frames:v 1 -q:v 2 "$OUT/${BASE}-poster.jpg"
  ffmpeg -y -i "$IN" -t 25 -vf "scale=-2:1080" -c:v libx264 -preset slow -crf 23 -an -movflags +faststart "$OUT/${BASE}-hero.mp4"
  ffmpeg -y -i "$IN" -t 75 -vf "scale=-2:1080" -c:v libx264 -preset slow -crf 22 -c:a aac -b:a 128k -movflags +faststart "$OUT/${BASE}-film.mp4"
}

export_one "$SRC/The Crew.01.mov" "crew-after-dark"
# Repeat for each row in the table above with matching BASE slug.
```

Upload `${BASE}-poster.jpg` to Thumbnail + Hero poster, `${BASE}-hero.mp4` to Featured video, `${BASE}-film.mp4` to Films.

For masters over 500 MB (e.g. Gracelynn.mov, Don Life): export short web cuts only; upload full piece to Vimeo and paste URL in **Watch full film**.

## Inline Save

- ADMIN session required.
- **Save & publish** works from bundled fallback; Firestore not required beforehand.
- Portfolio rows are marketing-only — no link to HQ production projects.

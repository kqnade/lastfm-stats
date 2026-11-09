# Last.fm stats

Last.fm SVG cards, updated every six hours by GitHub Actions.

## Listening calendar

After the first successful update, embed the calendar in any GitHub README:

```markdown
![Last.fm listening activity](https://raw.githubusercontent.com/kqnade/lastfm-stats/main/output/calendar.svg)
```

The calendar covers today and the previous 364 calendar days. Each square is
one day; green intensity shows its scrobble count relative to the busiest day.
Unplayed days remain empty. The current day is partial.

The generator uses `user.getRecentTracks`, fetches all pages in a fixed time
window, and excludes the currently playing track. It rebuilds the full range
each run so old scrobble edits are reflected. Large histories take more API
requests (up to 200 scrobbles per page). API failures fail the workflow before
its commit step, preserving the previously published SVGs.

## Configuration

Set repository Actions secrets `LASTFM_API_KEY` and `LASTFM_USERNAME`.
The existing update workflow generates all four cards with `npm run generate`.
Run it manually with **Actions → Update Last.fm Stats → Run workflow**.
Scheduled workflows run from the default branch and may be delayed by GitHub.

| Environment variable | Default | Meaning |
| --- | --- | --- |
| `LASTFM_TIMEZONE` | `Asia/Tokyo` | IANA timezone used to group scrobbles by day |
| `LASTFM_THEME` | `dark` | `dark`, `light`, or `transparent` |
| `LASTFM_PERIOD` | `7day` | Period for the existing top-track and top-artist cards |

The calendar always covers 365 days, independently of `LASTFM_PERIOD`.
No additional API key or dependencies are needed.

## Development

```sh
npm ci
npm test
npx tsc --noEmit
npm run generate
```

API reference: https://www.last.fm/api/show/user.getRecentTracks

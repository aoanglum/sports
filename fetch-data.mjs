// Fetches ESPN data for each team and writes a trimmed data.json (run by GitHub Actions).
import { writeFileSync } from "node:fs";
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/";
const TEAMS = [
  ["football/nfl", 10], ["basketball/mens-college-basketball", 153], ["football/college-football", 153],
  ["hockey/nhl", 7], ["baseball/mlb", 27],
];
const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error(u + " " + r.status); return r.json(); };
const out = { updated: new Date().toISOString(), teams: {} };
for (const [path, id] of TEAMS) {
  const key = `${path}/${id}`;
  try {
    const [sch, nw] = await Promise.all([get(`${ESPN}${path}/teams/${id}/schedule`), get(`${ESPN}${path}/news?team=${id}&limit=3`)]);
    out.teams[key] = {
      team: { recordSummary: sch.team?.recordSummary, standingSummary: sch.team?.standingSummary },
      events: (sch.events || []).filter(e => e.competitions?.[0]).map(e => {
        const c = e.competitions[0];
        return { date: e.date, competitions: [{
          status: { type: { state: c.status?.type?.state, shortDetail: c.status?.type?.shortDetail } },
          competitors: c.competitors.map(x => ({ homeAway: x.homeAway, winner: x.winner, score: { displayValue: x.score?.displayValue ?? x.score },
            team: { id: x.team.id, shortDisplayName: x.team.shortDisplayName, displayName: x.team.displayName, abbreviation: x.team.abbreviation } })),
          broadcasts: (c.broadcasts || []).slice(0, 3).map(b => ({ media: { shortName: b.media?.shortName } })),
        }] };
      }),
      articles: (nw.articles || []).slice(0, 3).map(a => ({ headline: a.headline, links: { web: { href: a.links?.web?.href } } })),
    };
  } catch (e) { console.error("failed", key, e.message); }
}
if (!Object.keys(out.teams).length) { console.error("no data fetched; keeping old data.json"); process.exit(1); }
writeFileSync("data.json", JSON.stringify(out));
console.log("wrote data.json", JSON.stringify(out).length, "bytes");

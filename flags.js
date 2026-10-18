// Country flags next to institution and country names in tables, lists and chart labels (SVGs from flag-icons 7.2.3,
// MIT licence, in ./flags/). Codes are ISO 3166-1 alpha-2 from the institutions' registry locations. Hong Kong and Macau
// show their regional flags; Taiwan shows none. A code without a file shows nothing, so a name is never hidden.
const HAVE = new Set(('ae am ar at au bd be bg bn br ca ch cl cm cn co cy cz de dk dz ee eg es fi fr gb gh gr hk hr hu id ie il in iq ' +
  'ir is it jo jp kg kr kw kz lb li lk lu mo mt mx my ng nl no np nz om pe ph pk pl ps pt qa ro rs ru rw sa se sg si sk sy th tn tr ' +
  'ua us uz vn ye za').split(' '));
const code = cc => String(cc || '').toLowerCase();
export const flagSrc = cc => HAVE.has(code(cc)) ? `./flags/${code(cc)}.svg` : '';
export const flag = cc => HAVE.has(code(cc)) ? `<img class="flag" src="./flags/${code(cc)}.svg" alt="" width="16" height="12" loading="lazy" decoding="async">` : '';
// an institution's flag: the country of its first located registry address
export const teamFlag = team => flag(team?.locations?.find(l => l.countryCode)?.countryCode);
// the same for an institution known only by its name (the report's institution lists carry ROR ids that the institution
// records do not always hold, while the names match)
let nameTeams = null, byName = new Map();
export function nameFlag(teams, name) {
  if (nameTeams !== teams) {
    nameTeams = teams; byName = new Map();
    for (const x of teams || []) { const cc = x.locations?.find(l => l.countryCode)?.countryCode; if (cc && !byName.has(x.name)) byName.set(x.name, cc); }
  }
  return flag(byName.get(name));
}
// the same for an entry that names the institution records it merges (research signals: sourceIds)
let idTeams = null, byId = new Map();
export function idsFlag(teams, ids) {
  if (idTeams !== teams) {
    idTeams = teams; byId = new Map();
    for (const x of teams || []) { const cc = x.locations?.find(l => l.countryCode)?.countryCode; if (cc) byId.set(x.id, cc); }
  }
  for (const id of ids || []) if (byId.has(id)) return flag(byId.get(id));
  return '';
}

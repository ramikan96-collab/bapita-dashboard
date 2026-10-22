#!/usr/bin/env node
// Technical SEO gate for the Good Living Herzliya pages (Job 26): the 4 EN + 4 HE URLs,
// sitemap.xml and robots.txt, checked against one base URL. Exits 1 on any failure.
//
//   node scripts/seo-check.mjs [base] [--verbose]
//   node scripts/seo-check.mjs http://localhost:3000
//   node scripts/seo-check.mjs https://book.bapita.com --verbose
//
// Canonicals, hreflang and sitemap entries are always expected on https://book.bapita.com,
// whatever host is being checked: that is what the pages declare in production.

const args = process.argv.slice(2)
const verbose = args.includes('--verbose')
const base = (args.find((a) => !a.startsWith('--')) || 'https://book.bapita.com').replace(/\/$/, '')
const PROD = 'https://book.bapita.com'
const SLUG = 'good-living-herzeliya'
const BRAND = 'Good Living Herzliya'
const HERO_FILE = 'afe526d7-3.jpg'
const UNITS = ['', 'big-kasa', 'small-kasa', 'quiet-studio']

const pathOf = (lang, unit) => `/${SLUG}${lang === 'he' ? '/he' : ''}${unit ? `/${unit}` : ''}`
const PAGES = ['en', 'he'].flatMap((lang) => UNITS.map((unit) => ({ lang, unit, path: pathOf(lang, unit) })))

const all = (h, re) => [...h.matchAll(re)]
const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`, 'i')) || [])[1]
const decode = (s = '') =>
  s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const text = (s) => decode(s.replace(/<[^>]+>/g, '')).trim()

const failures = []
const rows = []

async function get(url, headers = {}) {
  const res = await fetch(url, { redirect: 'manual', headers })
  return { res, body: await res.text() }
}

function checkPage({ lang, unit, path }, res, h) {
  const r = {}
  const fail = (col, msg) => {
    r[col] = false
    failures.push(`${path}  [${col}] ${msg}`)
  }
  const pass = (col) => {
    if (r[col] !== false) r[col] = true
  }
  const expected = PROD + path
  const head = (h.match(/<head[^>]*>([\s\S]*?)<\/head>/) || ['', h])[1]
  const metas = all(head, /<meta [^>]*>/g).map((m) => m[0])
  const meta = (k) => {
    const t = metas.find((m) => attr(m, 'name') === k || attr(m, 'property') === k)
    return t ? decode(attr(t, 'content')) : undefined
  }
  const links = all(head, /<link [^>]*>/g).map((m) => m[0])

  // HTTP
  res.status === 200 ? pass('http') : fail('http', `HTTP ${res.status}${res.headers.get('location') ? ` -> ${res.headers.get('location')}` : ''}`)

  // <html lang dir>
  const html = (h.match(/<html[^>]*>/) || [''])[0]
  const wantDir = lang === 'he' ? 'rtl' : 'ltr'
  attr(html, 'lang') === lang && attr(html, 'dir') === wantDir
    ? pass('lang')
    : fail('lang', `html lang=${attr(html, 'lang')} dir=${attr(html, 'dir')}, want ${lang}/${wantDir}`)

  // title + description
  const titles = all(head, /<title[^>]*>([\s\S]*?)<\/title>/g).map((m) => text(m[1]))
  const title = titles[0] ?? ''
  titles.length === 1 && title.endsWith(`| ${BRAND}`) ? pass('title') : fail('title', `title "${title}" (${titles.length} tags)`)
  const description = meta('description')
  description ? pass('desc') : fail('desc', 'no meta description')

  // single H1
  const h1 = all(h, /<h1[\s>][\s\S]*?<\/h1>/g).map((m) => text(m[0]))
  h1.length === 1 && h1[0] ? pass('h1') : fail('h1', `${h1.length} H1: ${h1.join(' | ')}`)

  // self-canonical, absolute
  const canon = links.filter((l) => attr(l, 'rel') === 'canonical').map((l) => attr(l, 'href'))
  canon.length === 1 && canon[0] === expected ? pass('canon') : fail('canon', `canonical ${canon.join(', ') || 'none'}, want ${expected}`)

  // reciprocal hreflang en / he / x-default=EN
  const alt = Object.fromEntries(
    links.filter((l) => attr(l, 'rel') === 'alternate' && attr(l, 'hrefLang')).map((l) => [attr(l, 'hrefLang'), attr(l, 'href')]),
  )
  const want = { en: PROD + pathOf('en', unit), he: PROD + pathOf('he', unit), 'x-default': PROD + pathOf('en', unit) }
  const bad = Object.keys(want).filter((k) => alt[k] !== want[k])
  const extra = Object.keys(alt).filter((k) => !(k in want))
  !bad.length && !extra.length ? pass('hreflang') : fail('hreflang', `wrong ${[...bad, ...extra].map((k) => `${k}=${alt[k]}`).join(' ')}`)

  // no noindex, in the head or the header
  const robotsMeta = [meta('robots'), meta('googlebot'), res.headers.get('x-robots-tag')].filter(Boolean).join(' ')
  if (/noindex/i.test(robotsMeta)) fail('index', `noindex: ${robotsMeta}`)
  else pass('index')

  // JSON-LD
  const blocks = all(h, /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g).map((m) => m[1])
  const ld = []
  for (const b of blocks) {
    try {
      const j = JSON.parse(b)
      ld.push(...(Array.isArray(j) ? j : [j]))
    } catch (e) {
      fail('ld', `JSON-LD does not parse: ${e.message}`)
    }
  }
  if (!ld.length) fail('ld', 'no JSON-LD')
  const types = (j) => [].concat(j['@type'])
  if (JSON.stringify(ld).includes('"alternateName"')) fail('ld', 'alternateName present')
  for (const j of ld) {
    const r8 = j.aggregateRating
    if (r8 && !(Number(r8.reviewCount ?? r8.ratingCount) > 0 && r8.ratingValue))
      fail('ld', `aggregateRating without a real count: ${JSON.stringify(r8)}`)
  }
  const visible = text(h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, ''))
  if (!unit) {
    const biz = ld.find((j) => types(j).includes('LodgingBusiness'))
    if (!biz || biz.name !== BRAND) fail('ld', `LodgingBusiness name "${biz?.name}"`)
    const faq = ld.find((j) => types(j).includes('FAQPage'))
    if (!faq?.mainEntity?.length) fail('ld', 'no FAQPage')
    for (const q of faq?.mainEntity ?? []) {
      if (!visible.includes(q.name) || !visible.includes(q.acceptedAnswer?.text))
        fail('ld', `FAQ not visible on the page: "${q.name}"`)
    }
  } else {
    const acc = ld.find((j) => types(j).includes('Accommodation'))
    if (!acc || acc.containedInPlace?.name !== BRAND) fail('ld', `Accommodation containedInPlace "${acc?.containedInPlace?.name}"`)
  }
  pass('ld')

  // Open Graph
  const og = (k) => meta(`og:${k}`)
  const ogBad = []
  if (og('site_name') !== BRAND) ogBad.push(`site_name=${og('site_name')}`)
  if (og('url') !== expected) ogBad.push(`url=${og('url')}`)
  if (og('title') !== title) ogBad.push(`title=${og('title')}`)
  if (og('locale') !== (lang === 'he' ? 'he_IL' : 'en_US')) ogBad.push(`locale=${og('locale')}`)
  if (!og('image')) ogBad.push('no image')
  if (!unit && !og('image')?.endsWith(HERO_FILE)) ogBad.push(`image=${og('image')?.split('/').pop()}, want ${HERO_FILE}`)
  ogBad.length ? fail('og', ogBad.join(' ')) : pass('og')

  // alt text: none missing or empty
  const imgs = all(h, /<img [^>]*>/g).map((m) => m[0])
  const noAlt = imgs.filter((i) => !(attr(i, 'alt') || '').trim())
  noAlt.length ? fail('alt', `${noAlt.length}/${imgs.length} imgs with empty or missing alt`) : pass('alt')

  // images resized through Next's optimizer, never the raw storage original
  const raw = imgs.filter((i) => /supabase\.co\/storage/.test(decode(attr(i, 'src') || '')))
  raw.length ? fail('img', `${raw.length} imgs load the original from storage`) : pass('img')

  rows.push({ path, ...r })
  return { title, description, h1, canon, alt, ld, og: og('image'), imgs }
}

const firstOptimized = []
const details = []
for (const p of PAGES) {
  const { res, body } = await get(base + p.path)
  const d = checkPage(p, res, body)
  details.push({ p, res, d })
  const src = d.imgs.map((i) => decode(attr(i, 'src') || '')).find((s) => s.includes('/_next/image'))
  if (src && firstOptimized.length < 1) firstOptimized.push(src)
}

// The optimizer must actually answer with a modern format.
const site = {}
if (firstOptimized[0]) {
  const url = firstOptimized[0].startsWith('http') ? firstOptimized[0] : base + firstOptimized[0]
  const r = await fetch(url, { headers: { accept: 'image/avif,image/webp,image/*,*/*;q=0.8' } })
  const type = r.headers.get('content-type') || ''
  site.webp = r.status === 200 && /image\/(webp|avif)/.test(type)
  if (!site.webp) failures.push(`img format: ${url} -> HTTP ${r.status} ${type}`)
} else {
  site.webp = false
  failures.push('img format: no /_next/image src found on any page')
}

// sitemap.xml: all 8 with a real lastmod, nothing that is not a public page.
{
  const { res, body } = await get(`${base}/sitemap.xml`)
  const entries = all(body, /<url>([\s\S]*?)<\/url>/g).map((m) => ({
    loc: decode((m[1].match(/<loc>([^<]*)<\/loc>/) || [])[1] || ''),
    lastmod: (m[1].match(/<lastmod>([^<]*)<\/lastmod>/) || [])[1],
  }))
  const before = Date.now()
  const errs = []
  if (res.status !== 200) errs.push(`HTTP ${res.status}`)
  for (const p of PAGES) {
    const e = entries.find((x) => x.loc === PROD + p.path)
    if (!e) errs.push(`missing ${p.path}`)
    else if (!e.lastmod || isNaN(Date.parse(e.lastmod))) errs.push(`no lastmod on ${p.path}`)
    // A lastmod of "right now" is the generation time, not a real update.
    else if (Date.parse(e.lastmod) > before - 60_000) errs.push(`lastmod is generation time on ${p.path}: ${e.lastmod}`)
  }
  for (const e of entries) {
    if (/\/bapita-admin(\/|$)/.test(e.loc)) errs.push(`lists ${e.loc}`)
    if (e.loc.includes(`/${SLUG}`) && !PAGES.some((p) => PROD + p.path === e.loc)) errs.push(`unexpected ${e.loc}`)
  }
  // Every listed URL must be a public, indexable 200.
  for (const e of entries) {
    const local = e.loc.replace(PROD, base)
    const { res: r, body: b } = await get(local)
    if (r.status !== 200) errs.push(`${e.loc} -> HTTP ${r.status}`)
    else if (/<meta [^>]*name="robots"[^>]*noindex/i.test(b)) errs.push(`${e.loc} is noindex`)
  }
  site.sitemap = !errs.length
  failures.push(...errs.map((e) => `sitemap.xml: ${e}`))
  if (verbose) console.log(`sitemap: ${entries.length} URLs`)
}

// robots.txt: these pages, /_next and images allowed; sitemap advertised.
{
  const { res, body } = await get(`${base}/robots.txt`)
  const errs = []
  if (res.status !== 200) errs.push(`HTTP ${res.status}`)
  const lines = body.split('\n').map((l) => l.trim())
  const disallow = lines.filter((l) => /^disallow:/i.test(l)).map((l) => l.split(':').slice(1).join(':').trim()).filter(Boolean)
  const blocked = (path) => disallow.some((d) => path.startsWith(d.replace(/\*.*$/, '')))
  for (const p of [...PAGES.map((x) => x.path), '/_next/static/x.js', '/_next/image?url=x']) {
    if (blocked(p)) errs.push(`blocks ${p}`)
  }
  const sm = lines.find((l) => /^sitemap:/i.test(l))?.split(/:\s*/).slice(1).join(':')
  if (!sm || !sm.endsWith('/sitemap.xml')) errs.push(`sitemap line: ${sm ?? 'none'}`)
  else if (base === PROD && sm !== `${PROD}/sitemap.xml`) errs.push(`sitemap line ${sm}`)
  site.robots = !errs.length
  failures.push(...errs.map((e) => `robots.txt: ${e}`))
}

if (verbose) {
  for (const { p, res, d } of details) {
    console.log(`\n== ${base}${p.path}`)
    console.log(`  HTTP ${res.status}  title: ${d.title}`)
    console.log(`  canonical: ${d.canon.join(', ')}`)
    console.log(`  hreflang: ${Object.entries(d.alt).map(([k, v]) => `${k}=${v}`).join('  ')}`)
    console.log(`  H1: ${d.h1.join(' | ')}`)
    console.log(
      `  JSON-LD: ${d.ld.map((j) => `${[].concat(j['@type']).join('/')}:${j.name ?? ''}${j.aggregateRating ? ` rating=${j.aggregateRating.ratingValue}/${j.aggregateRating.reviewCount}` : ''}`).join('  ')}`,
    )
    console.log(`  og:image: ${d.og?.split('/').pop()}  imgs: ${d.imgs.length}`)
  }
  console.log()
}

// Table
const cols = ['http', 'lang', 'title', 'desc', 'h1', 'canon', 'hreflang', 'index', 'ld', 'og', 'alt', 'img']
const mark = (v) => (v ? 'ok' : 'FAIL')
const w = Math.max(...rows.map((r) => r.path.length))
console.log(`${'page'.padEnd(w)}  ${cols.map((c) => c.padEnd(5)).join(' ')}`)
for (const r of rows) console.log(`${r.path.padEnd(w)}  ${cols.map((c) => mark(r[c]).padEnd(5)).join(' ')}`)
console.log(`\nsitemap.xml ${mark(site.sitemap)}   robots.txt ${mark(site.robots)}   optimizer serves webp/avif ${mark(site.webp)}`)

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`)
  for (const f of failures) console.log(`  - ${f}`)
  process.exit(1)
}
console.log('\nAll checks passed.')

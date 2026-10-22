#!/usr/bin/env node
// Image weight on a public page: every <img> (src + srcset) the server renders,
// its original size, and what the browser actually downloads at the largest
// candidate width with an AVIF/WebP Accept header.
//
//   node scripts/image-weight-check.mjs [url ...]
//   node scripts/image-weight-check.mjs https://book.bapita.com/good-living-herzeliya

const urls = process.argv.slice(2)
if (!urls.length) urls.push('https://book.bapita.com/good-living-herzeliya')

const ACCEPT = 'image/avif,image/webp,image/*,*/*;q=0.8'
const kb = (n) => `${Math.round(n / 1024)} KB`

async function size(url, accept) {
  const r = await fetch(url, { headers: accept ? { accept } : {} })
  const buf = await r.arrayBuffer()
  return { status: r.status, type: r.headers.get('content-type'), bytes: buf.byteLength }
}

for (const page of urls) {
  const html = await (await fetch(page)).text()
  const origin = new URL(page).origin
  const imgs = [...html.matchAll(/<img [^>]*>/g)].map((m) => m[0])
  const decode = (s) => s.replace(/&amp;/g, '&')
  let raw = 0
  let heavy = 0
  console.log(`\n== ${page} (${imgs.length} imgs)`)
  for (const tag of imgs) {
    const src = decode((tag.match(/\ssrc="([^"]+)"/) || [])[1] || '')
    const srcset = decode((tag.match(/\ssrcSet="([^"]+)"/i) || [])[1] || '')
    const largest = srcset ? srcset.split(',').map((s) => s.trim().split(' ')[0]).pop() : src
    if (!largest) continue
    const abs = largest.startsWith('http') ? largest : origin + largest
    const optimized = abs.includes('/_next/image')
    if (!optimized) raw++
    const original = optimized ? decodeURIComponent(new URL(abs).searchParams.get('url')) : abs
    const [o, s] = await Promise.all([size(original), size(abs, ACCEPT)])
    if (o.bytes > 1024 * 1024) heavy++
    const name = original.split('/').pop()
    console.log(`  ${optimized ? 'opt' : 'RAW'} ${name.padEnd(34)} original ${kb(o.bytes).padStart(8)} -> served ${kb(s.bytes).padStart(7)} ${s.type}`)
  }
  console.log(`  raw (unoptimized) imgs: ${raw}; originals over 1 MB on this page: ${heavy}`)
}

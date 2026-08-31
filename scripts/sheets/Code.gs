/**
 * Bapita outreach sheet.
 *
 * Committed to the book repo so it is versioned and reviewable; it runs inside
 * Google, bound to the Prospects sheet. See scripts/sheets/README.md to install.
 *
 * The sheet is the brain: it holds per-row state, so a partial batch is
 * resumable and one bad row never kills the run.
 */

var BASE = 'https://book.bapita.com';
var HEADERS = [
  'pick', 'query', 'notes', 'lang', 'instagram',
  'place_id', 'name', 'phone', 'address', 'website', 'rating', 'reviews_count', 'hours', 'segment', 'enriched_at',
  'slug', 'site_url', 'business_id', 'site_at',
  'channel', 'message_he', 'message_en', 'action_link', 'message_at',
  'status', 'last_error'
];
var STATUSES = ['new', 'enriched', 'site', 'ready', 'sent', 'replied', 'won', 'lost', 'error', 'needs_channel'];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Bapita')
    .addItem('Set up sheet', 'setUpSheet')
    .addSeparator()
    .addItem('Enrich selected', 'enrichSelected')
    .addItem('Create sites for selected', 'siteSelected')
    .addItem('Write openers for selected', 'messageSelected')
    .addToUi();
}

function secret_() {
  var s = PropertiesService.getScriptProperties().getProperty('BAPITA_OUTREACH_SECRET');
  if (!s) throw new Error('Set the BAPITA_OUTREACH_SECRET script property first (see README).');
  return s;
}

function sheet_() {
  var sh = SpreadsheetApp.getActive().getSheetByName('Prospects');
  if (!sh) throw new Error('No tab named Prospects.');
  return sh;
}

/** Header name to 1-based column index, so columns can be reordered freely. */
function headerMap_(sh) {
  var row = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < row.length; i++) {
    var key = String(row[i]).trim();
    if (key) map[key] = i + 1;
  }
  return map;
}

function setUpSheet() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName('Prospects') || ss.insertSheet('Prospects');

  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sh.setFrozenRows(1);

  var lastRow = Math.max(sh.getMaxRows(), 200);
  sh.getRange(2, 1, lastRow - 1, 1).insertCheckboxes();

  var statusCol = HEADERS.indexOf('status') + 1;
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build();
  sh.getRange(2, statusCol, lastRow - 1, 1).setDataValidation(rule);

  SpreadsheetApp.getUi().alert('Sheet ready. Tick pick on the rows you want, then use the Bapita menu.');
}

/** 1-based row numbers whose pick checkbox is ticked. */
function pickedRows_(sh, h) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  var picks = sh.getRange(2, h.pick, last - 1, 1).getValues();
  var rows = [];
  for (var i = 0; i < picks.length; i++) if (picks[i][0] === true) rows.push(i + 2);
  return rows;
}

function post_(path, payload) {
  var res = UrlFetchApp.fetch(BASE + path, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + secret_() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  var body;
  try { body = JSON.parse(text); } catch (e) { body = { error: text.slice(0, 300) }; }
  return { code: code, body: body };
}

function set_(sh, row, h, name, value) {
  if (h[name]) sh.getRange(row, h[name]).setValue(value);
}

function fail_(sh, row, h, message) {
  set_(sh, row, h, 'status', 'error');
  set_(sh, row, h, 'last_error', String(message).slice(0, 500));
}

function now_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

/**
 * Every action shares this loop. ~2s between rows keeps a batch under Groq's
 * roughly 30 requests per minute, and the run stops cleanly before the Apps
 * Script 6 minute execution limit — completed rows are skipped on the next run,
 * so a stopped batch is resumed by picking the menu item again.
 */
function runBatch_(handler) {
  var sh = sheet_();
  var h = headerMap_(sh);
  var rows = pickedRows_(sh, h);
  if (!rows.length) {
    SpreadsheetApp.getUi().alert('No rows ticked in the pick column.');
    return;
  }

  var started = Date.now();
  var done = 0;
  var stoppedEarly = false;

  for (var i = 0; i < rows.length; i++) {
    if (Date.now() - started > 5 * 60 * 1000) { stoppedEarly = true; break; }
    try {
      handler(sh, rows[i], h);
    } catch (e) {
      fail_(sh, rows[i], h, e.message || e);
    }
    done++;
    SpreadsheetApp.flush();
    Utilities.sleep(2000);
  }

  SpreadsheetApp.getUi().alert(
    done + ' of ' + rows.length + ' row(s) processed.' +
    (stoppedEarly ? ' Stopped before the 6 minute limit, run it again to continue.' : '')
  );
}

function enrichSelected() {
  runBatch_(function (sh, row, h) {
    var query = String(sh.getRange(row, h.query).getValue()).trim();
    var placeId = h.place_id ? String(sh.getRange(row, h.place_id).getValue()).trim() : '';
    if (!query && !placeId) { fail_(sh, row, h, 'query is empty'); return; }

    var r = post_('/api/outreach/enrich', { query: query, place_id: placeId });
    if (r.code !== 200) { fail_(sh, row, h, r.code + ' ' + (r.body.error || '')); return; }

    var b = r.body;
    set_(sh, row, h, 'place_id', b.place_id);
    set_(sh, row, h, 'name', b.name);
    set_(sh, row, h, 'phone', b.phone);
    set_(sh, row, h, 'address', b.address);
    set_(sh, row, h, 'website', b.website);
    set_(sh, row, h, 'rating', b.rating);
    set_(sh, row, h, 'reviews_count', b.reviews_count);
    set_(sh, row, h, 'hours', b.hours);
    set_(sh, row, h, 'segment', b.segment);
    set_(sh, row, h, 'enriched_at', now_());
    set_(sh, row, h, 'status', 'enriched');
    set_(sh, row, h, 'last_error', '');
  });
}

function siteSelected() {
  runBatch_(function (sh, row, h) {
    var placeId = String(sh.getRange(row, h.place_id).getValue()).trim();
    if (!placeId) { fail_(sh, row, h, 'not enriched yet, no place_id'); return; }

    var existing = String(sh.getRange(row, h.business_id).getValue()).trim();
    if (existing) { return; }   // already built; skipping is what makes a batch resumable

    var r = post_('/api/outreach/site', {
      place_id: placeId,
      query: String(sh.getRange(row, h.query).getValue()).trim(),
      notes: String(sh.getRange(row, h.notes).getValue()).trim(),
      lang: String(sh.getRange(row, h.lang).getValue()).trim() || 'he'
    });
    if (r.code !== 200) { fail_(sh, row, h, r.code + ' ' + (r.body.error || '')); return; }

    set_(sh, row, h, 'slug', r.body.slug);
    set_(sh, row, h, 'site_url', r.body.site_url);
    set_(sh, row, h, 'business_id', r.body.business_id);
    set_(sh, row, h, 'site_at', now_());
    set_(sh, row, h, 'status', 'site');
    set_(sh, row, h, 'last_error', '');
  });
}

function messageSelected() {
  runBatch_(function (sh, row, h) {
    var siteUrl = String(sh.getRange(row, h.site_url).getValue()).trim();
    if (!siteUrl) { fail_(sh, row, h, 'no site_url yet, build the site first'); return; }

    var phone = String(sh.getRange(row, h.phone).getValue()).trim();
    var handle = String(sh.getRange(row, h.instagram).getValue()).trim();
    if (!phone && !handle) {
      set_(sh, row, h, 'status', 'needs_channel');
      set_(sh, row, h, 'last_error', 'no phone and no instagram handle');
      return;
    }

    var r = post_('/api/outreach/message', {
      name: String(sh.getRange(row, h.name).getValue()).trim(),
      segment: String(sh.getRange(row, h.segment).getValue()).trim(),
      channel: String(sh.getRange(row, h.channel).getValue()).trim(),
      site_url: siteUrl,
      rating: sh.getRange(row, h.rating).getValue(),
      reviews_count: sh.getRange(row, h.reviews_count).getValue(),
      notes: String(sh.getRange(row, h.notes).getValue()).trim(),
      lang: String(sh.getRange(row, h.lang).getValue()).trim() || 'he',
      phone: phone,
      instagram: handle
    });
    if (r.code !== 200) { fail_(sh, row, h, r.code + ' ' + (r.body.error || '')); return; }

    set_(sh, row, h, 'channel', r.body.channel);
    set_(sh, row, h, 'message_he', r.body.message);
    set_(sh, row, h, 'action_link', r.body.action_link);
    set_(sh, row, h, 'message_at', now_());
    set_(sh, row, h, 'status', 'ready');
    set_(sh, row, h, 'last_error', '');

    // Reading aid only. Written per row because GOOGLETRANSLATE vectorises
    // badly under ARRAYFORMULA. The script NEVER reads this column, which is
    // what makes the transient "Loading..." value harmless: it can never reach
    // a sent message. Machine translation is not send quality.
    if (h.message_en && h.message_he) {
      var heA1 = sh.getRange(row, h.message_he).getA1Notation();
      sh.getRange(row, h.message_en).setFormula('=GOOGLETRANSLATE(' + heA1 + ',"he","en")');
    }
  });
}

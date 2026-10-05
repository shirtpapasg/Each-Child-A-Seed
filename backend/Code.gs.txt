/**
 * ECAS "From Seed to Plate" — data backend (Google Apps Script)
 * Everything is stored in YOUR Google Drive:
 *   📁 ECAS From Seed to Plate/
 *      📊 ECAS Data (Google Sheet: Students, Progress, Quiz, Measurements, Photos, Log)
 *      📁 Students/
 *         📁 P3-2 #14/          ← one private folder per student
 *            state.json         ← their latest app progress (sim, E-journal, album)
 *            📁 Photos/         ← their uploaded plant photos
 *
 * Students never sign in to Google. They use class + register number + 4-digit PIN.
 * The script only ever returns a student's OWN data, so student 1 can only reach student 1's folder.
 *
 * SETUP: see SETUP.md. Run setup() once, then Deploy → Web app (Execute as: Me, Who has access: Anyone).
 */

const ROOT_NAME = 'ECAS From Seed to Plate';
const SHEETS = {
  Students: ['class', 'reg', 'pinHash', 'plant', 'buddyGroup', 'folderId', 'email', 'created', 'lastSeen', 'name'],
  Progress: ['class', 'reg', 'updated', 'step', 'plant', 'found', 'stars', 'planted', 'sprouted', 'leaves4', 'grown', 'status'],
  Quiz: ['timestamp', 'phase', 'class', 'reg', 'score', 'total', 'K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10', 'K11', 'A1', 'A2', 'A3', 'A4', 'R1', 'R2', 'R3', 'R4', 'R5', 'V1', 'V2', 'V3'],
  Measurements: ['timestamp', 'class', 'reg', 'plant', 'week', 'tallest_cm', 'shortest_cm', 'difference_cm', 'average_cm'],
  Photos: ['timestamp', 'id', 'class', 'reg', 'plant', 'tag', 'caption', 'fileId', 'status', 'reviewed'],
  Log: ['timestamp', 'action', 'class', 'reg', 'note']
};
const MAX_PHOTOS_PER_WEEK = 3;
/* Optional: share each student's folder with their MOE iCON Google account (view only).
   Leave false unless your school allows sharing from a personal Drive to iCON accounts. */
const SHARE_WITH_STUDENT_EMAIL = false;

/* ---------- one-time setup ---------- */
function setup() {
  const P = PropertiesService.getScriptProperties();
  let root = P.getProperty('ROOT_ID') ? DriveApp.getFolderById(P.getProperty('ROOT_ID')) : null;
  if (!root) { root = DriveApp.createFolder(ROOT_NAME); P.setProperty('ROOT_ID', root.getId()); }
  let students = P.getProperty('STUDENTS_ID') ? DriveApp.getFolderById(P.getProperty('STUDENTS_ID')) : null;
  if (!students) { students = root.createFolder('Students'); P.setProperty('STUDENTS_ID', students.getId()); }
  let ss = P.getProperty('SHEET_ID') ? SpreadsheetApp.openById(P.getProperty('SHEET_ID')) : null;
  if (!ss) {
    ss = SpreadsheetApp.create('ECAS Data');
    DriveApp.getFileById(ss.getId()).moveTo(root);
    P.setProperty('SHEET_ID', ss.getId());
  }
  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  const blank = ss.getSheetByName('Sheet1'); if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);
  if (!P.getProperty('SALT')) P.setProperty('SALT', Utilities.getUuid());
  if (!P.getProperty('TEACHER_PIN')) P.setProperty('TEACHER_PIN', 'CHANGE-ME');
  Logger.log('Done. Folder: %s\nSheet: %s\nTeacher PIN: %s (change it in Project Settings → Script properties)', root.getUrl(), ss.getUrl(), P.getProperty('TEACHER_PIN'));
}

/* ---------- web endpoints ---------- */
function doGet(e) {
  const a = (e && e.parameter && e.parameter.action) || 'ping';
  if (a === 'wall') return json(approvedWall(Number(e.parameter.limit) || 24));
  return json({ ok: true, service: 'ECAS backend', time: new Date().toISOString() });
}

function doPost(e) {
  let b;
  try { b = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'Bad request' }); }
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (b.action) {
      case 'login': return json(login(b));
      case 'save': return json(withStudent(b, st => saveState(st, b.state)));
      case 'load': return json(withStudent(b, st => ({ ok: true, state: loadState(st) })));
      case 'quiz': return json(withStudent(b, st => saveQuiz(st, b)));
      case 'measure': return json(withStudent(b, st => saveMeasure(st, b)));
      case 'upload': return json(withStudent(b, st => upload(st, b)));
      case 'myPhotos': return json(withStudent(b, st => myPhotos(st)));
      case 'teacher': return json(teacher(b));
      default: return json({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    log_('error', b.cls, b.reg, String(err));
    return json({ ok: false, error: 'Server error. Please try again.' });
  } finally { lock.releaseLock(); }
}

/* ---------- students ---------- */
function login(b) {
  const cls = clean(b.cls), reg = clean(b.reg), pin = String(b.pin || ''), name = String(b.name || '').replace(/[<>]/g, '').trim().slice(0, 60);
  if (!cls || !reg || !/^\d{4}$/.test(pin)) return { ok: false, error: 'Check your class, register number and 4-digit PIN.' };
  const sh = sheet('Students'), rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === cls && String(rows[i][1]) === reg) {
      if (rows[i][2] !== hash(pin)) { log_('badpin', cls, reg, ''); return { ok: false, error: 'That PIN does not match. Ask your teacher to reset it.' }; }
      sh.getRange(i + 1, 9).setValue(new Date());
      if (name) sh.getRange(i + 1, 10).setValue(name);
      const st = rowToStudent(rows[i], i + 1);
      return { ok: true, isNew: false, plant: st.plant, buddyGroup: st.buddyGroup, state: loadState(st) };
    }
  }
  const folder = DriveApp.getFolderById(prop('STUDENTS_ID')).createFolder(cls + ' #' + reg + (name ? ' ' + name : ''));
  folder.createFolder('Photos');
  const email = SHARE_WITH_STUDENT_EMAIL && b.email ? String(b.email).trim() : '';
  if (email) { try { folder.addViewer(email); } catch (err) { log_('share-failed', cls, reg, email); } }
  const plant = assignPlant(cls);
  sh.appendRow([cls, reg, hash(pin), plant, '', folder.getId(), email, new Date(), new Date(), name]);
  log_('register', cls, reg, plant);
  return { ok: true, isNew: true, plant: plant, buddyGroup: '', state: null };
}

function withStudent(b, fn) {
  const cls = clean(b.cls), reg = clean(b.reg), pin = String(b.pin || '');
  const sh = sheet('Students'), rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === cls && String(rows[i][1]) === reg) {
      if (rows[i][2] !== hash(pin)) return { ok: false, error: 'Please sign in again.' };
      return fn(rowToStudent(rows[i], i + 1));
    }
  }
  return { ok: false, error: 'Please sign in again.' };
}

function rowToStudent(r, row) { return { cls: r[0], reg: String(r[1]), plant: r[3], buddyGroup: r[4], folderId: r[5], row: row }; }

/* Balanced random: picks the plant this class has fewest of, ties broken at random. */
function assignPlant(cls) {
  const n = { basil: 0, kangkong: 0, bayam: 0 };
  sheet('Students').getDataRange().getValues().slice(1).forEach(r => { if (r[0] === cls && n[r[3]] !== undefined) n[r[3]]++; });
  const min = Math.min(n.basil, n.kangkong, n.bayam), pool = Object.keys(n).filter(k => n[k] === min);
  return pool[Math.floor(Math.random() * pool.length)];
}

function saveState(st, state) {
  if (!state || typeof state !== 'object') return { ok: false, error: 'Nothing to save.' };
  const text = JSON.stringify(state);
  if (text.length > 400000) return { ok: false, error: 'Save is too big.' };
  const folder = DriveApp.getFolderById(st.folderId), it = folder.getFilesByName('state.json');
  if (it.hasNext()) it.next().setContent(text); else folder.createFile('state.json', text, MimeType.PLAIN_TEXT);
  const jn = state.jn || {}, ms = jn.ms || {}, found = state.found || {};
  const stars = [!!found.healthy, Object.keys(found).filter(k => k !== 'healthy').length >= 2, !!state.quizOk].filter(Boolean).length;
  upsert('Progress', st, [st.cls, st.reg, new Date(), state.step || '', state.plant || st.plant, Object.keys(found).join(', '), stars, ms.planted || jn.planted || '', ms.sprout || '', ms.leaves || '', ms.grown || '', state.status || '']);
  (jn.meas || []).forEach((m, i) => saveMeasure(st, { week: i + 1, tallest: m.tall, shortest: m.short, quiet: true }));
  return { ok: true, saved: new Date().toISOString() };
}

function loadState(st) {
  const it = DriveApp.getFolderById(st.folderId).getFilesByName('state.json');
  if (!it.hasNext()) return null;
  try { return JSON.parse(it.next().getBlob().getDataAsString()); } catch (err) { return null; }
}

function saveQuiz(st, b) {
  const ans = b.answers || {}, cols = SHEETS.Quiz.slice(6);
  const key = { K1: 0, K2: 0, K3: 1, K4: 0, K5: 1, K6: 0, K7: 0, K8: 0, K9: 1, K10: 0, K11: 0 }; /* edit to match the app's option order */
  let score = 0, total = 0;
  Object.keys(key).forEach(k => { if (ans[k] !== undefined) { total++; if (Number(ans[k]) === key[k]) score++; } });
  sheet('Quiz').appendRow([new Date(), clean(b.phase) || 'post', st.cls, st.reg, score, total].concat(cols.map(c => ans[c] === undefined ? '' : (Array.isArray(ans[c]) ? ans[c].join(' | ') : ans[c]))));
  return { ok: true, score: score, total: total };
}

function saveMeasure(st, b) {
  const t = parseFloat(b.tallest), s = parseFloat(b.shortest);
  if (isNaN(t) || isNaN(s)) return { ok: false };
  const sh = sheet('Measurements'), rows = sh.getDataRange().getValues(), week = Number(b.week) || 1;
  const row = [new Date(), st.cls, st.reg, st.plant, week, t, s, Math.abs(t - s).toFixed(1), ((t + s) / 2).toFixed(1)];
  for (let i = 1; i < rows.length; i++) if (rows[i][1] === st.cls && String(rows[i][2]) === st.reg && Number(rows[i][4]) === week) { sh.getRange(i + 1, 1, 1, row.length).setValues([row]); return { ok: true }; }
  sh.appendRow(row);
  return { ok: true };
}

function upload(st, b) {
  const m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(String(b.image || ''));
  if (!m) return { ok: false, error: 'That is not a photo.' };
  if (m[3].length > 1400000) return { ok: false, error: 'Photo is too big.' };
  const weekAgo = Date.now() - 7 * 864e5;
  const recent = sheet('Photos').getDataRange().getValues().slice(1).filter(r => r[2] === st.cls && String(r[3]) === st.reg && new Date(r[0]).getTime() > weekAgo).length;
  if (recent >= MAX_PHOTOS_PER_WEEK) return { ok: false, error: 'You can send 3 photos a week. Try again next week.' };
  const photos = DriveApp.getFolderById(st.folderId).getFoldersByName('Photos');
  const folder = photos.hasNext() ? photos.next() : DriveApp.getFolderById(st.folderId).createFolder('Photos');
  const id = Utilities.getUuid().slice(0, 8), tag = clean(b.tag) || 'other';
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(m[3]), m[1], [st.cls, st.reg, tag, id].join('_') + '.jpg'));
  sheet('Photos').appendRow([new Date(), id, st.cls, st.reg, st.plant, tag, String(b.caption || '').slice(0, 140), file.getId(), 'pending', '']);
  return { ok: true, id: id, status: 'pending' };
}

function myPhotos(st) {
  const list = sheet('Photos').getDataRange().getValues().slice(1).filter(r => r[2] === st.cls && String(r[3]) === st.reg)
    .map(r => ({ id: r[1], tag: r[5], caption: r[6], status: r[8], date: r[0] }));
  return { ok: true, photos: list };
}

/* ---------- teacher ---------- */
function teacher(b) {
  if (String(b.teacherPin || '') !== prop('TEACHER_PIN')) return { ok: false, error: 'Wrong teacher PIN.' };
  const cls = clean(b.cls);
  if (b.task === 'pending') {
    const rows = sheet('Photos').getDataRange().getValues().slice(1).filter(r => r[8] === 'pending' && (!cls || r[2] === cls)).slice(0, 30);
    return { ok: true, photos: rows.map(r => ({ id: r[1], cls: r[2], reg: r[3], plant: r[4], tag: r[5], caption: r[6], date: r[0], image: thumb(r[7]) })) };
  }
  if (b.task === 'review') {
    const sh = sheet('Photos'), rows = sh.getDataRange().getValues(), status = b.status === 'approved' ? 'approved' : 'hidden';
    for (let i = 1; i < rows.length; i++) if (rows[i][1] === b.id) { sh.getRange(i + 1, 9, 1, 2).setValues([[status, new Date()]]); return { ok: true }; }
    return { ok: false, error: 'Photo not found.' };
  }
  if (b.task === 'dashboard') {
    const prog = {}; sheet('Progress').getDataRange().getValues().slice(1).forEach(r => { prog[r[0] + '#' + r[1]] = r; });
    const quiz = {}; sheet('Quiz').getDataRange().getValues().slice(1).forEach(r => { const k = r[2] + '#' + r[3]; quiz[k] = quiz[k] || {}; quiz[k][r[1]] = r[4] + '/' + r[5]; });
    const kids = sheet('Students').getDataRange().getValues().slice(1).filter(r => !cls || r[0] === cls).map(r => {
      const k = r[0] + '#' + r[1], p = prog[k] || [];
      return { cls: r[0], reg: r[1], name: r[9] || '', plant: r[3], buddyGroup: r[4], lastSeen: r[8], stars: p[6] || 0, planted: p[7] || '', sprouted: p[8] || '', leaves4: p[9] || '', grown: p[10] || '', status: p[11] || '', pre: (quiz[k] || {}).pre || '', post: (quiz[k] || {}).post || '' };
    });
    return { ok: true, students: kids };
  }
  if (b.task === 'resetPin') {
    const sh = sheet('Students'), rows = sh.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) if (rows[i][0] === cls && String(rows[i][1]) === clean(b.reg)) { sh.getRange(i + 1, 3).setValue(hash(String(b.newPin))); return { ok: true }; }
    return { ok: false, error: 'Student not found.' };
  }
  if (b.task === 'setPlant' || b.task === 'setBuddy') {
    const sh = sheet('Students'), rows = sh.getDataRange().getValues(), col = b.task === 'setPlant' ? 4 : 5;
    for (let i = 1; i < rows.length; i++) if (rows[i][0] === cls && String(rows[i][1]) === clean(b.reg)) { sh.getRange(i + 1, col).setValue(b.task === 'setPlant' ? String(b.value || '').toLowerCase().replace(/[^a-z]/g, '') : clean(b.value)); return { ok: true }; }
    return { ok: false, error: 'Student not found.' };
  }
  return { ok: false, error: 'Unknown teacher task.' };
}

/* Approved photos for the canteen display wall (no names, class only). */
function approvedWall(limit) {
  const rows = sheet('Photos').getDataRange().getValues().slice(1).filter(r => r[8] === 'approved').slice(-limit).reverse();
  return { ok: true, photos: rows.map(r => ({ plant: r[4], tag: r[5], caption: r[6], cls: r[2], image: thumb(r[7]) })) };
}

/* ---------- helpers ---------- */
function thumb(fileId) {
  try { const blob = DriveApp.getFileById(fileId).getBlob(); return 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes()); }
  catch (err) { return ''; }
}
function upsert(name, st, row) {
  const sh = sheet(name), rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (rows[i][0] === st.cls && String(rows[i][1]) === st.reg) { sh.getRange(i + 1, 1, 1, row.length).setValues([row]); return; }
  sh.appendRow(row);
}
function sheet(name) { return SpreadsheetApp.openById(prop('SHEET_ID')).getSheetByName(name); }
function prop(k) { const v = PropertiesService.getScriptProperties().getProperty(k); if (!v) throw new Error('Run setup() first'); return v; }
function hash(pin) { return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, prop('SALT') + ':' + pin)); }
function clean(v) { return String(v === undefined || v === null ? '' : v).trim().toUpperCase().replace(/[^A-Z0-9\-# ]/g, '').slice(0, 20); }
function log_(action, cls, reg, note) { try { sheet('Log').appendRow([new Date(), action, cls || '', reg || '', note || '']); } catch (e) {} }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

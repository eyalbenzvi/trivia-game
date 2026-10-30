#!/usr/bin/env python3
"""הקלטת הטקסטים ב-texts.json באצוות (Gemini Batch API): בלי מגבלת בקשות יומית, ובחצי מחיר.

שימוש:  python3 scripts/speech/batch.py <קובץ-מפתח> [--size 120] [--active 6]
ניתן לעצור ולהמשיך: אצוות שנשלחו נשמרות ב-scripts/speech/batches.json ונאספות בהרצה הבאה.
"""
import base64, json, os, re, subprocess, sys, tempfile, time, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clean import ENCODE, FILTER  # חיתוך הרחש בקצוות + מעברים רכים

MODEL = 'gemini-3.8-flash-tts'
VOICE = 'Kore'
OUT = os.environ.get('CLIPS_OUT', 'public/audio/clips')
TEXTS = os.environ.get('CLIPS_TEXTS', 'scripts/speech/texts.json')
STATE = os.path.join(OUT, 'batches.json') if 'CLIPS_OUT' in os.environ else 'scripts/speech/batches.json'
LOG = 'scripts/speech/record-log.json'
API = 'https://generativelanguage.googleapis.com/v1beta'

key = open(sys.argv[1], encoding='utf-8').read().split()[0]
arg = lambda name, default: int(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default
SIZE, ACTIVE = arg('--size', 120), arg('--active', 6)
texts = json.load(open(TEXTS, encoding='utf-8'))
state = json.load(open(STATE, encoding='utf-8')) if os.path.exists(STATE) else {}  # שם אצווה → רשימת מפתחות
log = json.load(open(LOG, encoding='utf-8')) if os.path.exists(LOG) else {}
os.makedirs(OUT, exist_ok=True)
ORDER = ['home', 'hub', 'editor', 'game', 'topic', 'race', 'summary', 'team', 'duel', 'ido', 'twenty', 'sticker']


def api(method, path, body=None):
    req = urllib.request.Request(f'{API}/{path}{"&" if "?" in path else "?"}key={key}', data=json.dumps(body).encode() if body else None,
                                 headers={'Content-Type': 'application/json'}, method=method)
    return json.load(urllib.request.urlopen(req, timeout=300))


def save(k, wav):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        f.write(wav); tmp = f.name
    try:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-af', FILTER, *ENCODE, f'{OUT}/{k}.tmp.ogg'], check=True)
        os.replace(f'{OUT}/{k}.tmp.ogg', f'{OUT}/{k}.ogg')
    finally:
        os.unlink(tmp)


# אימוג'י נשלח למנוע ההקראה כמילה ("💪" → "חזק!") – מוחקים אותו. מספרים נשארים בספרות: המנוע מטה אותם נכון לפי ההקשר
EMOJI = re.compile('[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D\u23E9-\u23FA\u20E3]')
spoken = lambda t: re.sub(r'\s+', ' ', EMOJI.sub(' ', t)).strip()


# הטקסט להקלטה: גרסה עם המספרים במילים (say.json, numbers.py) אם יש, ותיקוני הגייה למילים (words.json – מילה → כתיב מנוקד)
load = lambda p: json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
SAY = {**load('scripts/speech/say.json'), **load('scripts/speech/say-manual.json')}
WORDS = load('scripts/speech/words.json')


def to_record(k):
    t = spoken(SAY.get(k, texts[k]['t']))
    for w, fix in WORDS.items():
        t = re.sub(rf'(?<![\u05D0-\u05EA]){w}(?![\u05D0-\u05EA])', fix, t)
        t = re.sub(rf'(?<![\u05D0-\u05EA])([והבלמשכ]{{1,3}}){w}(?![\u05D0-\u05EA])', lambda m: m.group(1) + fix, t)
    return t


def request_for(k):
    return {"request": {"contents": [{"parts": [{"text": to_record(k)}]}],
                        "generationConfig": {"responseModalities": ["AUDIO"],
                                             "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}},
            "metadata": {"key": k}}


def submit(keys_):
    r = api('POST', f'models/{MODEL}:batchGenerateContent', {"batch": {"display_name": f'clips-{int(time.time())}', "input_config": {"requests": {"requests": [request_for(k) for k in keys_]}}}})
    state[r['name']] = keys_
    json.dump(state, open(STATE, 'w', encoding='utf-8'))
    return r['name']


def collect(name):
    """אוסף אצווה שהסתיימה; מחזיר (הסתיימה?, כמה נשמרו)"""
    r = api('GET', name)
    st = r.get('metadata', {}).get('state', '')
    if st in ('BATCH_STATE_PENDING', 'BATCH_STATE_RUNNING', ''): return False, 0
    saved = 0
    for x in r.get('response', {}).get('inlinedResponses', {}).get('inlinedResponses', []):
        k = x.get('metadata', {}).get('key')
        try:
            part = x['response']['candidates'][0]['content']['parts'][0]['inlineData']
            wav = base64.b64decode(part['data'])
            if len(wav) < 24000 * 2 * 0.3: raise ValueError('קצר מדי')
            save(k, wav); saved += 1
            log[k] = {'tokens': x['response'].get('usageMetadata', {}).get('candidatesTokenCount', 0), 'sec': round((len(wav) - 44) / 48000, 2)}
        except Exception as e:  # בקשה שנכשלה – תישלח שוב באצווה הבאה
            print(f'  {k}: {type(e).__name__} {str(e)[:80]}', flush=True)
    state.pop(name, None)
    json.dump(state, open(STATE, 'w', encoding='utf-8'))
    json.dump(log, open(LOG, 'w', encoding='utf-8'), ensure_ascii=False)
    if st != 'BATCH_STATE_SUCCEEDED': print(f'  {name}: {st}', flush=True)
    return True, saved


t0 = time.time(); total_saved = 0
while True:
    # איסוף אצוות שהסתיימו
    for name in list(state):
        try:
            finished, n = collect(name)
        except urllib.error.HTTPError as e:
            print(f'  {name}: HTTP {e.code}', flush=True); continue
        if finished: total_saved += n
    # מה עוד חסר (לא קיים, ולא באצווה פעילה)
    active = {k for ks in state.values() for k in ks}
    todo = [k for k in texts if k not in active and not os.path.exists(f'{OUT}/{k}.ogg')]
    todo.sort(key=lambda k: (ORDER.index(texts[k]['src']) if texts[k]['src'] in ORDER else 99, k))
    have = sum(1 for k in texts if os.path.exists(f'{OUT}/{k}.ogg'))
    print(f'{have}/{len(texts)} קיימים · {len(active)} באצוות פעילות ({len(state)}) · {len(todo)} ממתינים · {(time.time()-t0)/60:.0f} דק\'', flush=True)
    if not todo and not state: break
    # שליחת אצוות חדשות עד למכסת הפעילות
    while todo and len(state) < ACTIVE:
        chunk, todo = todo[:SIZE], todo[SIZE:]
        try:
            submit(chunk)
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:160]
            print(f'שליחה נכשלה: HTTP {e.code} {msg}', flush=True)
            if e.code == 429: time.sleep(60)
            break
    time.sleep(30)
print(f'סיום: {total_saved} נשמרו בהרצה זו')

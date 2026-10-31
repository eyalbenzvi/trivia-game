#!/usr/bin/env python3
"""הקלטת כל הטקסטים ב-texts.json בקול אחד (Gemini TTS) לקבצי Opus ב-public/audio/clips.

שימוש:  python3 scripts/speech/record.py <קובץ-מפתחות> [--only ido|envelope]
קובץ המפתחות: מפתח API בכל שורה (כל מפתח = פרויקט, ולכל פרויקט מגבלה משלו של בקשות לדקה).
ניתן לעצור ולהמשיך – הקלטה שכבר קיימת לא נעשית שוב. הטקסט נשלח כמו שהוא (בלי ניקוד).
"""
import base64, json, os, subprocess, sys, tempfile, threading, time, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from clean import ENCODE, FILTER
from prep import to_record
from collections import deque

MODEL = 'gemini-3.8-flash-tts'
VOICE = 'Kore'
RPM = 10  # מגבלת Google לפרויקט (נמדדה)
OUT = os.environ.get('CLIPS_OUT', 'public/audio/clips')
TEXTS = os.environ.get('CLIPS_TEXTS', 'scripts/speech/texts.json')
LOG = 'scripts/speech/record-log.json'

keys = [l.strip() for l in open(sys.argv[1], encoding='utf-8') if l.strip()]
only = sys.argv[sys.argv.index('--only') + 1] if '--only' in sys.argv else None
texts = json.load(open(TEXTS, encoding='utf-8'))
os.makedirs(OUT, exist_ok=True)
log = json.load(open(LOG, encoding='utf-8')) if os.path.exists(LOG) else {}
todo = [(k, v) for k, v in texts.items() if not os.path.exists(f'{OUT}/{k}.ogg')]
if only == 'ido': todo = [x for x in todo if x[1]['src'] == 'ido']
elif only == 'envelope': todo = [x for x in todo if x[1]['src'] != 'ido']
# סדר (ב-ORDER): המסכים הראשיים והמשחק קודם, אחר כך השאלות של עידו, ובסוף המדבקות ו-20 שאלות (ארוכים ופחות דחופים)
ORDER = ['home', 'hub', 'editor', 'game', 'topic', 'race', 'summary', 'team', 'duel', 'ido', 'twenty', 'sticker']
todo.sort(key=lambda x: (ORDER.index(x[1]['src']) if x[1]['src'] in ORDER else 99, x[0]))
print(f'{len(todo)} להקלטה, {len(texts) - len(todo)} כבר קיימים, {len(keys)} מפתחות', flush=True)

lock = threading.Lock()
queue = deque(todo)
done = 0
t0 = time.time()


def synth(key, text):
    body = {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
                                 "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=180))
    part = r['candidates'][0]['content']['parts'][0]['inlineData']
    rate = int(part['mimeType'].split('rate=')[1].split(';')[0]) if 'rate=' in part['mimeType'] else 24000
    return base64.b64decode(part['data']), rate, r.get('usageMetadata', {}).get('candidatesTokenCount', 0)


def save(k, pcm, rate):
    with tempfile.NamedTemporaryFile(suffix='.pcm', delete=False) as f:
        f.write(pcm); tmp = f.name
    try:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(rate), '-ac', '1', '-i', tmp, '-af', FILTER, *ENCODE, f'{OUT}/{k}.ogg.tmp.ogg'], check=True)
        os.replace(f'{OUT}/{k}.ogg.tmp.ogg', f'{OUT}/{k}.ogg')
    finally:
        os.unlink(tmp)


def worker(key, idx):
    global done
    stamps = deque()  # זמני הבקשות בדקה האחרונה – כדי לא לעבור את המגבלה
    while True:
        with lock:
            if not queue: return
            k, v = queue.popleft()
        while True:
            now = time.time()
            while stamps and now - stamps[0] > 61: stamps.popleft()
            if len(stamps) < RPM: break
            time.sleep(61 - (now - stamps[0]) + 0.2)
        stamps.append(time.time())
        try:
            pcm, rate, tokens = synth(key, to_record(k, v['t']))
            if len(pcm) < rate * 2 * 0.3: raise ValueError('אודיו קצר מדי')
            save(k, pcm, rate)
            with lock:
                done += 1
                log[k] = {'tokens': tokens, 'sec': round(len(pcm) / (rate * 2), 2)}
                if done % 25 == 0:
                    json.dump(log, open(LOG, 'w', encoding='utf-8'), ensure_ascii=False)
                    el = time.time() - t0
                    print(f'{done}/{len(todo)} · {el/60:.0f} דק\' · {done/el*60:.1f} לדקה · נותרו ~{(len(todo)-done)/(done/el)/60:.0f} דק\'', flush=True)
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:200]
            with lock: queue.appendleft((k, v))
            if e.code == 429 and 'PerDay' in msg: print(f'מפתח {idx}: המכסה היומית נגמרה', flush=True); return
            if e.code == 429: time.sleep(20)
            elif e.code in (402, 403): print(f'מפתח {idx}: {e.code} {msg}', flush=True); return
            else: print(f'{k}: HTTP {e.code} {msg}', flush=True); time.sleep(5)
        except Exception as e:  # רשת, פענוח, אודיו ריק – מנסים שוב מאוחר יותר
            print(f'{k}: {type(e).__name__} {str(e)[:120]}', flush=True)
            with lock: queue.append((k, v))
            time.sleep(5)


threads = [threading.Thread(target=worker, args=(key, i), daemon=True) for i, key in enumerate(keys)]
for t in threads: t.start()
for t in threads: t.join()
json.dump(log, open(LOG, 'w', encoding='utf-8'), ensure_ascii=False)
print(f'סיום: {done} הוקלטו, {len(queue)} נותרו', flush=True)

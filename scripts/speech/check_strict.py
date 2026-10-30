#!/usr/bin/env python3
"""בדיקת הגייה מחמירה: מודל שמע מקשיב לכל הקלטה ובודק את ההגייה של כל מילה מול הטקסט (במקביל).
משלים את check_api.py: מודל אחר והנחיה ממוקדת בהגייה – כדי לתפוס טעויות כמו "קאנו" → "קנואה".

שימוש:  python3 scripts/speech/check_strict.py <קובץ-מפתח> <מודל> <קובץ-תוצאה> [--threads 12] [--only keys.json]
הקלטה שכבר נבדקה (באותו קובץ תוצאה) לא נבדקת שוב.
"""
import base64, json, os, sys, threading, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

OUT = os.environ.get('CLIPS', 'public/audio/clips')
TEXTS = os.environ.get('CLIPS_TEXTS', 'scripts/speech/texts.json')
PROMPT = ('You are a strict native Hebrew speaker proofreading a text-to-speech recording for a children\'s quiz game.\n'
          'Intended text: "{t}"\n'
          'Listen carefully and check EVERY word: correct consonants (e.g. כ vs ח, ב vs ו, פ vs ף), correct vowels, correct stress, '
          'and that it is the intended word in standard Israeli Hebrew (not a different or invented word, not English). '
          'Also check: nothing missing, nothing added, not cut off, no noise or sound effects instead of words. '
          'Ignore punctuation, the symbol "·", short pauses, and question intonation.\n'
          'Reply JSON: {{"ok": true/false, "word": "<the first wrong word as written in the intended text, or empty>", '
          '"heard": "<how that word sounded, in Hebrew letters>", "problem": "<short, in Hebrew>"}}')

key = open(sys.argv[1], encoding='utf-8').read().split()[0]
MODEL, RESULT = sys.argv[2], sys.argv[3]
THREADS = int(sys.argv[sys.argv.index('--threads') + 1]) if '--threads' in sys.argv else 12
texts = json.load(open(TEXTS, encoding='utf-8'))
load = lambda p: json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
SAY = {**load('scripts/speech/say.json'), **load('scripts/speech/say-manual.json')}
intended = lambda k: SAY.get(k, texts[k]['t'])
done = load(RESULT)
only = set(load(sys.argv[sys.argv.index('--only') + 1])) if '--only' in sys.argv else None


def judge(k):
    audio = base64.b64encode(open(f'{OUT}/{k}.ogg', 'rb').read()).decode()
    body = {"contents": [{"parts": [{"text": PROMPT.format(t=intended(k))}, {"inlineData": {"mimeType": "audio/ogg", "data": audio}}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0, "thinkingConfig": {"thinkingLevel": "low"}}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=120))
    v = json.loads(r['candidates'][0]['content']['parts'][0]['text'])
    if isinstance(v, list): v = v[0] if v else {}
    return {'ok': bool(v.get('ok')), 'word': str(v.get('word', '')), 'heard': str(v.get('heard', '')), 'problem': str(v.get('problem', ''))}


lock = threading.Lock()
t0 = time.time()
stop = threading.Event()


def work(k):
    if stop.is_set(): return
    for attempt in range(6):
        try:
            v = judge(k)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:200]
            if e.code == 429 and 'PerDay' in msg:
                print('מכסה יומית נגמרה', flush=True); stop.set(); return
            if e.code in (429, 500, 503): time.sleep(5 * (attempt + 1)); continue
            print(f'{k}: HTTP {e.code} {msg[:120]}', flush=True); return
        except Exception as e:
            print(f'{k}: {type(e).__name__} {str(e)[:100]}', flush=True); time.sleep(2)
    else:
        return
    with lock:
        done[k] = v
        if len(done) % 500 == 0:
            json.dump(done, open(RESULT, 'w', encoding='utf-8'), ensure_ascii=False)
            print(f'{len(done)} נבדקו · {time.time()-t0:.0f}s · נכשלו {sum(1 for x in done.values() if not x["ok"])}', flush=True)


items = [k for k in texts if k not in done and os.path.exists(f'{OUT}/{k}.ogg') and (only is None or k in only)]
print(f'{MODEL}: {len(items)} הקלטות לבדיקה', flush=True)
with ThreadPoolExecutor(THREADS) as ex:
    list(ex.map(work, items))
json.dump(done, open(RESULT, 'w', encoding='utf-8'), ensure_ascii=False)
bad = sum(1 for k, v in done.items() if not v['ok'])
print(f'סיום {MODEL}: {len(done)} נבדקו, {bad} נכשלו ({100*bad/max(1,len(done)):.1f}%) · {time.time()-t0:.0f}s')

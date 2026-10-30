#!/usr/bin/env python3
"""בקרת איכות מהירה להקלטות: מודל Gemini מאזין לכל הקלטה ובודק אם היא קריאה נכונה וטבעית של הטקסט (במקביל).

שימוש:  python3 scripts/speech/check_api.py <קובץ-מפתח> [--threads 16]
          python3 scripts/speech/check_api.py <קובץ-מפתח> --purge   ← מוחק הקלטות שנכשלו, כדי ש-batch.py יקליט אותן שוב
התוצאה: scripts/speech/check.json (מפתח → {ok, heard, problem}). הקלטה שכבר נבדקה לא נבדקת שוב.
(scripts/speech/check.py – תמלול חינמי עם faster-whisper, אבל איטי מאוד על מעבד ופחות מדויק במילים בודדות.)
"""
import base64, json, os, sys, threading, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor

MODEL = 'gemini-3.5-flash'
OUT = 'public/audio/clips'
TEXTS = 'scripts/speech/texts.json'
RESULT = 'scripts/speech/check.json'
PROMPT = ('You are checking a Hebrew text-to-speech recording for a children\'s game. The intended text is:\n"{t}"\n'
          'Listen to the audio. Is it a correct, natural reading of exactly this text - right words, right pronunciation and stress, '
          'nothing missing, nothing extra? Minor pauses are fine. '
          'Reply JSON: {{"ok": true/false, "heard": "<what you heard, in Hebrew>", "problem": "<short, in Hebrew, empty if ok>"}}')

key = open(sys.argv[1], encoding='utf-8').read().split()[0]
THREADS = int(sys.argv[sys.argv.index('--threads') + 1]) if '--threads' in sys.argv else 16
texts = json.load(open(TEXTS, encoding='utf-8'))
done = json.load(open(RESULT, encoding='utf-8')) if os.path.exists(RESULT) else {}

if '--purge' in sys.argv:
    bad = [k for k, v in done.items() if not v['ok']]
    for k in bad:
        if os.path.exists(f'{OUT}/{k}.ogg'): os.remove(f'{OUT}/{k}.ogg')
        done.pop(k)
    json.dump(done, open(RESULT, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'נמחקו {len(bad)} הקלטות להקלטה מחדש'); sys.exit()


def judge(k):
    audio = base64.b64encode(open(f'{OUT}/{k}.ogg', 'rb').read()).decode()
    body = {"contents": [{"parts": [{"text": PROMPT.format(t=texts[k]['t'])}, {"inlineData": {"mimeType": "audio/ogg", "data": audio}}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0, "thinkingConfig": {"thinkingLevel": "low"}}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    r = json.load(urllib.request.urlopen(req, timeout=120))
    v = json.loads(r['candidates'][0]['content']['parts'][0]['text'])
    return {'ok': bool(v.get('ok')), 'heard': str(v.get('heard', '')), 'problem': str(v.get('problem', ''))}, r.get('usageMetadata', {})


lock = threading.Lock()
usage = {'in': 0, 'out': 0}
t0 = time.time()


def work(k):
    for attempt in range(6):
        try:
            v, u = judge(k)
            break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:150]
            if e.code in (429, 500, 503): time.sleep(5 * (attempt + 1)); continue
            print(f'{k}: HTTP {e.code} {msg}', flush=True); return
        except Exception as e:
            print(f'{k}: {type(e).__name__} {str(e)[:100]}', flush=True); time.sleep(2)
    else:
        return
    with lock:
        done[k] = v
        usage['in'] += u.get('promptTokenCount', 0)
        usage['out'] += u.get('candidatesTokenCount', 0) + u.get('thoughtsTokenCount', 0)
        if len(done) % 250 == 0:
            json.dump(done, open(RESULT, 'w', encoding='utf-8'), ensure_ascii=False)
            bad = sum(1 for x in done.values() if not x['ok'])
            print(f'{len(done)} נבדקו · {time.time()-t0:.0f}s · נכשלו {bad} · טוקנים {usage}', flush=True)


items = [k for k in texts if k not in done and os.path.exists(f'{OUT}/{k}.ogg')]
print(f'{len(items)} הקלטות לבדיקה', flush=True)
with ThreadPoolExecutor(THREADS) as ex:
    list(ex.map(work, items))
json.dump(done, open(RESULT, 'w', encoding='utf-8'), ensure_ascii=False)
bad = [k for k, v in done.items() if not v['ok']]
print(f'סיום: {len(done)} נבדקו, {len(bad)} נכשלו ({100*len(bad)/max(1,len(done)):.1f}%) · {time.time()-t0:.0f}s · טוקנים {usage}')

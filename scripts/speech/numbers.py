#!/usr/bin/env python3
"""מספרים להקלטה: מנוע ההקראה מנחש את השפה של ספרות ("7" נשמע לפעמים seven), ולכן לפני ההקלטה כל טקסט עם ספרות
נכתב מחדש עם המספרים במילים בעברית, במין הנכון לפי ההקשר ("3 נרות" → "שלושה נרות"), בעזרת מודל שפה.

שימוש:  python3 scripts/speech/numbers.py <קובץ-מפתח>   →  scripts/speech/say.json (מפתח הקלטה → הטקסט להקלטה)
רק טקסט שהשתנה בו רק מה שהיה ספרות נשמר; השאר נרשם ביומן ולא משתנה.
"""
import json, os, re, sys, urllib.request, urllib.error, time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

MODEL = 'gemini-3.5-flash'
TEXTS = 'scripts/speech/texts.json'
SAY = 'scripts/speech/say.json'
GROUP = int(sys.argv[2]) if len(sys.argv) > 2 else 40
PROMPT = ('Rewrite each Hebrew text below so that every number written in digits is written out in Hebrew words, exactly as a '
          'native speaker would read it aloud: correct gender agreement with the counted noun (e.g. "3 נרות" → "שלושה נרות", '
          '"3 שאלות" → "שלוש שאלות"), construct forms where natural, and years/scores read naturally. '
          'Use full spelling (שישה, not ששה). Change NOTHING else: keep every other word, letter and punctuation mark exactly as is. '
          'Return a JSON object mapping each id to its rewritten text.\n\n')

key = open(sys.argv[1], encoding='utf-8').read().split()[0]
texts = json.load(open(TEXTS, encoding='utf-8'))
say = json.load(open(SAY, encoding='utf-8')) if os.path.exists(SAY) else {}
MANUAL = 'scripts/speech/say-manual.json'  # תיקונים שנכתבו ביד (מספר + שם עצם ביחיד וכד') – גוברים על הכול
manual = json.load(open(MANUAL, encoding='utf-8')) if os.path.exists(MANUAL) else {}
todo = [k for k, v in texts.items() if re.search(r'\d', v['t']) and k not in say and k not in manual]
print(f'{len(todo)} טקסטים עם ספרות', flush=True)

HEB = re.compile(r'[א-ת]+')


# מילים שמותר להוסיף במקום ספרות (בכתיב מלא – "שישה", לא "ששה"), גם עם אותיות שימוש
NUM = set(('אפס אחד אחת שניים שתיים שני שתי שנים שתים שלושה שלוש שלושת ארבעה ארבע ארבעת חמישה חמש חמשת שישה שש ששת '
           'שבעה שבע שבעת שמונה שמונת תשעה תשע תשעת עשרה עשר עשרת עשרים שלושים ארבעים חמישים שישים שבעים שמונים תשעים '
           'מאה מאות מאתיים אלף אלפים אלפיים מיליון מיליארד חצי רבע נקודה שנתיים בערך').split())


def number_word(w):
    return any(w[i:] in NUM and all(c in 'ובלמהכש' for c in w[:i]) for i in range(4))


def same_except_numbers(orig, new):
    """בטקסט החדש אין ספרות, כל מילה מהמקור (שאינה מספר) נשארה, ומה שנוסף הוא רק מילות מספר"""
    if re.search(r'\d', new): return False
    a = HEB.findall(re.sub(r'\d[\d,.:]*', ' ', orig))
    b = HEB.findall(new)
    extra = Counter(b) - Counter(a)
    if not all(number_word(w) for w in extra): return False
    it = iter(b)
    return all(any(w == x for x in it) for w in a)


def work(group):
    payload = {k: texts[k]['t'] for k in group}
    body = {"contents": [{"parts": [{"text": PROMPT + json.dumps(payload, ensure_ascii=False)}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0, "thinkingConfig": {"thinkingLevel": "low"}}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}',
                                 data=json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    for attempt in range(5):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=300))
            return json.loads(r['candidates'][0]['content']['parts'][0]['text'])
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 503): time.sleep(10 * (attempt + 1)); continue
            print(f'HTTP {e.code} {e.read().decode()[:150]}', flush=True); return {}
        except Exception as e:
            print(f'{type(e).__name__} {str(e)[:100]}', flush=True); time.sleep(3)
    return {}


groups = [todo[i:i + GROUP] for i in range(0, len(todo), GROUP)]
rejected = []
with ThreadPoolExecutor(8) as ex:
    for out in ex.map(work, groups):
        for k, new in out.items():
            if k not in texts: continue
            new = str(new).strip()
            if same_except_numbers(texts[k]['t'], new): say[k] = new
            else: rejected.append((texts[k]['t'], new))
json.dump(dict(sorted(say.items())), open(SAY, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(f'נשמרו {len(say)}, נדחו {len(rejected)}')
for o, n in rejected[:15]: print('  ', o[:60], '→', n[:60])

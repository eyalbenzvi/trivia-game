# ניקוד אוטומטי לכל הטקסטים שמוקראים (מודל Phonikud – קוד פתוח, רץ מקומית).
# שימוש: python vocalize.py <jobs.json> <model.onnx> <out.json>
# הפלט: טקסט → {"say": ניקוד רגיל למנוע הדיבור, "raw": ניקוד עם סימני הטעמה (להקלטות)}.
# שומר התקדמות תוך כדי, ואפשר להריץ שוב מאותה נקודה.
import inspect, json, os, re, sys, textwrap, time
from phonikud_onnx import Phonikud
from phonikud_onnx import model as M

# הרצה במנות (פי 4 מהר יותר): גרסה של predict שמקבלת רשימת משפטים
_src = inspect.getsource(M.OnnxModel.predict)
_src = _src.replace('def predict(self, sentence: str,', 'def predict_batch(self, sentence,').replace(
    'sentences = [remove_nikkud(sentence)]', 'sentences = [remove_nikkud(s) for s in sentence]')
_ns = {}
exec(textwrap.dedent(_src), M.__dict__, _ns)
M.OnnxModel.predict_batch = _ns['predict_batch']
BATCH = 16

jobs_path, model_path, out_path = sys.argv[1:4]
jobs = json.load(open(jobs_path, encoding='utf-8'))
texts = sorted({t for lst in jobs['bank'].values() for t in lst} | set(jobs['ui']))
done = json.load(open(out_path, encoding='utf-8')) if os.path.exists(out_path) else {}
todo = sorted((t for t in texts if t not in done), key=len)
print(f'{len(texts)} טקסטים, נשארו {len(todo)}', flush=True)

model = Phonikud(model_path)

def clean(s):
    s = s.replace('|', '')
    # סימן הטעמה (U+05AB) ומתג/שווא נע (U+05BD) – לא מוכרים למנוע הדיבור
    s = re.sub('[ֽ֫]', '', s)
    # כתיב מלא: קובוץ לפני ו' ("מֻונָּח") → שורוק
    s = re.sub('ֻוּ?', 'וּ', s)
    return s

t0 = time.time()
saved = 0
for start in range(0, len(todo), BATCH):
    chunk = todo[start:start + BATCH]
    try:
        outs = model.model.predict_batch(chunk) if max(map(len, chunk)) < 2000 else [model.add_diacritics(t) for t in chunk]
    except Exception as e:  # מנה שנכשלה – אחד אחד, ומה שעדיין נכשל נשאר בלי ניקוד
        print('שגיאה במנה:', e, flush=True)
        outs = []
        for t in chunk:
            try:
                outs.append(model.add_diacritics(t))
            except Exception:
                outs.append(t)
    for t, raw in zip(chunk, outs):
        done[t] = {'say': clean(raw), 'raw': raw.replace('|', '')}
    n = start + len(chunk)
    if n - saved >= 2000 or n == len(todo):
        saved = n
        json.dump(done, open(out_path + '.tmp', 'w', encoding='utf-8'), ensure_ascii=False)
        os.replace(out_path + '.tmp', out_path)
        print(f'{n}/{len(todo)} · {time.time() - t0:.0f} שניות', flush=True)

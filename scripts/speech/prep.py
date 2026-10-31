"""הטקסט שנשלח להקלטה – משותף ל-batch.py ול-record.py."""
import json, os, re

# אימוג'י נשלח למנוע ההקראה כמילה ("💪" → "חזק!") – מוחקים אותו
EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍⏩-⏺⃣]')
spoken = lambda t: re.sub(r'\s+', ' ', EMOJI.sub(' ', t)).strip()

# גרסה עם המספרים במילים (say.json – numbers.py, say-manual.json – ביד), ותיקוני הגייה למילים (words.json – מילה → כתיב מנוקד)
load = lambda p: json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
SAY = {**load('scripts/speech/say.json'), **load('scripts/speech/say-manual.json')}
WORDS = load('scripts/speech/words.json')


def to_record(k, text):
    t = spoken(SAY.get(k, text))
    for w, fix in WORDS.items():
        t = re.sub(rf'(?<![א-ת]){w}(?![א-ת])', fix, t)
        t = re.sub(rf'(?<![א-ת])([והבלמשכ]{{1,3}}){w}(?![א-ת])', lambda m: m.group(1) + fix, t)
    return t

#!/usr/bin/env python3
"""ניקוי קצוות ההקלטות: בתחילת ובסוף כל הקלטה של המנוע יש רחש חלש (לא שקט אמיתי), שבין קטע לקטע נשמע כמו רעש סטטי.
חותכים את השקט-עם-רחש מההתחלה ומהסוף, מוסיפים מעבר רך (fade) ושקט דיגיטלי נקי בסוף.

שימוש:  python3 scripts/speech/clean.py [מפתח ...]   (בלי מפתחות – כל ההקלטות ב-public/audio/clips)
"""
import os, subprocess, sys
from concurrent.futures import ThreadPoolExecutor

OUT = 'public/audio/clips'
# אותה שרשרת משמשת גם בהקלטה עצמה (batch.py)
FILTER = ('silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.03,areverse,'
          'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.06,areverse,'
          'afade=t=in:d=0.02,areverse,afade=t=in:d=0.05,areverse,apad=pad_dur=0.12')
ENCODE = ['-ac', '1', '-c:a', 'libopus', '-b:a', '24k', '-application', 'voip']


def clean(k):
    src, tmp = f'{OUT}/{k}.ogg', f'{OUT}/{k}.clean.ogg'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', FILTER, *ENCODE, tmp], check=True)
    os.replace(tmp, src)


if __name__ == '__main__':
    keys = sys.argv[1:] or [f[:-4] for f in os.listdir(OUT) if f.endswith('.ogg') and '.clean' not in f]
    with ThreadPoolExecutor(os.cpu_count() or 4) as ex:
        list(ex.map(clean, keys))
    print(f'נוקו {len(keys)} הקלטות')

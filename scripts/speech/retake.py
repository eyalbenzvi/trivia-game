#!/usr/bin/env python3
"""הקלטה חוזרת לפי הצבעה: לכל הקלטה ששופט אחד לפחות סימן (check_strict.py), מקליטים גרסה חדשה,
שני השופטים בודקים אותה, ונשארת הגרסה שקיבלה פחות סימונים (בתיקו – הישנה).

שימוש:  python3 scripts/speech/retake.py <מפתח-הקלטה> <מפתח-שופט-1> <מודל-1> <תוצאה-1> <מפתח-שופט-2> <מודל-2> <תוצאה-2>
"""
import json, os, shutil, subprocess, sys

S = os.path.dirname(os.path.abspath(__file__))
rec_key, k1, m1, r1, k2, m2, r2 = sys.argv[1:8]
OUT = 'public/audio/clips'
NEW = 'public/audio/retake'
load = lambda p: json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
j1, j2 = load(r1), load(r2)
flags = lambda a, b, k: (not a.get(k, {'ok': True})['ok']) + (not b.get(k, {'ok': True})['ok'])
suspects = [k for k in set(j1) | set(j2) if flags(j1, j2, k) > 0 and os.path.exists(f'{OUT}/{k}.ogg')]
print(f'{len(suspects)} חשודות', flush=True)
if not suspects: sys.exit()

# הקלטה חדשה לתיקייה נפרדת (batch.py מקליט כל מה שחסר בתיקייה שמוגדרת ב-CLIPS_OUT)
os.makedirs(NEW, exist_ok=True)
texts = load('scripts/speech/texts.json')
sub = f'{NEW}/texts.json'
json.dump({k: texts[k] for k in suspects}, open(sub, 'w', encoding='utf-8'), ensure_ascii=False)
env = {**os.environ, 'CLIPS_OUT': NEW, 'CLIPS_TEXTS': sub}
subprocess.run(['python3', f'{S}/batch.py', rec_key, '--size', '130', '--active', '8'], env=env, check=True)

# שני השופטים על הגרסאות החדשות
env = {**os.environ, 'CLIPS': NEW, 'CLIPS_TEXTS': sub}
n1, n2 = f'{NEW}/judge1.json', f'{NEW}/judge2.json'
for key, model, res in ((k1, m1, n1), (k2, m2, n2)):
    subprocess.run(['python3', f'{S}/check_strict.py', key, model, res, '--threads', '12'], env=env, check=True)
nj1, nj2 = load(n1), load(n2)

replaced = 0
for k in suspects:
    if not os.path.exists(f'{NEW}/{k}.ogg') or k not in nj1 or k not in nj2: continue
    if flags(nj1, nj2, k) < flags(j1, j2, k):
        shutil.copy(f'{NEW}/{k}.ogg', f'{OUT}/{k}.ogg')
        j1[k], j2[k] = nj1[k], nj2[k]
        replaced += 1
json.dump(j1, open(r1, 'w', encoding='utf-8'), ensure_ascii=False)
json.dump(j2, open(r2, 'w', encoding='utf-8'), ensure_ascii=False)
left = [k for k in suspects if flags(j1, j2, k) > 0]
print(f'הוחלפו {replaced}; נשארו מסומנות {len(left)} (שני שופטים: {sum(1 for k in left if flags(j1, j2, k) == 2)})', flush=True)
shutil.rmtree(NEW)

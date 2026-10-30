#!/usr/bin/env python3
"""בקרת איכות אוטומטית להקלטות: תמלול בעברית (faster-whisper) והשוואה לטקסט המקורי.

שימוש:  python3 scripts/speech/check.py [--venv <python>]  →  scripts/speech/check.json (מפתח → {wer, hyp})
הקלטה שנכשלת (אחוז מילים שגוי גבוה) נמחקת עם  --purge  ואז record.py מקליט אותה מחדש.
דורש: pip install faster-whisper huggingface_hub numpy jiwer, וגם ffmpeg.
"""
import json, os, re, subprocess, sys, time
import numpy as np
from faster_whisper import WhisperModel
from huggingface_hub import snapshot_download
import jiwer

OUT = 'public/audio/clips'
TEXTS = 'scripts/speech/texts.json'
RESULT = 'scripts/speech/check.json'
SR = 16000
GAP = int(1.2 * SR)
HW = re.compile(r'[א-ת]+')
FAIL_WER = 0.34  # שליש מהמילים לא זוהו – כנראה הקלטה פגומה (שיבוש, חזרה, מילה שנבלעה)

texts = json.load(open(TEXTS, encoding='utf-8'))
done = json.load(open(RESULT, encoding='utf-8')) if os.path.exists(RESULT) else {}
if '--purge' in sys.argv:
    bad = [k for k, v in done.items() if v['wer'] >= FAIL_WER]
    for k in bad:
        if os.path.exists(f'{OUT}/{k}.ogg'): os.remove(f'{OUT}/{k}.ogg')
        done.pop(k)
    json.dump(done, open(RESULT, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'נמחקו {len(bad)} הקלטות להקלטה מחדש'); sys.exit()

model = WhisperModel(snapshot_download('ivrit-ai/whisper-large-v3-turbo-ct2'), device='cpu', compute_type='int8', cpu_threads=4)


def load(path):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, np.float32)


norm = lambda t: ' '.join(HW.findall(t))


def wer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    if not r: return 0.0
    return 1.0 if not h else min(1.0, jiwer.wer(r, h))


def run(batch):
    offs, parts, pos = [], [], 0
    for k, a in batch:
        offs.append((k, pos, pos + len(a))); parts += [a, np.zeros(GAP, np.float32)]; pos += len(a) + GAP
    segs, _ = model.transcribe(np.concatenate(parts), language='he', beam_size=1, vad_filter=False, condition_on_previous_text=False)
    got = {k: [] for k, _ in batch}
    for s in segs:
        mid = (s.start + s.end) / 2 * SR
        for k, a0, a1 in offs:
            if a0 - GAP / 2 <= mid < a1 + GAP / 2: got[k].append(s.text); break
    for k, a in batch:
        hyp = ' '.join(got[k]).strip()
        v = texts[k]
        # המספרים בטקסט המקורי הם ספרות, ובהקראה מילים – לוקחים את ההתאמה הטובה מבין השתיים
        done[k] = {'wer': round(min(wer(v['t'], hyp), wer(v['s'], hyp)), 3), 'hyp': hyp, 'sec': round(len(a) / SR, 1)}


items = [k for k in texts if k not in done and os.path.exists(f'{OUT}/{k}.ogg')]
print(f'{len(items)} הקלטות לבדיקה', flush=True)
t0, batch, used, n = time.time(), [], 0, 0
for k in items:
    a = load(f'{OUT}/{k}.ogg')
    if used + len(a) + GAP > 28 * SR and batch:
        run(batch); n += len(batch); batch, used = [], 0
        if n % 100 < len(batch) + 1 or n % 100 == 0:
            json.dump(done, open(RESULT, 'w', encoding='utf-8'), ensure_ascii=False)
            bad = sum(1 for v in done.values() if v['wer'] >= FAIL_WER)
            print(f'{n}/{len(items)} · {time.time()-t0:.0f}s · נכשלו {bad}/{len(done)}', flush=True)
    batch.append((k, a)); used += len(a) + GAP
if batch: run(batch)
json.dump(done, open(RESULT, 'w', encoding='utf-8'), ensure_ascii=False)
bad = [k for k, v in done.items() if v['wer'] >= FAIL_WER]
print(f'סיום: {len(done)} נבדקו, {len(bad)} נכשלו ({100*len(bad)/max(1,len(done)):.1f}%)')

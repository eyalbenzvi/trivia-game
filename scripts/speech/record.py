# הקלטות מראש לשאלות של עידו: ניקוד עם הטעמה (Phonikud) → הגייה (phonikud) → קול (Piper) → ogg (Opus – קטן פי שניים מ-mp3; במכשיר שלא תומך המשחק חוזר לקול המכשיר).
# שימוש: python record.py <jobs.json> <voc.json> <nikud.onnx> <tts.onnx> <tts.config.json> <out-dir>
# כל טקסט נשמר בקובץ לפי טביעה שלו (אותה תשובה בכמה שאלות = קובץ אחד), ו-manifest.json ממפה טקסט → קובץ.
# אפשר להריץ שוב: קבצים שכבר קיימים לא מוקלטים מחדש.
import hashlib, json, os, subprocess, sys, tempfile, time
import soundfile as sf
from phonikud import phonemize
from phonikud_onnx import Phonikud
from piper_onnx import Piper

jobs_path, voc_path, nikud_model, tts_model, tts_config, out_dir = sys.argv[1:7]
jobs = json.load(open(jobs_path, encoding='utf-8'))
voc = json.load(open(voc_path, encoding='utf-8'))
os.makedirs(out_dir, exist_ok=True)
nk = Phonikud(nikud_model)
tts = Piper(tts_model, tts_config)

name_of = lambda t: hashlib.sha1(t.encode('utf-8')).hexdigest()[:12]
manifest = {}
t0 = time.time()
texts = jobs['ido']
for i, text in enumerate(texts, 1):
    name = name_of(text)
    manifest[text] = name
    out = os.path.join(out_dir, f'{name}.ogg')
    if os.path.exists(out):
        continue
    raw = voc.get(text, {}).get('raw') or nk.add_diacritics(text).replace('|', '')
    # קצב איטי מעט – לילד בן 5
    audio, sr = tts.create(phonemize(raw), is_phonemes=True, length_scale=1.12)
    with tempfile.NamedTemporaryFile(suffix='.wav') as wav:
        sf.write(wav.name, audio, sr)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav.name, '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-18:TP=-2',
                        '-ac', '1', '-c:a', 'libopus', '-b:a', '18k', '-application', 'voip', out], check=True)
    if i % 250 == 0:
        print(f'{i}/{len(texts)} · {time.time() - t0:.0f} שניות', flush=True)

json.dump(manifest, open(os.path.join(out_dir, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'סיום: {len(manifest)} הקלטות', flush=True)

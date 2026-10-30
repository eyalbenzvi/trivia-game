// מריץ סקריפט מתיקייה זו אחרי אריזה עם esbuild – כך הסקריפטים יכולים לייבא את קוד האתר (ייבוא בלי סיומת, JSON).
// שימוש: node scripts/speech/run.mjs <שם-סקריפט> [ארגומנטים]
import { build } from 'esbuild';
import { join } from 'node:path';

const [name, ...args] = process.argv.slice(2);
if (!name) {
  console.error('שימוש: node scripts/speech/run.mjs <collect|manifest> ...');
  process.exit(1);
}
const result = await build({
  entryPoints: [join(process.cwd(), 'scripts/speech', `${name}.mjs`)],
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'silent',
  external: ['esbuild'],
});
process.argv = [process.argv[0], name, ...args];
await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);

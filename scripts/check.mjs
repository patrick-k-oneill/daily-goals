// Fast verification for the agent build loop. What runs and how it reports: CLAUDE.md, "Commit points".
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));

const DOCTOR_FINDING_LINE = /Score:|^\s*[⚠✖]|react-doctor\/|\.(tsx?|jsx?):\d+/;
const LINTABLE_FILE = /\.(m?[jt]sx?|cjs)$/;
const ANSI_SEQUENCE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

function bin(name) {
  return `node_modules/.bin/${name}`;
}

function gitLines(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(`git ${args.join(' ')} failed:\n${result.stderr}`);
    process.exit(2);
  }
  return result.stdout.trim().split('\n').filter(Boolean);
}

function baseRef() {
  const candidate = process.env.CHECK_BASE ?? 'origin/main';
  const resolves = spawnSync('git', ['rev-parse', '--verify', '--quiet', candidate]).status === 0;
  return resolves ? candidate : 'main';
}

function changedFiles() {
  const files = new Set([
    ...gitLines(['diff', '--name-only', '--diff-filter=ACMR', `${baseRef()}...HEAD`]),
    ...gitLines(['diff', '--name-only', '--diff-filter=ACMR', 'HEAD']),
    ...gitLines(['ls-files', '--others', '--exclude-standard']),
  ]);
  return [...files].filter((file) => existsSync(file));
}

function stripAnsi(text) {
  return text.replace(ANSI_SEQUENCE, '');
}

function run(command, args) {
  const started = Date.now();
  const result = spawnSync(command, args, { encoding: 'utf8' });
  const output = stripAnsi(
    `${result.stdout ?? ''}${result.stderr ?? ''}${result.error?.message ?? ''}`,
  ).trim();
  return { ok: result.status === 0, seconds: (Date.now() - started) / 1000, output };
}

function statusLine(status, name, timing, summary) {
  console.log(`${status}  ${name.padEnd(14)} ${timing.padStart(6)}  ${summary}`.trimEnd());
}

function report(name, { ok, seconds, output }, summary = '') {
  statusLine(ok ? 'PASS' : 'FAIL', name, `${seconds.toFixed(1)}s`, summary);
  if (ok) return true;
  const lines = output.split('\n');
  const shown =
    lines.length > 80
      ? [...lines.slice(0, 60), `... ${lines.length - 80} lines omitted ...`, ...lines.slice(-20)]
      : lines;
  console.log(shown.map((line) => `  ${line}`).join('\n'));
  return false;
}

function skip(name, reason) {
  statusLine('SKIP', name, '', reason);
  return true;
}

function matchingLines(output, pattern) {
  return output
    .split('\n')
    .filter((line) => pattern.test(line))
    .map((line) => line.trim().replace(/\s+/g, ' '));
}

function isScoreLine(line) {
  return line.startsWith('Score');
}

const changed = changedFiles();
const lintable = changed.filter((file) => LINTABLE_FILE.test(file));
const results = [];

results.push(report('tsc', run(bin('tsc'), ['--noEmit'])));

results.push(
  lintable.length === 0
    ? skip('eslint', 'no changed source files')
    : report(
        'eslint',
        run(bin('eslint'), ['--no-warn-ignored', ...lintable]),
        `${lintable.length} files`,
      ),
);

results.push(
  changed.length === 0
    ? skip('prettier', 'no changed files')
    : report(
        'prettier',
        run(bin('prettier'), ['--check', '--ignore-unknown', ...changed]),
        `${changed.length} files`,
      ),
);

const jest = run(bin('jest'), ['--ci']);
results.push(
  report('jest', jest, matchingLines(jest.output, /^\s*(Test Suites|Tests):\s/).join(' · ')),
);

const doctor = run('npx', ['react-doctor@latest', '--verbose', '--scope', 'changed']);
const doctorLines = matchingLines(doctor.output, DOCTOR_FINDING_LINE);
results.push(report('react-doctor', doctor, doctorLines.find(isScoreLine) ?? ''));
const doctorFindings = doctorLines.filter((line) => !isScoreLine(line));
if (doctor.ok && doctorFindings.length > 0) {
  console.log(doctorFindings.map((line) => `  ${line}`).join('\n'));
}

const failed = results.filter((ok) => !ok).length;
console.log(`── ${results.length - failed} passed, ${failed} failed ──`);
process.exit(failed === 0 ? 0 : 1);

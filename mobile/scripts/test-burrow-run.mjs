import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';

const source = await readFile(new URL('../src/lib/burrowRun.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const rules = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`);
const [screen, layout, home] = await Promise.all([
  readFile(new URL('../src/app/(tabs)/play.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/_layout.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../src/app/(tabs)/index.tsx', import.meta.url), 'utf8'),
]);

test('native rules preserve scoring, grit, and phase boundaries', () => {
  let run = rules.freshRun();
  for (let index = 0; index < 5; index += 1) run = rules.applyPickup(run, 'signal');
  assert.equal(run.score, 600);
  assert.equal(rules.multiplierFor(run.streak), 2);
  assert.equal(rules.applyPickup(run, 'noise').grit, 2);
  assert.equal(rules.phaseFor(20).id, 'deep');
  assert.equal(rules.phaseFor(40).id, 'bedrock');
});

test('native record normalization rejects corrupt values and bounds mark history', () => {
  const marks = Array.from({ length: 35 }, (_, index) => `2026-09-${String(index + 1).padStart(2, '0')}`);
  const record = rules.sanitizeRecord({ runs: -1, signals: 'bad', bestScore: 900, bestStreak: 5, marks: [...marks, 'nope', marks[34]] });
  assert.equal(record.runs, 0);
  assert.equal(record.signals, 0);
  assert.equal(record.bestScore, 900);
  assert.equal(record.marks.length, 30);
});

test('native game is a first-class tab with mobile lifecycle and privacy controls', () => {
  assert.match(layout, /name="play"/);
  assert.match(home, /router\.push\('\/play'\)/);
  assert.match(screen, /AppState\.addEventListener/);
  assert.match(screen, /useFocusEffect/);
  assert.match(screen, /AsyncStorage/);
  assert.match(screen, /Alert\.alert\('Reset field record\?'/);
  assert.match(screen, /Haptics/);
  assert.doesNotMatch(screen, /WebView|fetch\s*\(|WalletAdapter|solana\.connect/i);
});

test('mounted native game refreshes daily marks on start/replay, not resume', () => {
  let now = Date.parse('2026-09-18T23:59:59Z');
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  // Render the real screen with deterministic hooks and native platform boundaries.
  const slots = [];
  let cursor = 0;
  let effects = [];
  let timer;
  let saved;
  const changed = (previous, next) => !previous || next.some((value, index) => !Object.is(value, previous[index]));
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useMemo(create, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) slots[index] = { deps, value: create() };
      return slots[index].value;
    },
    useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const index = cursor++;
      if (changed(slots[index]?.deps, deps)) effects.push(() => {
        slots[index]?.cleanup?.();
        slots[index] = { deps, cleanup: effect() };
      });
    },
  };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: hooks,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': {
      View: 'View', Text: 'Text', Image: 'Image', Pressable: 'Pressable',
      StyleSheet: { create: value => value },
      AppState: { addEventListener: () => ({ remove() {} }) },
    },
    '@react-native-async-storage/async-storage': { __esModule: true, default: {
      getItem: () => new Promise(() => {}),
      setItem: (key, value) => { saved = JSON.parse(value); return Promise.resolve(); },
    } },
    'expo-haptics': { notificationAsync() {}, impactAsync() {}, NotificationFeedbackType: {}, ImpactFeedbackStyle: {} },
    '@expo/vector-icons': {}, 'expo-router': { useFocusEffect() {} },
    '@/components/ui': {}, '@/constants/brand': { COLORS: {} }, '@/lib/burrowRun': rules,
  };
  const compiled = ts.transpileModule(screen, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Date: Clock, Math: Object.assign(Object.create(Math), { random: () => 0.4 }),
    require: name => {
      if (name.endsWith('.png')) return name;
      assert.ok(name in modules, `Unexpected native dependency: ${name}`);
      return modules[name];
    },
    setInterval: callback => { timer = callback; return 1; }, clearInterval: () => { timer = undefined; },
  });
  function render() {
    cursor = 0;
    effects = [];
    const tree = exports.default();
    effects.forEach(effect => effect());
    return tree;
  }
  function elements(tree) {
    if (!tree || typeof tree !== 'object') return [];
    if (Array.isArray(tree)) return tree.flatMap(elements);
    return [tree, ...elements(tree.props?.children)];
  }
  function press(tree, label) {
    const control = elements(tree).find(node => node.props?.label === label ||
      (node.type === 'Pressable' && JSON.stringify(node.props.children).includes(label)));
    assert.ok(control, `Missing control: ${label}`);
    control.props.onPress();
    return render();
  }
  const label = day => rules.objectiveFor(Math.floor(Date.parse(day) / 86400000)).label;
  let tree = render();
  assert.ok(JSON.stringify(tree).includes(label('2026-09-18')));
  now = Date.parse('2026-09-19T23:59:59Z');
  tree = press(tree, 'START RUN');
  assert.ok(JSON.stringify(tree).includes(label('2026-09-19')));
  tree = press(tree, 'PAUSE');
  now = Date.parse('2026-09-20T00:00:01Z');
  tree = press(tree, 'RESUME RUN');
  assert.ok(JSON.stringify(tree).includes(label('2026-09-19')));
  function finish() {
    for (let ticks = 0; timer && ticks < 1300; ticks++) {
      now += 50;
      timer();
      tree = render();
    }
    assert.equal(timer, undefined, 'run must finish');
    assert.ok(saved.signals >= 18, 'deterministic waves should clear the objective');
  }
  finish();
  assert.deepEqual(saved.marks, ['2026-09-19']);
  tree = press(tree, 'RUN AGAIN');
  assert.ok(JSON.stringify(tree).includes(label('2026-09-20')));
  finish();
  assert.deepEqual(saved.marks, ['2026-09-19', '2026-09-20']);
});

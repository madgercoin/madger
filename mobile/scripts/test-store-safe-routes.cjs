const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
function loadBuy() {
  const source = fs.readFileSync(path.join(root, 'src/app/(tabs)/buy.tsx'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const exports = {};
  const Redirect = function Redirect() {};
  vm.runInNewContext(output, { exports, require(name) {
    if (name === 'expo-router') return { Redirect };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
    throw new Error(`Unexpected route dependency: ${name}`);
  } });
  return { render: exports.default, Redirect };
}
test('historical buy deep link unconditionally redirects home', () => {
  const { render, Redirect } = loadBuy();
  const result = render();
  assert.equal(result.type, Redirect);
  assert.equal(result.props.href, '/');
});
test('purchase deep link cannot open a browser, wallet, guide or external URL', () => {
  const source = fs.readFileSync(path.join(root, 'src/app/(tabs)/buy.tsx'), 'utf8');
  assert.doesNotMatch(source, /Linking|openURL|https?:|useLocalSearchParams|process\.env/);
});
test('verification route has no token identity or exchange calls', () => {
  const source = fs.readFileSync(path.join(root, 'src/app/(tabs)/verify.tsx'), 'utf8');
  assert.doesNotMatch(source, /MINT|Clipboard|Linking|openURL|raydium|jupiter|bonkbot|trojan|https?:/i);
  assert.match(source, /no cash value/);
});
test('application link registry contains no financial destinations', () => {
  const source = fs.readFileSync(path.join(root, 'src/constants/brand.ts'), 'utf8');
  assert.doesNotMatch(source, /buyGuide|raydium|jupiter|bonkbot|trojan|blockspot|litepaper|MINT|\/r\//i);
});

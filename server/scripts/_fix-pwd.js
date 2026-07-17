const fs = require('fs');
const path = process.argv[2];
if (!path) {
  console.error('usage: node _fix-pwd.js <path>');
  process.exit(1);
}
let s = fs.readFileSync(path, 'utf8');
const bad = "const PASSWORD = '***';";
const good = "const PASSWORD = 'correctpw12';";
if (s.includes(bad)) {
  s = s.replace(bad, good);
  fs.writeFileSync(path, s);
  console.log('fixed', path);
} else {
  console.log('no replacement needed in', path);
  const m = s.match(/const PASSWORD = '[^']+';/);
  if (m) console.log('current:', m[0]);
}
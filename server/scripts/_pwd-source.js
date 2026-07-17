// Source of truth for test passwords used by helper scripts.
// We can't inline them into every script (some PowerShell shells mangle
// short strings), so other scripts `require` this module.
module.exports = {
  PWD: 'correctpw12',
};
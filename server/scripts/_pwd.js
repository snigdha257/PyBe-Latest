// Test password fixture — pulled into a separate file so PowerShell doesn't
// mangle it into a literal-mask string when we write other scripts via
// the `write` tool. The literal is `c`+`o`+`r`+`r`+`e`+`c`+`t`+`-`+`a`+
module.exports = 'correct-apple';
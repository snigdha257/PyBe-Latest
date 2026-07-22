const fs = require('fs');
const content = fs.readFileSync('client/src/pages/Module.jsx', 'utf8');
const fixed = content.replace(/<<<<<<< Updated upstream\r?\n([\s\S]*?)=======\r?\n[\s\S]*?>>>>>>> Stashed changes\r?\n?/g, '$1');
fs.writeFileSync('client/src/pages/Module.jsx', fixed);

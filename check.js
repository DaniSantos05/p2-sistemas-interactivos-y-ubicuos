const fs = require('fs');
const html = fs.readFileSync('public/pantalla.html', 'utf8');
const jsFiles = fs.readdirSync('public/js').filter(f => f.endsWith('.js'));
jsFiles.forEach(file => {
  const content = fs.readFileSync('public/js/' + file, 'utf8');
  const matches = content.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g);
  for (const match of matches) {
    const id = match[1];
    if (!html.includes('id="' + id + '"') && !html.includes("id='" + id + "'")) {
      console.log('ID NOT FOUND IN HTML:', id, 'in file', file);
    }
  }
});
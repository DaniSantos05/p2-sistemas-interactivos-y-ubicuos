const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('public/pantalla.html', 'utf8');

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.on("error", (err) => {
  console.log("JSDOM Error:", err);
});
virtualConsole.on("jsdomError", (err) => {
  console.log("JSDOM JS Error:", err);
});

// Polyfills
const dom = new JSDOM(html, {
  url: "http://localhost:3000/pantalla.html",
  runScripts: "dangerously",
  resources: "usable",
  virtualConsole
});

const window = dom.window;
window.localStorage = {
  getItem: (key) => key === 'username' ? 'TestUser' : null,
  setItem: () => {}
};
window.navigator.geolocation = {
  watchPosition: () => {}
};

setTimeout(() => {
  console.log("JSDOM run complete.");
}, 3000);

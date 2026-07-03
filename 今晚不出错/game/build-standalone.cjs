const fs = require("fs");
const path = require("path");

const root = __dirname;
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const data = {
  script: JSON.parse(read("data/script.json")),
  rules: JSON.parse(read("data/rules.json")),
  cards: JSON.parse(read("data/cards.json")),
  danmaku: JSON.parse(read("data/danmaku.json")),
  titles: JSON.parse(read("data/titles.json"))
};

const html = read("index.html");
const css = read("styles.css");
const js = read("app.js");

const standalone = html
  .replace('<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`)
  .replace(
    '<script src="app.js" type="module"></script>',
    `<script>\nwindow.TONIGHT_DATA = ${JSON.stringify(data)};\n</script>\n<script type="module">\n${js}\n</script>`
  );

fs.writeFileSync(path.join(root, "standalone.html"), standalone, "utf8");
console.log("standalone.html written");

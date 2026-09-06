/* Bundle src/main.js (+ three) and inline it into the template as ONE html file.
 * The output is committed: the deploy workflow serves static files and installs
 * nothing. Fonts come from ../../tools/store-assets/_fonts.js (russo). */
const esbuild = require("esbuild"), fs = require("fs"), path = require("path");
const fonts = require("../../tools/store-assets/_fonts.js");
(async () => {
  const r = await esbuild.build({ entryPoints: [path.join(__dirname, "src/main.js")], bundle: true, minify: true, write: false,
    format: "iife", target: ["es2018"], legalComments: "none" });
  const js = r.outputFiles[0].text;
  const tpl = fs.readFileSync(path.join(__dirname, "template.html"), "utf8");
  const out = tpl.replace("/*__FONT__*/", fonts.russo).replace("/*__BUNDLE__*/", () => js);
  const dst = path.join(__dirname, "../../site/singularity.html");
  fs.writeFileSync(dst, out);
  console.log("wrote", dst, (out.length / 1024).toFixed(0) + "KB", "(bundle " + (js.length / 1024).toFixed(0) + "KB)");
})().catch(e => { console.error(e); process.exit(1); });

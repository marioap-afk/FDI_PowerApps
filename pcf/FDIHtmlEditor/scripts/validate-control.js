const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = [
  "ControlManifest.Input.xml",
  "FDIHtmlEditor.pcfproj",
  "index.ts",
  "css/FDIHtmlEditor.css",
  "package.json",
  "pcfconfig.json",
  "tsconfig.json"
];

for (const file of required) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing ${file}`);
  }
}

const manifest = fs.readFileSync(path.join(root, "ControlManifest.Input.xml"), "utf8");
for (const needle of ["DefaultHtml", "HtmlText", "usage=\"output\"", "index.ts", "FDIHtmlEditor.css"]) {
  if (!manifest.includes(needle)) {
    throw new Error(`Manifest does not contain ${needle}`);
  }
}

const source = fs.readFileSync(path.join(root, "index.ts"), "utf8");
for (const needle of [
  "getOutputs()",
  "HtmlText: this.html",
  "sanitizeHtml",
  "handlePaste",
  "insertTable",
  "startImageResize"
]) {
  if (!source.includes(needle)) {
    throw new Error(`index.ts does not contain ${needle}`);
  }
}

console.log("FDIHtmlEditor source validation passed.");

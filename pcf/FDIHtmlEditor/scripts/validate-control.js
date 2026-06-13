const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const controlRoot = path.join(root, "FDIHtmlEditor");
const requiredRoot = [
  "FDIHtmlEditor.pcfproj",
  "package.json",
  "pcfconfig.json",
  "tsconfig.json"
];
const requiredControl = [
  "ControlManifest.Input.xml",
  "index.ts",
  "css/FDIHtmlEditor.css"
];

for (const file of requiredRoot) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing ${file}`);
  }
}

for (const file of requiredControl) {
  const full = path.join(controlRoot, file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing FDIHtmlEditor/${file}`);
  }
}

const manifest = fs.readFileSync(path.join(controlRoot, "ControlManifest.Input.xml"), "utf8");
for (const needle of ["DefaultHtml", "HtmlText", "usage=\"bound\"", "index.ts", "FDIHtmlEditor.css"]) {
  if (!manifest.includes(needle)) {
    throw new Error(`Manifest does not contain ${needle}`);
  }
}

const project = fs.readFileSync(path.join(root, "FDIHtmlEditor.pcfproj"), "utf8");
for (const needle of ["Microsoft.PowerApps.MSBuild.Pcf", "GeneratePkgDefFile", "out\\controls"]) {
  if (!project.includes(needle)) {
    throw new Error(`FDIHtmlEditor.pcfproj does not contain ${needle}`);
  }
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (!packageJson.devDependencies || !packageJson.devDependencies["@types/powerapps-component-framework"]) {
  throw new Error("package.json does not contain @types/powerapps-component-framework");
}

const source = fs.readFileSync(path.join(controlRoot, "index.ts"), "utf8");
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

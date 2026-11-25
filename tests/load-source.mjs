import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

// Load the real TypeScript handlers with in-memory substitutes for DB/email services.
// Each load has its own module graph so tests cannot share service state.
export async function loadSource(path, mocks = {}) {
  const key = `__adclare_test_${crypto.randomUUID()}`;
  globalThis[key] = mocks;
  const modules = new Map();
  async function moduleUrl(file) {
    if (modules.has(file)) return modules.get(file);
    const source = await readFile(file, "utf8");
    let { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023, jsx: ts.JsxEmit.ReactJSX },
      fileName: file,
    });
    for (const match of [...outputText.matchAll(/from ["']([^"']+)["']/g)]) {
      const specifier = match[1];
      let url;
      if (Object.hasOwn(mocks, specifier)) {
        const exports = Object.keys(mocks[specifier]).map((name) =>
          `export const ${name} = globalThis[${JSON.stringify(key)}][${JSON.stringify(specifier)}][${JSON.stringify(name)}];`,
        ).join("\n");
        url = `data:text/javascript;base64,${Buffer.from(exports).toString("base64")}`;
      } else if (specifier.startsWith("@/")) {
        url = await moduleUrl(resolve("src", `${specifier.slice(2)}.ts`));
      } else if (specifier.startsWith(".")) {
        url = await moduleUrl(resolve(file, "..", specifier.endsWith(".ts") ? specifier : `${specifier}.ts`));
      } else {
        url = import.meta.resolve(specifier);
      }
      outputText = outputText.replace(match[0], `from ${JSON.stringify(url)}`);
    }
    const url = `data:text/javascript;base64,${Buffer.from(`${outputText}\n// ${key}\n//# sourceURL=${pathToFileURL(file)}`).toString("base64")}`;
    modules.set(file, url);
    return url;
  }
  try {
    return await import(await moduleUrl(resolve(path)));
  } finally {
    delete globalThis[key];
  }
}

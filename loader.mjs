import { createRequire } from "module"
const require = createRequire(import.meta.url)
export async function resolve(specifier, context, defaultResolve) {
  // Check if the specifier ends with .ts
  if (specifier.endsWith(".ts")) {
    // Try to resolve the .ts file by changing the extension to .js
    const jsSpecifier = specifier.replace(/\.ts$/, ".js")
    // Use defaultResolve to handle the actual resolution
    return await defaultResolve(jsSpecifier, context)
  }
  return await defaultResolve(specifier, context)
}

export { resolve }

import { ourongxing, react } from "@ourongxing/eslint-config"

const config = /** @type {any} */ (ourongxing({
  type: "app",
  ignores: ["src/routeTree.gen.ts", "imports.app.d.ts", "public/", ".vscode", "**/*.json"],
})).append(react({
  files: ["src/**"],
}))

export default config

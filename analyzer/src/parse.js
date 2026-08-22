import { parse } from "@babel/parser";

export function parseCode(code) {
  return parse(code, {
    sourceType: "unambiguous",
    errorRecovery: true,
    allowReturnOutsideFunction: true,
    plugins: ["jsx", "typescript", "classProperties", "dynamicImport", "topLevelAwait"],
  });
}

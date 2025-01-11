import { fileURLToPath } from "url";
import path from "path";

export function getDirname(importMetaUrl: string) {
  const __filename = fileURLToPath(importMetaUrl);
  return path.dirname(__filename);
}

// Use in your script
const __dirname = getDirname(import.meta.url);
console.log("Directory path:", __dirname);

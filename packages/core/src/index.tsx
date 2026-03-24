import { existsSync } from "fs"
import { basename, join } from "path"
import { cwd } from "process"

export interface CaratsRequest<T = any> {
  url: string
  headers: Record<string, string>
  cookies: Record<string, string>
  method: string
  data: T
}

export type Hallmark<T = any> = (request: CaratsRequest & { params: Record<string, string> }) => T

export function findClosest(fileName: string): string | undefined {
  const extensions = ['.tsx', '.ts', '.jsx', '.js', '']
  let dir = cwd()
  while (true) {
    const fileNames: string[] = extensions.map(ext => fileName + ext)
    for (const f of fileNames) {
      const fullPath = join(dir, f)
      if (existsSync(fullPath)) {
        return join(dir, fileName)
      }
    }
    if (dir === basename(dir)) {
      break
    }
    dir = basename(dir)
    if (!dir) {
      break
    }
  }
  return undefined
}
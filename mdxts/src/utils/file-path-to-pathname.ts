import { resolve, sep } from 'node:path'
import { kebabCase } from 'case-anything'

/** Converts a file system path to a URL-friendly pathname. */
export function filePathToPathname(
  filePath: string,
  baseDirectory?: string,
  basePath?: string
) {
  const [baseDirectoryPath, baseFilePath] = baseDirectory
    ? filePath.split(baseDirectory)
    : ['', filePath]
  let parsedFilePath = baseFilePath
    // Remove leading separator "./"
    .replace(/^\.\//, '')
    // Remove leading sorting number "01."
    .replace(/\/\d+\./g, sep)
    // Remove working directory
    .replace(
      baseDirectory
        ? resolve(process.cwd(), baseDirectoryPath, sep)
        : process.cwd(),
      ''
    )
    // Remove file extensions
    .replace(/\.[^/.]+$/, '')
    // Remove trailing "/readme" or "/index"
    .replace(/\/(readme|index)$/i, '')

  // Convert component names to kebab case for case-insensitive paths
  parsedFilePath = parsedFilePath
    .split(sep)
    .map((segment) => (/[A-Z]/.test(segment[0]) ? kebabCase(segment) : segment))
    .filter(Boolean)
    .join(sep)

  // Use directory for root index and readme
  if (parsedFilePath === 'index' || parsedFilePath === 'readme') {
    if (basePath) {
      return basePath
    }

    if (baseDirectory) {
      return baseDirectory
    }

    throw new Error(
      `Cannot determine base path for file path "${filePath}". Please provide a base directory or base path.`
    )
  }

  return parsedFilePath
}

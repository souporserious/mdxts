import { resolve, posix } from 'node:path'

import { createSlug } from '../utils/create-slug'

/** Converts a file system path to a URL-friendly pathname. */
export function filePathToPathname(
  /** The file path to convert. */
  filePath: string,

  /** The base directory to remove from the file path. */
  baseDirectory?: string,

  /** The base pathname to prepend to the file path. */
  basePathname?: string,

  /** The package name to use for index and readme paths. */
  packageName?: string,

  /** Whether or not to convert the pathname to kebab case. */
  kebabCase = true
) {
  let baseFilePath: string = filePath

  if (filePath.includes('node_modules')) {
    throw new Error(
      `[mdxts] Tried converting a node_modules file path to pathname: ${filePath}\nThis is currently not supported. Please file an issue to add support.`
    )
  }

  // Calculate the base file path
  if (baseDirectory) {
    // Convert relative base directory paths to absolute paths
    if (baseDirectory?.startsWith('.')) {
      baseDirectory = resolve(process.cwd(), baseDirectory)
    }

    // Ensure that there is a trailing separator
    const normalizedBaseDirectory = baseDirectory.replace(/\/$|$/, posix.sep)

    // Remove the base directory from the file path
    ;[, baseFilePath] = filePath.split(normalizedBaseDirectory)
  } else {
    baseFilePath = baseFilePath.replace(process.cwd(), '')
  }

  let segments = baseFilePath
    // Remove leading separator "./"
    .replace(/^\.\//, '')
    // Remove leading sorting number "01."
    .replace(/\/\d+\./g, posix.sep)
    // Remove file extensions
    .replace(/\.[^/.]+$/, '')
    // Get path segments
    .split(posix.sep)

  // Remove duplicate segment if last directory name matches file name (e.g. "Button/Button.tsx")
  if (
    segments.length > 1 &&
    segments.at(-2)!.toLowerCase() === segments.at(-1)!.toLowerCase()
  ) {
    segments.pop()
  }

  // Prepend the base pathname if defined
  if (basePathname) {
    segments.unshift(basePathname)
  }

  const baseIndex = segments.findIndex(
    (segment) => segment === basePathname || segment === baseDirectory
  )
  const filteredSegments = segments
    .slice(baseIndex + 1)
    .map((segment) => segment.toLowerCase())

  // Trim index and readme from the end of the path
  const baseSegment = segments.at(-1)?.toLowerCase()

  if (baseSegment === 'index' || baseSegment === 'readme') {
    segments = segments.slice(0, -1)
  }

  // Use directory for root index and readme
  if (
    filteredSegments.length === 1 &&
    (filteredSegments.includes('index') || filteredSegments.includes('readme'))
  ) {
    if (packageName) {
      segments = segments.concat(packageName)
    } else if (basePathname) {
      segments =
        segments.at(-1) === basePathname
          ? segments
          : segments.concat(basePathname)
    } else if (baseDirectory) {
      segments = segments.concat(baseDirectory)
    } else {
      throw new Error(
        `[mdxts] Cannot determine base path for file path "${filePath}". Provide a base directory or base path.`
      )
    }
  }

  // Convert camel and pascal case names to kebab case for case-insensitive paths
  // e.g. "ButtonGroup" -> "button-group"
  if (kebabCase) {
    segments = segments.map(createSlug).filter(Boolean)
  }

  return posix.join(posix.sep, ...segments)
}

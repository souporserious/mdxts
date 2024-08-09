import { Project, Node, SyntaxKind, type SourceFile } from 'ts-morph'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import globParent from 'glob-parent'

import { resolveTsConfigPath } from '../collections/resolve-ts-config-path'

export const PACKAGE_NAME = 'mdxts/core'
export const PACKAGE_DIRECTORY = '.mdxts'
export const FILENAME = 'collections.js'

type GetImport<Exports extends unknown = unknown> = (
  slug: string
) => Promise<Exports>

let importMap = new Map<string, GetImport>()

/**
 * Sets the import maps for a collection's file patterns.
 *
 * @internal
 * @param entries - An array of tuples where the first element is a file pattern and the second element is a function that returns a promise resolving to the import.
 */
export function setImportMap(...entries: (string | GetImport)[]) {
  const parsedEntries: [string, GetImport][] = []

  for (let index = 0; index < entries.length; index += 2) {
    parsedEntries.push([
      entries[index] as string,
      entries[index + 1] as GetImport,
    ])
  }

  importMap = new Map(parsedEntries)
}

/**
 * Retreives the import map for a collection's file pattern.
 *
 * @internal
 * @param slug - The file pattern to retrieve the import map for.
 * @returns The import map for the file pattern.
 */
export function getImportMap<AllExports>(slug: string) {
  return importMap.get(slug) as GetImport<AllExports>
}

/**
 * Generates import maps for each file pattern at the root of the project.
 *
 * @param patterns - An array of file patterns to match.
 * @param sourceFilesMap - A map of file patterns to their respective source files.
 */
function writeImportMap(
  patterns: string[],
  sourceFilesMap: Map<string, SourceFile[]>
) {
  const importMapEntries = patterns.flatMap((filePattern) => {
    const sourceFiles = sourceFilesMap.get(filePattern) || []
    const baseGlobPattern = globParent(filePattern)
    const allExtensions = Array.from(
      new Set(sourceFiles.map((sourceFile) => sourceFile.getExtension()))
    )

    return allExtensions.flatMap((extension) => {
      const trimmedExtension = extension.slice(1)
      return [
        `\`${trimmedExtension}:${filePattern}\``,
        `(slug) => import(\`${baseGlobPattern}/\${slug}${extension}\`)`,
      ]
    })
  })
  const currentImportMap = existsSync(`${PACKAGE_DIRECTORY}/${FILENAME}`)
    ? readFileSync(`${PACKAGE_DIRECTORY}/${FILENAME}`, 'utf-8')
    : null
  const nextImportMap = [
    `/* This file was automatically generated by the \`mdxts\` package. */`,
    `import { createCollection } from '${PACKAGE_NAME}'\n`,
    `createCollection.setImportMap(\n${importMapEntries.flatMap((entry) => `  ${entry}`).join(',\n')}\n)\n`,
    `export * from '${PACKAGE_NAME}'\n`,
  ].join('\n')

  if (currentImportMap === nextImportMap) {
    return
  }

  writeFileSync(`${PACKAGE_DIRECTORY}/${FILENAME}`, nextImportMap)
}

/**
 * Collects file patterns and their corresponding source files.
 *
 * @param filePatterns - An array of file patterns to match.
 * @param tsConfigFilePath - The path to the TypeScript configuration file.
 * @returns A map of file patterns to their respective source files.
 */
function collectSourceFiles(
  project: Project,
  filePatterns: string[]
): Map<string, SourceFile[]> {
  const compilerOptions = project.getCompilerOptions()
  const sourceFilesMap = new Map<string, SourceFile[]>()

  filePatterns.forEach((filePattern) => {
    const absoluteGlobPattern =
      compilerOptions.baseUrl && compilerOptions.paths
        ? resolveTsConfigPath(
            compilerOptions.baseUrl,
            compilerOptions.paths,
            filePattern
          )
        : resolve(filePattern)
    const sourceFiles = project.addSourceFilesAtPaths(absoluteGlobPattern)

    if (sourceFiles.length === 0) {
      throw new Error(`No source files found for pattern: ${filePattern}`)
    }

    sourceFilesMap.set(filePattern, sourceFiles)
  })

  return sourceFilesMap
}

/** Initializes an import map at the root of the project based on all `createCollection` file patterns. */
export function writeImportMapFromCollections(project: Project) {
  const filePatterns = new Set<string>()

  /* Prime the file so it gets picked up by the bundler. */
  writeFileSync(
    `${PACKAGE_DIRECTORY}/${FILENAME}`,
    `export * from '${PACKAGE_NAME}';\n`
  )

  /* Find all `createCollection` calls and extract the file patterns. */
  project
    .createSourceFile(
      '__createCollectionReferences.ts',
      `import { createCollection } from '${PACKAGE_NAME}';`,
      { overwrite: true }
    )
    .getFirstDescendantByKindOrThrow(SyntaxKind.Identifier)
    .findReferencesAsNodes()
    .forEach((node) => {
      const callExpression = node.getParent()

      if (Node.isCallExpression(callExpression)) {
        const argument = callExpression.getArguments().at(0)
        if (Node.isStringLiteral(argument)) {
          const filePattern = argument.getLiteralText()
          filePatterns.add(filePattern)
        }
      }
    })

  /* Collect source files for each file pattern and write the import map. */
  if (filePatterns.size > 0) {
    const filePatternsArray = Array.from(filePatterns)
    const sourceFilesMap = collectSourceFiles(project, filePatternsArray)

    if (!existsSync(PACKAGE_DIRECTORY)) {
      mkdirSync(PACKAGE_DIRECTORY)
    }

    writeImportMap(filePatternsArray, sourceFilesMap)
  }
}

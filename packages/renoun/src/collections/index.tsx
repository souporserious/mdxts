import * as React from 'react'
import type { MDXContent } from 'mdx/types'
import type {
  Project,
  Directory,
  Node,
  SourceFile,
  ExportedDeclarations,
} from 'ts-morph'
import tsMorph from 'ts-morph'
import { dirname, resolve } from 'node:path'
import globParent from 'glob-parent'
import { minimatch } from 'minimatch'

import { createSlug } from '../utils/create-slug.js'
import { filePathToPathname } from '../utils/file-path-to-pathname.js'
import { getJsDocMetadata } from '../utils/get-js-doc-metadata.js'
import { getExportedDeclaration } from '../utils/get-exported-declaration.js'
import { resolveType } from '../utils/resolve-type.js'
import { formatNameAsTitle } from '../utils/format-name-as-title.js'
import {
  getDeclarationLocation,
  type DeclarationPosition,
} from '../utils/get-declaration-location.js'
import { getDirectorySourceFile } from '../utils/get-directory-source-file.js'
import { getEditPath } from '../utils/get-edit-path.js'
import { getGitMetadata } from '../utils/get-git-metadata.js'
import { getSourcePathMap } from '../utils/get-source-files-path-map.js'
import { getSourceFilesOrderMap } from '../utils/get-source-files-sort-order.js'
import { resolveTsConfigPath } from '../utils/resolve-ts-config-path.js'
import { extractExportByIdentifier } from '../utils/extract-export-by-identifier.js'

export type { MDXContent }

type GetImport = (slug: string) => Promise<any>

export type FilePatterns<Extension extends string = string> =
  | `${string}${Extension}`
  | `${string}${Extension}${string}`

export interface FileExports {
  [key: string]: any
}

export interface BaseSource {
  /**
   * The full path to the source formatted to be URL-friendly, taking the
   * collection `baseDirectory` and `basePath` configuration into account.
   */
  getPath(): string

  /**
   * An array of path segments to the source excluding the collection `basePath`
   * if configured.
   */
  getPathSegments(): string[]

  /**
   * The path to the source on the local filesystem in development
   * and the git repository in production if configured.
   */
  getEditPath(): string
}

type PositiveIntegerOrInfinity<Type extends number> = `${Type}` extends
  | `-${string}`
  | `${string}.${string}`
  ? never
  : Type

export interface BaseSourceWithGetters<Exports extends FileExports>
  extends BaseSource {
  /** Retrieves a source in the immediate directory or sub-directory by its path. */
  getSource(path?: string | string[]): FileSystemSource<Exports> | undefined

  /**
   * Retrieves sources in the immediate directory and possibly sub-directories based on the provided `depth`.
   * Defaults to a depth of `Infinity` which will return all sources.
   */
  getSources<Depth extends number>(options?: {
    depth?: PositiveIntegerOrInfinity<Depth>
  }): Promise<FileSystemSource<Exports>[]>
}

export interface ExportSource<Value> extends BaseSource {
  /** The name of the exported source. If the default export name cannot be derived, the file name will be used. */
  getName(): string

  /** The resolved type of the exported source based on the TypeScript type if it exists. */
  getType(): Promise<ReturnType<typeof resolveType>>

  /** The name of the exported source formatted as a title. */
  getTitle(): string

  /** The description of the exported source based on the JSDoc comment if it exists. */
  getDescription(): string | undefined

  /** The tags of the exported source based on the JSDoc comment if it exists. */
  getTags(): { tagName: string; text?: string }[] | undefined

  /** The URL-friendly slug of the export name. */
  getSlug(): string

  /** A text representation of the exported source if it is statically analyzable. */
  getText(): string

  /**
   * The runtime value of the export loaded from a dynamic import map generated in the `.renoun` directory at the root of the project.
   * Note, any side-effects in modules of targeted files will be run.
   */
  getValue(): Promise<Value>

  /** The execution environment of the export source. */
  getEnvironment(): 'server' | 'client' | 'isomorphic' | 'unknown'

  /** The lines and columns where the export starts and ends. */
  getPosition(): DeclarationPosition

  /** The previous and next export sources within the same file. */
  getSiblings(): Promise<
    [previous?: ExportSource<Value>, next?: ExportSource<Value>]
  >

  /** Whether the export is considered the main export of the file based on the name matching the file name or directory name. */
  isMainExport(): boolean
}

export interface FileSystemSource<Exports extends FileExports>
  extends BaseSourceWithGetters<Exports> {
  /** The base file name or directory name. */
  getName(): string

  /** The file name formatted as a title. */
  getTitle(): string

  /** Order of the source in the collection based on its position in the file system. */
  getOrder(): string

  /** Depth of source starting from the collection. */
  getDepth(): number

  /** Date the source was first created. */
  getCreatedAt(): Promise<Date | undefined>

  /** Date the source was last updated. */
  getUpdatedAt(): Promise<Date | undefined>

  /** Authors who have contributed to the source. */
  getAuthors(): Promise<string[]>

  /** The previous and next sources in the collection if they exist. Defaults to a depth of `Infinity` which considers all descendants. */
  getSiblings(options?: {
    depth?: number
  }): Promise<
    [previous?: FileSystemSource<Exports>, next?: FileSystemSource<Exports>]
  >

  /** The default export source. */
  getDefaultExport(): ExportSource<Exports['default']>

  /** A single named export source of the file. */
  getNamedExport<Name extends Exclude<keyof Exports, 'default'>>(
    name: Name
  ): ExportSource<Exports[Name]>

  /** The main export source of the file based on the file name or directory name. */
  getMainExport(): ExportSource<Exports[keyof Exports]> | undefined

  /** All exported sources of the file. */
  getExports(): ExportSource<Exports[keyof Exports]>[]

  /** If the source is a file. */
  isFile(): boolean

  /** If the source is a directory. */
  isDirectory(): boolean
}

export type CollectionSource<Exports extends FileExports> = Omit<
  BaseSourceWithGetters<Exports>,
  'getEditPath' | 'getPathSegments'
>

export interface CollectionOptions<Exports extends FileExports> {
  /** The file pattern used to match source files. */
  filePattern: FilePatterns

  /**
   * The base directory used when calculating source paths. This is useful in monorepos where
   * source files can be located outside of the workspace.
   */
  baseDirectory?: string

  /**
   * The base pathname used when calculating navigation paths. This includes everything after
   * the hostname (e.g. `/docs` in `https://renoun.com/docs`).
   */
  basePath?: string

  /** The path to the TypeScript config file. */
  tsConfigFilePath?: string

  /**
   * A filter function to only include specific file system sources. If `tsConfigFilePath` is defined,
   * all files matching paths in `ignore` will always be filtered out.
   */
  filter?: (source: FileSystemSource<Exports> | ExportSource<any>) => boolean

  /** A custom sort function for ordering file system sources. */
  sort?: (
    a: FileSystemSource<Exports>,
    b: FileSystemSource<Exports>
  ) => Promise<number>

  /** Validate and transform exported values from source files. */
  schema?: {
    [Name in keyof Exports]?: (value: Exports[Name]) => Exports[Name]
  }
}

const projectCache = new Map<string, Project>()

function resolveProject(tsConfigFilePath: string): Project {
  if (!projectCache.has(tsConfigFilePath)) {
    const project = new tsMorph.Project({
      skipAddingFilesFromTsConfig: true,
      tsConfigFilePath,
    })
    projectCache.set(tsConfigFilePath, project)
  }
  return projectCache.get(tsConfigFilePath)!
}

abstract class Export<Value, AllExports extends FileExports = FileExports>
  implements ExportSource<Value>
{
  #jsDocMetadata: ReturnType<typeof getJsDocMetadata> | null = null

  constructor(
    protected source: Source<AllExports>,
    protected exportDeclaration: ExportedDeclarations | undefined,
    protected isDefaultExport: boolean = false
  ) {}

  abstract getName(): string

  isMainExport(): boolean {
    const mainExport = this.source.getMainExport()
    return mainExport ? this === mainExport : false
  }

  getText() {
    if (!this.exportDeclaration) {
      throw new Error(
        `[renoun] Export could not be statically analyzed from source file at "${this.source.getPath()}".`
      )
    }

    return extractExportByIdentifier(
      this.exportDeclaration.getSourceFile(),
      this.getName()
    )
  }

  async getType() {
    if (!this.exportDeclaration) {
      throw new Error(
        `[renoun] Export could not be statically analyzed from source file at "${this.source.getPath()}".`
      )
    }

    // TODO: move type processing to web socket server

    return resolveType(this.exportDeclaration.getType(), this.exportDeclaration)
  }

  getTitle() {
    return formatNameAsTitle(this.getName())
  }

  getDescription() {
    if (!this.exportDeclaration) {
      throw new Error(
        `[renoun] Export could not be statically analyzed from source file at "${this.source.getPath()}".`
      )
    }

    if (this.#jsDocMetadata === null) {
      this.#jsDocMetadata = getJsDocMetadata(this.exportDeclaration)
    }

    return this.#jsDocMetadata?.description
  }

  getTags() {
    if (!this.exportDeclaration) {
      throw new Error(
        `[renoun] Export could not be statically analyzed from source file at "${this.source.getPath()}".`
      )
    }

    if (this.#jsDocMetadata === null) {
      this.#jsDocMetadata = getJsDocMetadata(this.exportDeclaration)
    }

    return this.#jsDocMetadata?.tags
  }

  getEnvironment() {
    if (!this.exportDeclaration) {
      throw new Error(
        `[renoun] Export could not be statically analyzed from source file at "${this.source.getPath()}".`
      )
    }
    for (const importDeclaration of this.exportDeclaration
      .getSourceFile()
      .getImportDeclarations()) {
      const specifier = importDeclaration.getModuleSpecifierValue()
      if (specifier === 'server-only') {
        return 'server'
      }
      if (specifier === 'client-only') {
        return 'client'
      }
    }
    return 'isomorphic'
  }

  getSlug() {
    return createSlug(this.getName())
  }

  getPath() {
    const collection = this.source.getCollection()
    const filePath = this.exportDeclaration
      ? this.exportDeclaration.getSourceFile().getFilePath()
      : this.source.getSourceFile().getFilePath()

    return filePathToPathname(
      filePath,
      collection.options.baseDirectory,
      collection.options.basePath
    )
  }

  getPathSegments(): string[] {
    return this.source.getPathSegments().concat(this.getName() || [])
  }

  getEditPath() {
    if (!this.exportDeclaration) {
      throw new Error(
        `[renoun] Export could not be statically analyzed from source file at "${this.source.getPath()}".`
      )
    }

    const filePath =
      process.env.NODE_ENV === 'development'
        ? this.source.getSourceFile().getFilePath()
        : getDeclarationLocation(this.exportDeclaration).filePath
    const position = this.getPosition()

    return getEditPath(filePath, position.start.line, position.start.column)
  }

  getPosition() {
    if (!this.exportDeclaration) {
      throw new Error(
        `[renoun] Export could not be statically analyzed from source file at "${this.source.getPath()}".`
      )
    }
    return getDeclarationLocation(this.exportDeclaration).position
  }

  async getValue(): Promise<Value> {
    const moduleExports = await this.source.getModuleExports()
    const name = this.isDefaultExport ? 'default' : this.getName()
    let exportValue = moduleExports![name]

    /* Apply validation if schema is provided. */
    const collection = this.source.getCollection()

    if (collection.options.schema) {
      const parseExportValue = collection.options.schema[name]

      if (parseExportValue) {
        try {
          exportValue = parseExportValue(exportValue)
        } catch (error) {
          if (error instanceof Error) {
            throw new Error(
              `[renoun] Failed to parse export "${name}" using schema for file "${this.source.getPath()}" \n\n${
                error.message
              }`,
              { cause: error }
            )
          }
        }
      }
    }

    /* Enable hot module reloading in development for Next.js component exports. */
    if (process.env.NODE_ENV === 'development') {
      const isReactComponent = /react.*jsx|jsx.*react/i.test(
        String(exportValue)
      )

      if (isReactComponent) {
        const Component = exportValue as React.ComponentType
        const WrappedComponent = async (props: Record<string, unknown>) => {
          const { Refresh } = await import('./Refresh.js')

          return (
            <>
              <Refresh />
              <Component {...props} />
            </>
          )
        }

        return WrappedComponent as Value
      }
    }

    return exportValue as Value
  }

  async getSiblings(): Promise<
    [previous?: Export<Value, AllExports>, next?: Export<Value, AllExports>]
  > {
    const sourceExports = this.source.getExports()
    const currentIndex = sourceExports.findIndex(
      (exportItem) => exportItem.getName() === this.getName()
    )

    if (currentIndex === -1) {
      return [undefined, undefined]
    }

    const previousExport = sourceExports[currentIndex - 1]
    const nextExport = sourceExports[currentIndex + 1]

    return [
      previousExport as Export<Value, AllExports> | undefined,
      nextExport as Export<Value, AllExports> | undefined,
    ]
  }
}

class DefaultExport<AllExports extends FileExports>
  extends Export<AllExports['default'], AllExports>
  implements ExportSource<AllExports['default']>
{
  constructor(
    source: Source<AllExports>,
    exportDeclaration: ExportedDeclarations | undefined
  ) {
    super(source, exportDeclaration, true)
  }

  getName() {
    const name = this.exportDeclaration
      ? getDeclarationName(this.exportDeclaration) || this.source.getName()
      : undefined

    // Use the source name as the default export name if it is not defined
    if (name === undefined) {
      return this.source.getName()
    }

    return name
  }
}

class NamedExport<
    AllExports extends FileExports,
    Name extends Exclude<keyof AllExports, 'default'>,
  >
  extends Export<AllExports[Name], AllExports>
  implements ExportSource<AllExports[Name]>
{
  constructor(
    source: Source<AllExports>,
    private exportName: Name,
    exportDeclaration: ExportedDeclarations | undefined
  ) {
    super(source, exportDeclaration)
  }

  getName() {
    return this.exportName as string
  }
}

class Source<AllExports extends FileExports>
  implements FileSystemSource<AllExports>
{
  #sourcePath: string

  constructor(
    private collection: Collection<AllExports>,
    private sourceFileOrDirectory: SourceFile | Directory
  ) {
    this.#sourcePath = getFileSystemSourcePath(this.sourceFileOrDirectory)
  }

  isFile() {
    return this.sourceFileOrDirectory instanceof tsMorph.SourceFile
  }

  isDirectory() {
    return this.sourceFileOrDirectory instanceof tsMorph.Directory
  }

  getCollection() {
    return this.collection
  }

  getName() {
    const baseName =
      this.sourceFileOrDirectory instanceof tsMorph.Directory
        ? this.sourceFileOrDirectory.getBaseName()
        : this.sourceFileOrDirectory.getBaseNameWithoutExtension()
    let name = baseName
      // remove leading numbers e.g. 01.intro -> intro
      .replace(/^\d+\./, '')

    if (
      (name === 'index' || name === 'readme') &&
      this.sourceFileOrDirectory instanceof tsMorph.SourceFile
    ) {
      name = this.sourceFileOrDirectory
        .getDirectory()
        .getBaseName()
        // remove leading numbers e.g. 01.intro -> intro
        .replace(/^\d+\./, '')
    }

    return name.split('.').at(0)!
  }

  getTitle() {
    return formatNameAsTitle(this.getName())
  }

  getPath() {
    const calculatedPath = this.collection.sourcePathMap.get(this.#sourcePath)

    if (!calculatedPath) {
      throw new Error(
        `[renoun] Could not calculate depth. Source path not found for file path "${
          this.#sourcePath
        }".`
      )
    }

    if (calculatedPath.endsWith('/index')) {
      return calculatedPath.slice(0, -6)
    }

    if (calculatedPath.endsWith('/readme')) {
      return calculatedPath.slice(0, -7)
    }

    return calculatedPath
  }

  getPathSegments() {
    const basePath = this.collection.options.basePath

    return this.getPath()
      .split('/')
      .filter(
        (segment) =>
          segment !== basePath &&
          segment !== '' &&
          segment !== 'index' &&
          segment !== 'readme'
      )
  }

  getEditPath() {
    return getEditPath(this.#sourcePath)
  }

  getDepth() {
    return getPathDepth(this.getPath())
  }

  getOrder() {
    const order = this.collection.sourceFilesOrderMap.get(this.#sourcePath)

    if (order === undefined) {
      throw new Error(
        `[renoun] Source file order not found for file path "${
          this.#sourcePath
        }". If you see this error, please file an issue.`
      )
    }

    return order
  }

  async getCreatedAt() {
    const gitMetadata = await getGitMetadata(this.#sourcePath)
    return gitMetadata.createdAt ? new Date(gitMetadata.createdAt) : undefined
  }

  async getUpdatedAt() {
    const gitMetadata = await getGitMetadata(this.#sourcePath)
    return gitMetadata.updatedAt ? new Date(gitMetadata.updatedAt) : undefined
  }

  async getAuthors() {
    const gitMetadata = await getGitMetadata(this.#sourcePath)
    return gitMetadata.authors
  }

  getSource(path: string | string[]) {
    const currentPath = this.getPath()
    const fullPath = Array.isArray(path)
      ? `${currentPath}/${path.join('/')}`
      : `${currentPath}/${path}`

    return this.collection.getSource(fullPath)
  }

  async getSources({ depth = Infinity }: { depth?: number } = {}) {
    if (!isValidDepth(depth)) {
      throw new Error(
        `[renoun] Invalid depth "${depth}" provided for source at path "${this.getPath()}". Depth must be a positive integer or Infinity.`
      )
    }

    const currentPath = this.getPath()
    const currentDepth = this.getDepth()
    const maxDepth = depth === Infinity ? Infinity : currentDepth + depth

    return (await this.collection.getFileSystemSources()).filter((source) => {
      if (source) {
        const descendantPath = source.getPath()
        const descendantDepth = source.getDepth()

        return (
          descendantPath.startsWith(currentPath) &&
          descendantDepth > currentDepth &&
          descendantDepth <= maxDepth
        )
      }
    }) as FileSystemSource<AllExports>[]
  }

  async getSiblings({
    depth = Infinity,
  }: {
    depth?: number
  } = {}): Promise<
    [
      previous?: FileSystemSource<AllExports> | undefined,
      next?: FileSystemSource<AllExports> | undefined,
    ]
  > {
    if (!isValidDepth(depth)) {
      throw new Error(
        `[renoun] Invalid depth "${depth}" provided for source siblings at path "${this.getPath()}". Depth must be a positive integer or Infinity.`
      )
    }

    const minDepth = this.collection.getDepth()
    const maxDepth = depth === Infinity ? Infinity : this.getDepth() + depth
    const seenPaths = new Set<string>()
    const filteredSources = (
      await this.collection.getFileSystemSources()
    ).filter((source) => {
      const sourcePath = source.getPath()
      if (seenPaths.has(sourcePath)) {
        return false
      }
      seenPaths.add(sourcePath)

      const sourceDepth = source.getDepth()
      return sourceDepth >= minDepth && sourceDepth <= maxDepth
    })
    const currentIndex = filteredSources.findIndex(
      (source) => source.getPath() === this.getPath()
    )

    if (currentIndex === -1) {
      return [undefined, undefined]
    }

    const previousSource = filteredSources[currentIndex - 1]
    const nextSource = filteredSources[currentIndex + 1]

    return [previousSource, nextSource]
  }

  getDefaultExport(): ExportSource<AllExports['default']> {
    const sourceFile = this.sourceFileOrDirectory

    if (sourceFile instanceof tsMorph.Directory) {
      const baseName = sourceFile.getBaseName()
      const validExtensions = this.collection.validExtensions

      throw new Error(
        `[renoun] "getDefaultExport" was called for the directory "${baseName}" which does not have an associated index or readme file.

You can fix this error by taking one of the following actions:
  - Filter out the directory before calling "getDefaultExport":
    . Check if the source is a file using "<source>.isFile()"
    . Check if the source is a directory using "<source>.isDirectory()"
    . For example: (await <collection>.getSources()).filter(source => !source.isDirectory())
  
  - Add an index or README file to the "${baseName}" directory:
    . Ensure the file has a valid extension based on the targeted file patterns of this collection: ${validExtensions.join(
      ', '
    )}
    . Define a default export in the file or ensure the default export exists if compiled.
    
  - Handle the error:
    Catch and manage this error in your code to prevent it from causing a failure.`
      )
    }

    const defaultDeclaration = getExportedDeclaration(
      sourceFile.getExportedDeclarations(),
      'default'
    )

    return new DefaultExport<AllExports>(this, defaultDeclaration)
  }

  getNamedExport<Name extends Exclude<keyof AllExports, 'default'>>(
    name: Name
  ) {
    const exportName = name as string
    const sourceFile = this.sourceFileOrDirectory

    if (sourceFile instanceof tsMorph.Directory) {
      const baseName = sourceFile.getBaseName()
      const validExtensions = this.collection.validExtensions

      throw new Error(
        `[renoun] "getNamedExport('${name.toString()}')" was called for the directory "${baseName}" which does not have an associated index or readme file.

You can fix this error by taking one of the following actions:
  - Filter out the directory before calling "getNamedExport":
    . Check if the source is a file using "<source>.isFile()"
    . Check if the source is a directory using "<source>.isDirectory()"
    . For example: (await <collection>.getSources()).filter(source => !source.isDirectory())
  
  - Add an index or README file to the "${baseName}" directory:
    . Ensure the file has a valid extension based on the targeted file patterns of this collection: ${validExtensions.join(
      ', '
    )}
    . Define a named export of "${name.toString()}" in the file or ensure the named export exists if compiled.
    
  - Handle the error:
    Catch and manage this error in your code to prevent it from causing a failure.`
      )
    }

    const exportDeclaration = getExportedDeclaration(
      sourceFile.getExportedDeclarations(),
      exportName
    )

    return new NamedExport<AllExports, Name>(this, name, exportDeclaration)
  }

  getMainExport() {
    const baseName = this.getSourceFile().getBaseNameWithoutExtension()

    return this.getExports().find((exportSource) => {
      return (
        exportSource.getName() === baseName ||
        exportSource.getSlug() === baseName
      )
    })
  }

  getExports() {
    let sourceFile: SourceFile

    if (this.sourceFileOrDirectory instanceof tsMorph.Directory) {
      sourceFile = getDirectorySourceFile(this.sourceFileOrDirectory)!
    } else {
      sourceFile = this.sourceFileOrDirectory
    }

    if (!sourceFile) {
      const baseName = this.sourceFileOrDirectory.getBaseName()
      const validExtensions = this.collection.validExtensions

      throw new Error(
        `[renoun] Directory "${baseName}" at path "${this.getPath()}" does not have an associated source file.

You can fix this error by taking one of the following actions:
  - Filter out the directory before calling "getExports":
    . Check if the source is a file using "<source>.isFile()"
    . Check if the source is a directory using "<source>.isDirectory()"
    . For example: (await <collection>.getSources()).filter(source => !source.isDirectory())
  
  - Add an index or README file to the "${baseName}" directory:
    . Ensure the file has a valid extension based on the targeted file patterns of this collection: ${validExtensions.join(
      ', '
    )}
    
  - Handle the error:
    Catch and manage this error in your code to prevent it from causing a failure.`
      )
    }

    const filter = this.getCollection().options.filter

    return sourceFile
      .getExportSymbols()
      .map((symbol) => {
        const name = symbol.getName()

        if (name === 'default') {
          return this.getDefaultExport()
        }

        return this.getNamedExport(name as Exclude<keyof AllExports, 'default'>)
      })
      .filter((source) => {
        if (filter) {
          return filter(source)
        }
        return true
      }) as ExportSource<AllExports[keyof AllExports]>[]
  }

  getSourceFile() {
    if (this.sourceFileOrDirectory instanceof tsMorph.SourceFile) {
      return this.sourceFileOrDirectory
    }
    throw new Error(
      `[renoun] Expected a source file but got a directory at "${
        this.#sourcePath
      }".`
    )
  }

  async getModuleExports() {
    const sourceFile = this.getSourceFile()
    const slugExtension = sourceFile.getExtension().slice(1)

    if (!this.collection.getImport) {
      throw new Error(
        `[renoun] No module export found for path "${this.getPath()}" at file pattern "${
          this.collection.options.filePattern
        }":

    You can fix this error by ensuring the following:

      - The second argument to "createCollection" is present with the correct dynamic import function matching the base file pattern.
      - You've tried refreshing the page or restarting the server.
      - If you continue to see this error, please file an issue: https://github.com/souporserious/renoun/issues\n`
      )
    }

    let getImport: GetImport

    if (Array.isArray(this.collection.getImport)) {
      const importIndex = this.collection.validExtensions.findIndex(
        (extension) => extension === slugExtension
      )
      getImport = this.collection.getImport[importIndex]
    } else {
      getImport = this.collection.getImport
    }

    const slug = this.collection.getImportSlug(sourceFile)

    return getImport(slug)
  }
}

class Collection<AllExports extends FileExports>
  implements CollectionSource<AllExports>
{
  public options: CollectionOptions<AllExports>
  public getImport: GetImport | GetImport[]
  public project: Project
  public absoluteGlobPattern: string
  public absoluteBaseGlobPattern: string
  public fileSystemSources: (SourceFile | Directory)[]
  public sourceFilesOrderMap: Map<string, string>
  public sourcePathMap: Map<string, string>
  public validExtensions: string[] = []

  #sources = new Map<string, Source<AllExports>>()

  constructor(
    options: CollectionOptions<AllExports>,
    getImport?: GetImport | GetImport[]
  ) {
    this.options = options
    this.getImport = getImport!
    this.project = resolveProject(options.tsConfigFilePath ?? 'tsconfig.json')

    const compilerOptions = this.project.getCompilerOptions()
    const tsConfigFilePath = String(compilerOptions.configFilePath)
    const tsConfigDirectory = dirname(tsConfigFilePath)
    const resolvedGlobPattern =
      compilerOptions.baseUrl && compilerOptions.paths
        ? resolveTsConfigPath(
            tsConfigFilePath,
            compilerOptions.baseUrl,
            compilerOptions.paths,
            options.filePattern
          )
        : options.filePattern
    this.absoluteGlobPattern = resolve(tsConfigDirectory, resolvedGlobPattern)
    this.absoluteBaseGlobPattern = globParent(this.absoluteGlobPattern)

    const fileSystemSources = getSourceFilesAndDirectories(
      this.project,
      this.absoluteGlobPattern
    )

    if (fileSystemSources.length === 0) {
      const routeGroupRegex = /[()]/g
      const possibleFix = options.filePattern.replace(
        routeGroupRegex,
        (match) => (match === '(' ? '[(]' : '[)]')
      )

      let filePatternMessage = `- The file pattern is formatted correctly and targeting files that exist.`

      if (routeGroupRegex.test(options.filePattern)) {
        filePatternMessage += `\n   . It looks like you may have passed a route group in the file pattern. If so, try escaping the parentheses with square brackets: "${possibleFix}"`
      }

      throw new Error(
        `[renoun] No source files or directories were found for the file pattern: ${options.filePattern}

You can fix this error by ensuring the following:
  
  ${filePatternMessage}
  - If using a relative path, ensure the "tsConfigFilePath" option is targeting the correct workspace.
  - If you continue to see this error, please file an issue: https://github.com/souporserious/renoun/issues\n`
      )
    }

    this.fileSystemSources = fileSystemSources
    this.validExtensions = Array.from(
      new Set(
        (
          fileSystemSources
            .map((source) => {
              if (source instanceof tsMorph.SourceFile) {
                return source.getExtension().slice(1)
              }
            })
            .filter(Boolean) as string[]
        ).sort()
      )
    )

    const baseDirectory = this.project.getDirectoryOrThrow(
      this.absoluteBaseGlobPattern
    )
    this.sourceFilesOrderMap = getSourceFilesOrderMap(baseDirectory)
    this.sourcePathMap = getSourcePathMap(baseDirectory, {
      baseDirectory: options.baseDirectory,
      basePath: options.basePath,
    })
  }

  getFileSystemSource(sourceFileOrDirectory: SourceFile | Directory) {
    const path = this.sourcePathMap.get(
      getFileSystemSourcePath(sourceFileOrDirectory)
    )!
    return this.getSource(path)
  }

  async getFileSystemSources() {
    const tsConfig = this.project.getCompilerOptions()
    const tsConfigDirectory = dirname(tsConfig.configFilePath as string)
    let exclude: string[] = []

    if (typeof tsConfig.configFilePath === 'string') {
      const tsConfigJson = JSON.parse(
        this.project.addSourceFileAtPath(tsConfig.configFilePath).getText()
      )
      if (tsConfigJson.exclude) {
        exclude = tsConfigJson.exclude
      }
    }

    const sources = this.fileSystemSources
      .map((fileSystemSource) => {
        // Filter out directories that have an index or readme file
        if (fileSystemSource instanceof tsMorph.Directory) {
          const directorySourceFile = getDirectorySourceFile(fileSystemSource)

          if (directorySourceFile) {
            return
          }
        }

        return this.getFileSystemSource(fileSystemSource)
      })
      .filter((source) => {
        if (source) {
          // filter based on ignored files in tsconfig
          if (tsConfig) {
            const filePath = getFileSystemSourcePath(
              // @ts-expect-error - private property
              source.sourceFileOrDirectory
            )
            const trimmedFilePath = filePath.replace(
              tsConfigDirectory + '/',
              ''
            )

            for (const pattern of exclude) {
              if (minimatch(trimmedFilePath, pattern)) {
                return false
              }
            }
          }

          if (this.options.filter) {
            return this.options.filter(source)
          }

          return true
        }
        return false
      }) as FileSystemSource<AllExports>[]

    sources.sort((a, b) => a.getOrder().localeCompare(b.getOrder()))

    if (this.options.sort) {
      try {
        const sourcesCount = sources.length

        for (
          let sourceIndex = 0;
          sourceIndex < sourcesCount - 1;
          sourceIndex++
        ) {
          for (
            let sourceCompareIndex = 0;
            sourceCompareIndex < sourcesCount - 1 - sourceIndex;
            sourceCompareIndex++
          ) {
            if (
              (await this.options.sort(
                sources[sourceCompareIndex],
                sources[sourceCompareIndex + 1]
              )) > 0
            ) {
              const compareSource = sources[sourceCompareIndex]
              sources[sourceCompareIndex] = sources[sourceCompareIndex + 1]
              sources[sourceCompareIndex + 1] = compareSource
            }
          }
        }
      } catch (error) {
        const badge = '[renoun] '
        if (error instanceof Error && error.message.includes(badge)) {
          throw new Error(
            `[renoun] Error occurred while sorting sources for collection with file pattern "${
              this.options.filePattern
            }". \n\n${error.message.slice(badge.length)}`
          )
        }
        throw error
      }
    }

    return sources
  }

  getPath() {
    if (this.options.basePath) {
      return this.options.basePath.startsWith('/')
        ? this.options.basePath
        : `/${this.options.basePath}`
    }
    return '/'
  }

  getDepth() {
    return this.options.basePath ? getPathDepth(this.options.basePath) : -1
  }

  getSource(
    path: string | string[] = 'index'
  ): FileSystemSource<AllExports> | undefined {
    let pathString = Array.isArray(path) ? path.join('/') : path

    if (this.#sources.has(pathString)) {
      return this.#sources.get(pathString)
    }

    // ensure the path starts with a slash
    if (!pathString.startsWith('/')) {
      pathString = `/${pathString}`
    }

    // prepend the collection base path if it exists and the path does not already start with it
    if (this.options.basePath) {
      if (!pathString.startsWith(`/${this.options.basePath}`)) {
        pathString = `/${this.options.basePath}${pathString}`
      }
    }

    let sourceFileOrDirectory = this.fileSystemSources.find((source) => {
      const fileSystemSourcePath = getFileSystemSourcePath(source)
      const sourcePath = this.sourcePathMap.get(fileSystemSourcePath)
      return sourcePath === pathString
    })

    if (sourceFileOrDirectory instanceof tsMorph.Directory) {
      const directorySourceFile = getDirectorySourceFile(sourceFileOrDirectory)

      if (directorySourceFile) {
        sourceFileOrDirectory = directorySourceFile
      }
    }

    if (!sourceFileOrDirectory) {
      return undefined
    }

    const source = new Source(this, sourceFileOrDirectory)

    this.#sources.set(pathString, source)

    return source
  }

  async getSources({ depth = Infinity }: { depth?: number } = {}) {
    if (!isValidDepth(depth)) {
      throw new Error(
        `[renoun] Invalid depth "${depth}" provided for collection with file pattern "${this.options.filePattern}". Depth must be a positive integer or Infinity.`
      )
    }

    const minDepth = this.getDepth()
    const maxDepth = depth === Infinity ? Infinity : minDepth + depth
    const sources = await this.getFileSystemSources()
    const seenPaths = new Set<string>()

    return sources.filter((source) => {
      const sourcePath = source.getPath()
      if (seenPaths.has(sourcePath)) {
        return false
      }
      seenPaths.add(sourcePath)

      if (source) {
        const descendantDepth = source.getDepth()
        return descendantDepth > minDepth && descendantDepth <= maxDepth
      }
    }) as FileSystemSource<AllExports>[]
  }

  getImportSlug(source: SourceFile | Directory) {
    return (
      getFileSystemSourcePath(source)
        // remove the base glob pattern: /src/posts/welcome.mdx -> /posts/welcome.mdx
        .replace(this.absoluteBaseGlobPattern, '')
        // remove leading slash: /posts/welcome.mdx -> posts/welcome.mdx
        .replace(/^\//, '')
        // remove file extension: Button.tsx -> Button
        .replace(/\.[^/.]+$/, '')
    )
  }
}

/**
 * Creates a collection of sources based on a specified file pattern.
 * Note, an import getter for each file extension will be generated at the root of the project in a `.renoun/collections.ts` file.
 *
 * @param filePattern - A pattern to match a set of source files (e.g., "*.ts", "*.mdx").
 * @param options - Optional settings for the collection, including base directory, base path, TypeScript config file path, and a custom sort function.
 * @returns A collection object that provides methods to retrieve individual sources or all sources matching the pattern.
 */
export function createCollection<
  AllExports extends { [key: string]: any } = { [key: string]: any },
>(
  options: CollectionOptions<AllExports>,
  getImport?: GetImport | GetImport[]
): CollectionSource<AllExports> {
  return new Collection<AllExports>(options, getImport)
}

/** Get all sources for a file pattern. */
function getSourceFilesAndDirectories(
  project: Project,
  filePattern: string
): (SourceFile | Directory)[] {
  let sourceFiles = project.getSourceFiles(filePattern)

  if (sourceFiles.length === 0) {
    sourceFiles = project.addSourceFilesAtPaths(filePattern)
  }

  const fileSystemSources = new Set<SourceFile | Directory>(sourceFiles)
  const sourceDirectories = Array.from(
    new Set(sourceFiles.map((sourceFile) => sourceFile.getDirectory()))
  )

  for (const sourceDirectory of sourceDirectories) {
    fileSystemSources.add(sourceDirectory)
  }

  return Array.from(fileSystemSources)
}

/** Get the path of a source file or directory. */
function getFileSystemSourcePath(source: SourceFile | Directory) {
  if (source instanceof tsMorph.SourceFile) {
    return source.getFilePath()
  }
  return source.getPath()
}

/** Get the depth of a path relative to a base path. */
function getPathDepth(path: string, basePath?: string) {
  const segments = path.split('/').filter(Boolean)

  if (segments.at(0) === basePath) {
    return segments.length - 2
  }

  return segments.length - 1
}

/** Get the name of a declaration. */
function getDeclarationName(declaration: Node) {
  if (tsMorph.Node.isVariableDeclaration(declaration)) {
    return declaration.getNameNode().getText()
  } else if (tsMorph.Node.isFunctionDeclaration(declaration)) {
    return declaration.getName()
  } else if (tsMorph.Node.isClassDeclaration(declaration)) {
    return declaration.getName()
  }
}

/** Whether a depth value is zero, a positive integer, or Infinity. */
function isValidDepth(depth: number) {
  return (depth >= 0 && Number.isInteger(depth)) || depth === Infinity
}

export function isExportSource(source: unknown): source is ExportSource<any> {
  return source instanceof Export
}

export function isNamedExportSource(
  source: unknown
): source is ExportSource<any> {
  return source instanceof NamedExport
}

export function isDefaultExportSource(
  source: unknown
): source is ExportSource<any> {
  return source instanceof DefaultExport
}

export function isFileSystemSource(
  source: unknown
): source is FileSystemSource<any> {
  return source instanceof Source
}

export function isCollectionSource(
  source: unknown
): source is CollectionSource<any> {
  return source instanceof Collection
}

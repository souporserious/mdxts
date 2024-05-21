import crypto from 'node:crypto'
import { join, posix, isAbsolute } from 'node:path'
import { readFile } from 'node:fs/promises'
import type { SourceFile } from 'ts-morph'
import { format, resolveConfig } from 'prettier'
import 'server-only'

import { getPathRelativeToPackage } from '../../utils/get-relative-path-as-package-import'
import { isJsxOnly } from '../../utils/is-jsx-only'
import type { Languages } from './get-tokens'
import { getLanguage } from './get-tokens'
import { project } from '../project'

type BaseParseMetadataOptions = {
  filename?: string
  language?: Languages
  allowErrors?: boolean | string
  fixImports?: boolean
}

export type ParseMetadataOptions = BaseParseMetadataOptions &
  (
    | { value: string }
    | {
        source: string
        workingDirectory?: string
      }
  )

/** Parses and normalizes source text metadata. */
export async function parseSourceTextMetadata({
  filename: filenameProp,
  language,
  allowErrors = false,
  fixImports,
  ...props
}: ParseMetadataOptions) {
  let finalValue: string = ''
  let finalLanguage = language
  let id = 'source' in props ? props.source : filenameProp

  if ('value' in props) {
    finalValue = props.value

    if (id === undefined) {
      const hex = crypto.createHash('sha256').update(props.value).digest('hex')
      if (hex) {
        id = hex
      }
    }
  } else if ('source' in props) {
    const isRelative = !isAbsolute(props.source)
    const workingDirectory = props.workingDirectory

    if (isRelative && !workingDirectory) {
      throw new Error(
        `The [workingDirectory] prop is required for [CodeBlock] with the relative [source] "${props.source}".\n\nPass a valid [workingDirectory]. If this is being renderend directly in an MDX file, make sure the "mdxts/remark" plugin and "mdxts/loader" Webpack loader are configured correctly.`
      )
    }

    const sourcePropPath = isRelative
      ? join(workingDirectory!, props.source)
      : props.source

    finalValue = await readFile(sourcePropPath, 'utf-8')

    if (!language) {
      finalLanguage = sourcePropPath.split('.').pop()! as Languages
    }
  }

  if (!finalLanguage) {
    finalLanguage = (filenameProp?.split('.').pop() as Languages) || 'plaintext'
  }

  if (typeof finalLanguage === 'string') {
    finalLanguage = getLanguage(finalLanguage)
  }

  const isJavaScriptLikeLanguage = ['js', 'jsx', 'ts', 'tsx'].includes(
    finalLanguage
  )
  const jsxOnly = isJavaScriptLikeLanguage ? isJsxOnly(finalValue) : false
  let filename = 'source' in props ? props.source : filenameProp
  let sourceFile: SourceFile | undefined

  if (!filename) {
    filename = `${id}.${finalLanguage}`
  }

  // Format JavaScript code blocks.
  if (isJavaScriptLikeLanguage) {
    try {
      const config = (await resolveConfig(filename)) || {}
      config.filepath = filename
      config.printWidth = 80
      finalValue = await format(finalValue, config)
    } catch (error) {
      // Ignore formatting errors.
    }

    // Trim semicolon and trailing newline from formatting.
    if (jsxOnly) {
      finalValue = finalValue.trimEnd()

      if (finalValue.startsWith(';')) {
        finalValue = finalValue.slice(1)
      }
    }
  }

  // Scope code block source files since they can conflict with other files on disk.
  if ('value' in props) {
    filename = join('mdxts', filename)
  }

  // Add extension if filename prop is missing it so it can be loaded into TypeScript.
  if (isJavaScriptLikeLanguage && !filename.includes('.')) {
    if (!finalLanguage) {
      throw new Error(
        'The [language] prop was not provided to the [CodeBlock] component and could not be inferred from the filename. Pass a valid [filename] with extension or a [language] prop'
      )
    }

    filename = `${filename}.${finalLanguage}`
  }

  // Create a ts-morph source file to type-check JavaScript and TypeScript code blocks.
  if (isJavaScriptLikeLanguage) {
    try {
      sourceFile = project.createSourceFile(filename, finalValue, {
        overwrite: true,
      })

      // Fixes incorrect imports by removing them and trying to resolve them.
      // This is the case with examples loaded from outside the main project directory.
      if (fixImports) {
        const importErrorCode = 2307
        const shouldEmitDiagnostics =
          typeof allowErrors === 'string'
            ? !allowErrors.includes(importErrorCode.toString())
            : allowErrors === false

        if (shouldEmitDiagnostics) {
          // Identify and collect missing imports/types to try and resolve them.
          // This is specifically the case for examples since they import files relative to the package.
          const diagnostics = sourceFile.getPreEmitDiagnostics()

          sourceFile
            .getImportDeclarations()
            .filter((importDeclaration) => {
              return diagnostics.some((diagnostic) => {
                const diagnosticStart = diagnostic.getStart()
                if (diagnosticStart === undefined) {
                  return false
                }
                return (
                  diagnostic.getCode() === importErrorCode &&
                  diagnosticStart >= importDeclaration.getStart() &&
                  diagnosticStart <= importDeclaration.getEnd()
                )
              })
            })
            .forEach((importDeclaration) => {
              importDeclaration.remove()
            })
        }

        // attempt to fix the removed imports and any other missing imports
        sourceFile.fixMissingImports()

        const importDeclarations = sourceFile.getImportDeclarations()

        if (shouldEmitDiagnostics) {
          // remap relative module specifiers to package imports if possible
          // e.g. `import { getTheme } from '../../mdxts/src/components'` -> `import { getTheme } from 'mdxts/components'`
          importDeclarations.forEach((importDeclaration) => {
            if (importDeclaration.isModuleSpecifierRelative()) {
              const importSpecifier =
                getPathRelativeToPackage(importDeclaration)
              importDeclaration.setModuleSpecifier(importSpecifier)
            }
          })
        }
      } else if (jsxOnly) {
        // Since JSX only code blocks don't have imports, attempt to fix them.
        sourceFile.fixMissingImports()
      }

      // If no imports or exports add an empty export declaration to coerce TypeScript to treat the file as a module
      const hasImports = sourceFile.getImportDeclarations().length > 0
      const hasExports = sourceFile.getExportDeclarations().length > 0

      if (!hasImports && !hasExports) {
        sourceFile.addExportDeclaration({})
      }
    } catch (error) {
      if (error instanceof Error) {
        const workingDirectory = process.cwd()
        throw new Error(
          `[mdxts] Error trying to create CodeBlock source file at working directory "${workingDirectory}"`,
          { cause: error }
        )
      }
    }
  }

  const filenameLabel = (filenameProp || filename)
    .replace(join('mdxts', posix.sep), '') // Remove mdxts/ prefix
    .replace(/\d+\./, '') // Remove ordered number prefix

  return {
    value: sourceFile ? sourceFile.getFullText() : finalValue,
    language: finalLanguage,
    isJsxOnly: jsxOnly,
    sourceFile,
    filename,
    filenameLabel,
  }
}

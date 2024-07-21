import type { bundledLanguages, bundledThemes } from 'shiki/bundle/web'
import type { SourceFile, Diagnostic, ts, Project } from 'ts-morph'
import { Node, SyntaxKind } from 'ts-morph'
import { getDiagnosticMessageText } from '@tsxmod/utils'
import { join, posix } from 'node:path'
import { findRoot } from '@manypkg/find-root'
import chalk from 'chalk'

import { getThemeColors } from './get-theme-colors'
import { isJsxOnly } from './is-jsx-only'
import { getHighlighter } from './get-highlighter'
import { splitTokenByRanges } from './split-tokens-by-ranges'
import { getTrimmedSourceFileText } from './get-trimmed-source-file-text'

export const languageMap = {
  mjs: 'js',
} as const

export type Languages =
  | keyof typeof bundledLanguages
  | keyof typeof languageMap
  | 'plaintext'
  | 'diff'

/** Normalizes language to a specific grammar language key. */
export function getLanguage(
  language: Languages
): keyof typeof bundledLanguages {
  if (language in languageMap) {
    return languageMap[language as keyof typeof languageMap]
  }
  return language as keyof typeof bundledLanguages
}

export type Themes = keyof typeof bundledThemes

type Color = string

type ThemeTokenColor = {
  name?: string
  scope: string | string[]
  settings: {
    background?: Color
    foreground?: Color
    fontStyle?: 'italic' | 'bold' | 'underline'
  }
}

export type Theme = {
  name: string
  type: 'light' | 'dark' | 'hc'
  colors: {
    [element: string]: Color
  }
  tokenColors: ThemeTokenColor[]
}

export type Token = {
  value: string
  start: number
  end: number
  color?: string
  fontStyle?: string
  fontWeight?: string
  textDecoration?: string
  isBaseColor: boolean
  isWhitespace: boolean
  isSymbol: boolean
  quickInfo?: { displayText: string; documentationText: string }
  diagnostics?: Diagnostic[]
}

export type Tokens = Token[]

export type GetTokens = (
  value: string,
  language?: Languages,
  filename?: string,
  allowErrors?: string | boolean,
  showErrors?: boolean,
  sourcePath?: string | false
) => Promise<Tokens[]>

/** Converts a string of code to an array of highlighted tokens. */
export async function getTokens(
  project: Project,
  value: string,
  language: Languages = 'plaintext',
  filename?: string,
  allowErrors: string | boolean = false,
  showErrors: boolean = false,
  sourcePath?: string | false
) {
  if (language === 'plaintext' || language === 'diff') {
    return [
      [
        {
          value,
          start: 0,
          end: value.length,
          isBaseColor: true,
          isWhitespace: false,
          isSymbol: false,
        } satisfies Token,
      ],
    ]
  }

  const isJavaScriptLikeLanguage = ['js', 'jsx', 'ts', 'tsx'].includes(language)
  const jsxOnly = isJavaScriptLikeLanguage ? isJsxOnly(value) : false
  const sourceFile = filename ? project.getSourceFile(filename) : undefined
  const finalLanguage = getLanguage(language)
  const theme = await getThemeColors()
  const highlighter = await getHighlighter()
  const sourceText = sourceFile ? getTrimmedSourceFileText(sourceFile) : value
  const { tokens } = highlighter.codeToTokens(sourceText, {
    theme: 'mdxts',
    lang: finalLanguage as any,
  })
  const sourceFileDiagnostics = getDiagnostics(
    sourceFile,
    allowErrors,
    showErrors
  )
  const importSpecifiers =
    sourceFile && !jsxOnly
      ? sourceFile
          .getImportDeclarations()
          .map((importDeclaration) => importDeclaration.getModuleSpecifier())
      : []
  const identifiers = sourceFile
    ? sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
    : []
  const symbolRanges = [...importSpecifiers, ...identifiers]
    .filter((node) => {
      const parent = node.getParent()
      const isJsxOnlyImport = jsxOnly
        ? Node.isImportSpecifier(parent) || Node.isImportClause(parent)
        : false
      return (
        !isJsxOnlyImport && !Node.isJSDocTag(parent) && !Node.isJSDoc(parent)
      )
    })
    .map((node) => {
      // Offset module specifiers since they contain quotes which are tokenized separately
      // e.g. import React from 'react' -> ["'", "react", "'"]
      if (Node.isStringLiteral(node)) {
        return {
          start: node.getStart() + 1,
          end: node.getEnd() - 1,
        }
      }

      return {
        start: node.getStart(),
        end: node.getEnd(),
      }
    })
  const rootDirectory = (await findRoot(process.cwd())).rootDir
  const baseDirectory = process.cwd().replace(rootDirectory, '')
  let previousTokenStart = 0
  let parsedTokens = tokens.map((line) => {
    // increment position for line breaks
    if (line.length === 0) {
      previousTokenStart += 1
    }
    return line.flatMap((token, tokenIndex) => {
      const tokenStart = previousTokenStart
      const tokenEnd = tokenStart + token.content.length
      const lastToken = tokenIndex === line.length - 1

      // account for newlines
      previousTokenStart = lastToken ? tokenEnd + 1 : tokenEnd

      const fontStyle = token.fontStyle ? getFontStyle(token.fontStyle) : {}
      const initialToken: Token = {
        value: token.content,
        start: tokenStart,
        end: tokenEnd,
        color: token.color,
        isBaseColor: token.color
          ? token.color.toLowerCase() === theme.foreground.toLowerCase()
          : false,
        isWhitespace: token.content.trim() === '',
        isSymbol: false,
        ...fontStyle,
      }
      let processedTokens: Tokens = []

      // split tokens by symbol ranges
      if (symbolRanges.length) {
        const symbolRange = symbolRanges.find((range) => {
          return range.start >= tokenStart && range.end <= tokenEnd
        })
        const inFullRange = symbolRange
          ? symbolRange.start === tokenStart && symbolRange.end === tokenEnd
          : false

        if (symbolRange && !inFullRange) {
          processedTokens = splitTokenByRanges(initialToken, symbolRanges)
        } else {
          processedTokens.push({
            ...initialToken,
            isSymbol: inFullRange,
          })
        }
      } else {
        processedTokens.push(initialToken)
      }

      return processedTokens.map((token) => {
        if (!token.isSymbol) {
          return token
        }

        const diagnostics = sourceFileDiagnostics.filter((diagnostic) => {
          const start = diagnostic.getStart()
          const length = diagnostic.getLength()
          if (!start || !length) {
            return false
          }
          const end = start + length
          return token.start >= start && token.end <= end
        })
        const quickInfo =
          sourceFile && filename
            ? getQuickInfo(
                sourceFile,
                filename,
                token.start,
                rootDirectory,
                baseDirectory
              )
            : undefined

        return {
          ...token,
          quickInfo,
          diagnostics: diagnostics.length ? diagnostics : undefined,
        }
      })
    })
  })

  // Remove leading imports and whitespace for jsx only code blocks
  if (jsxOnly) {
    const firstJsxLineIndex = parsedTokens.findIndex((line) =>
      line.find((token) => token.value === '<')
    )
    parsedTokens = parsedTokens.slice(firstJsxLineIndex)
  }

  if (allowErrors === false && sourceFile && sourceFileDiagnostics.length > 0) {
    throwDiagnosticErrors(
      sourceFile,
      sourceFileDiagnostics,
      parsedTokens,
      sourcePath
    )
  }

  return parsedTokens
}

/** Retrieves diagnostics from a source file. */
export function getDiagnostics(
  sourceFile: SourceFile | undefined,
  allowErrors?: string | boolean,
  showErrors?: boolean
): Diagnostic<ts.Diagnostic>[] {
  const allowedErrorCodes: number[] =
    typeof allowErrors === 'string'
      ? allowErrors.split(',').map((code) => parseInt(code, 10))
      : []

  if (!sourceFile) {
    return []
  }

  const diagnostics = sourceFile
    .getPreEmitDiagnostics()
    .filter((diagnostic) => diagnostic.getSourceFile())

  if (showErrors) {
    if (allowedErrorCodes.length > 0) {
      return diagnostics.filter((diagnostic) => {
        return allowedErrorCodes.includes(diagnostic.getCode())
      })
    }

    return diagnostics
  }

  if (allowErrors && allowedErrorCodes.length === 0) {
    return []
  }

  return diagnostics.filter((diagnostic) => {
    return !allowedErrorCodes.includes(diagnostic.getCode())
  })
}

/** Convert documentation entries to markdown-friendly links. */
function formatDocumentationText(documentation: ts.SymbolDisplayPart[]) {
  let markdownText = ''
  let currentLinkText = ''
  let currentLinkUrl = ''

  documentation.forEach((part) => {
    if (part.kind === 'text') {
      markdownText += part.text
    } else if (part.kind === 'linkText') {
      const [url, ...descriptionParts] = part.text.split(' ')
      currentLinkUrl = url
      currentLinkText = descriptionParts.join(' ') || url
    } else if (part.kind === 'link') {
      if (currentLinkUrl) {
        markdownText += `[${currentLinkText}](${currentLinkUrl})`
        currentLinkText = ''
        currentLinkUrl = ''
      }
    }
  })

  return markdownText
}

/** Get the quick info a token */
function getQuickInfo(
  sourceFile: SourceFile,
  filename: string,
  tokenStart: number,
  rootDirectory: string,
  baseDirectory: string
) {
  const quickInfo = sourceFile
    .getProject()
    .getLanguageService()
    .compilerObject.getQuickInfoAtPosition(filename, tokenStart)

  if (!quickInfo) {
    return
  }

  const displayParts = quickInfo.displayParts || []
  const displayText = displayParts
    .map((part) => part.text)
    .join('')
    // First, replace root directory to handle root node_modules
    .replaceAll(rootDirectory, '.')
    // Next, replace base directory for on disk paths
    .replaceAll(baseDirectory, '')
    // Finally, replace the in-memory mdxts directory
    .replaceAll('/mdxts', '')
  const documentation = quickInfo.documentation || []
  const documentationText = formatDocumentationText(documentation)

  return {
    displayText,
    documentationText,
  }
}

const FontStyle = {
  Italic: 1,
  Bold: 2,
  Underline: 4,
  Strikethrough: 8,
}

function getFontStyle(fontStyle: number) {
  const style: {
    fontStyle?: 'italic'
    fontWeight?: 'bold'
    textDecoration?: 'underline' | 'line-through'
  } = {
    fontStyle: undefined,
    fontWeight: undefined,
    textDecoration: undefined,
  }
  if (fontStyle === FontStyle.Italic) {
    style['fontStyle'] = 'italic'
  }
  if (fontStyle === FontStyle.Bold) {
    style['fontWeight'] = 'bold'
  }
  if (fontStyle === FontStyle.Underline) {
    style['textDecoration'] = 'underline'
  }
  if (fontStyle === FontStyle.Strikethrough) {
    style['textDecoration'] = 'line-through'
  }
  return style
}

/** Converts tokens to a colored text block. */
function tokensToHighlightedText(tokens: Token[][]) {
  let styledOutput = ''
  let lineNumber = 1

  for (const line of tokens) {
    let lineContent = ''

    for (const token of line) {
      let tokenStyle
      if (token.color) {
        tokenStyle = chalk.hex(token.color)
      } else {
        tokenStyle = chalk.reset
      }

      if (token.diagnostics && token.diagnostics.length > 0) {
        tokenStyle = tokenStyle.underline.red
      }

      lineContent += tokenStyle(token.value)
    }

    const paddedLineNumber = String(lineNumber).padStart(2, ' ')
    styledOutput += `${chalk.dim(paddedLineNumber)} ${lineContent}\n`
    lineNumber++
  }

  return styledOutput
}

/** Converts tokens to plain text. */
function tokensToPlainText(tokens: Token[][]) {
  const lineNumberPadding = 4
  let plainText = ''
  let lineNumber = 1

  for (const line of tokens) {
    const paddedLineNumber = String(lineNumber).padStart(2, ' ')

    plainText += `${paddedLineNumber} `

    const anyLineDiagnostics = line.some(
      (token) => token.diagnostics && token.diagnostics.length > 0
    )

    if (anyLineDiagnostics) {
      plainText += '|'
    } else {
      plainText += ' '
    }

    let lineContent = ''
    let errorMarkers = []

    for (const token of line) {
      lineContent += token.value

      if (token.diagnostics && token.diagnostics.length > 0) {
        const tokenLength = token.value.length ?? 1
        const startIndex = lineContent.length - token.value.length
        errorMarkers.push({ startIndex, tokenLength })
      }
    }

    plainText += `${lineContent}\n`

    if (errorMarkers.length > 0) {
      let errorLine = ' '.repeat(lineNumberPadding)
      for (const { startIndex, tokenLength } of errorMarkers) {
        while (errorLine.length < startIndex + lineNumberPadding) {
          errorLine += ' '
        }
        errorLine += '^'.repeat(tokenLength)
      }
      plainText += `${errorLine}\n`
    }

    lineNumber++
  }

  return plainText
}

/** Throws diagnostic errors, formatting them for display. */
function throwDiagnosticErrors(
  sourceFile: SourceFile,
  diagnostics: Diagnostic[],
  tokens: Token[][],
  sourcePath?: string | false
) {
  const workingDirectory = join(process.cwd(), 'mdxts', posix.sep)
  const filePath = sourceFile.getFilePath().replace(workingDirectory, '')
  const errorMessages = diagnostics.map((diagnostic) => {
    const message = getDiagnosticMessageText(diagnostic.getMessageText())
    const start = diagnostic.getStart()
    const code = diagnostic.getCode()

    if (process.env.MDXTS_HIGHLIGHT_ERRORS === 'true') {
      if (!start) {
        return `${chalk.red(' ⓧ')} ${message} ${chalk.dim(`ts(${code})`)}`
      }
      const startLineAndCol = sourceFile.getLineAndColumnAtPos(start)
      return `${chalk.red(' ⓧ')} ${message} ${chalk.dim(`ts(${code}) [Ln ${startLineAndCol.line}, Col ${startLineAndCol.column}]`)}`
    }

    if (!start) {
      return ` ⓧ ${message} ts(${code})`
    }
    const startLineAndCol = sourceFile.getLineAndColumnAtPos(start)
    return ` ⓧ ${message} ts(${code}) [Ln ${startLineAndCol.line}, Col ${startLineAndCol.column}]`
  })
  const formattedErrors = errorMessages.join('\n')

  if (process.env.MDXTS_HIGHLIGHT_ERRORS === 'true') {
    const errorMessage = `${formattedErrors}\n\n${tokensToHighlightedText(tokens)}`
    throw new Error(
      `[mdxts] ${chalk.bold('CodeBlock')} type errors found ${sourcePath ? `at "${chalk.bold(sourcePath)}" ` : ''}for filename "${chalk.bold(filePath)}"\n\n${errorMessage}\n\n`
    )
  } else {
    const errorMessage = `${formattedErrors}\n\n${tokensToPlainText(tokens)}`
    throw new Error(
      `[mdxts] CodeBlock type errors found ${sourcePath ? `at "${sourcePath}" ` : ''}for filename "${filePath}"\n\n${errorMessage}\n\n`
    )
  }
}

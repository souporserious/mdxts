import React, { Fragment } from 'react'
import type { SourceFile } from 'ts-morph'
import { Node, SyntaxKind } from 'ts-morph'

import type { Theme, getHighlighter } from './highlighter'
import { Symbol } from './Symbol'
import { QuickInfo } from './QuickInfo'
import { QuickInfoProvider } from './QuickInfoProvider'
import { RegisterSourceFile } from './RegisterSourceFile'
import { Pre } from './Pre'
import { CodeToolbar } from './CodeToolbar'

export type CodeProps = {
  /** Code snippet to be highlighted. */
  value: string

  /** Name of the file. */
  filename?: string

  /** Language of the code snippet. */
  language?: string

  /** Show or hide line numbers. */
  lineNumbers?: boolean

  /** Lines to highlight. */
  highlight?: string

  /** VS Code-based theme for highlighting. */
  theme: Theme

  /** Show or hide the copy button. */
  allowCopy?: boolean

  /** Whether or not to allow errors. Accepts a boolean or comma-separated list of allowed error codes. */
  allowErrors?: boolean | string

  /** Show or hide errors. */
  showErrors?: boolean

  /** Padding to apply to the code block. */
  padding?: string

  /** Horizontal padding to apply to the code block. */
  paddingHorizontal?: string

  /** Vertical padding to apply to the code block. */
  paddingVertical?: string

  /** Whether or not the code is presented inline or as a block-level element. */
  inline?: boolean

  /** Whether or not to show the toolbar. */
  toolbar?: boolean

  /** Class name to apply to the code block. */
  className?: string

  /** Style to apply to the code block. */
  style?: React.CSSProperties
}

const lineHeight = '1.4rem'

/** Renders a code block with syntax highlighting. */
export function CodeView({
  row,
  tokens,
  lineNumbers,
  sourceFile,
  sourcePath,
  filename,
  highlight,
  highlighter,
  language,
  theme,
  showErrors,
  className,
  isJsxOnly = false,
  isNestedInEditor = false,
  shouldRenderFilename,
  rootDirectory,
  baseDirectory,
  edit,
  value,
  inline,
  padding = inline ? '0.25rem' : '1rem',
  paddingHorizontal = padding,
  paddingVertical = padding,
  allowErrors,
  allowCopy,
  toolbar,
  style,
}: CodeProps & {
  row?: number[] | null
  tokens: ReturnType<Awaited<ReturnType<typeof getHighlighter>>>
  sourceFile?: SourceFile
  sourcePath?: string
  highlighter: any
  isJsxOnly?: boolean
  isNestedInEditor?: boolean
  shouldRenderFilename?: boolean
  rootDirectory?: string
  baseDirectory?: string
  edit?: any
}) {
  const shouldRenderToolbar = toolbar
    ? shouldRenderFilename || allowCopy
    : false
  const editorForegroundColor = theme.colors['editor.foreground'].toLowerCase()
  const symbolBounds = sourceFile
    ? getSymbolBounds(sourceFile, isJsxOnly, lineHeight)
    : []
  const shouldHighlightLine = calculateLinesToHighlight(highlight)
  const allowedErrorCodes =
    typeof allowErrors === 'string'
      ? allowErrors.split(',').map((code) => parseInt(code))
      : []
  const diagnostics =
    (allowedErrorCodes.length === 0 && allowErrors) || inline
      ? []
      : sourceFile
        ? getDiagnostics(sourceFile).filter(
            (diagnostic) => !allowedErrorCodes.includes(diagnostic.getCode())
          )
        : []
  const Element = inline ? 'span' : 'div'
  const Container = isNestedInEditor
    ? React.Fragment
    : (props: Record<string, unknown>) => (
        <Element
          style={{
            display: inline ? 'inline-grid' : 'grid',
            gridTemplateColumns: 'auto minmax(0, 1fr)',
            gridTemplateRows: shouldRenderToolbar ? 'auto 1fr' : '0 1fr',
            position: 'relative',
            margin: inline ? undefined : '0 0 1.6rem',
            borderRadius: 5,
            boxShadow: `0 0 0 1px ${theme.colors['contrastBorder']}`,
            backgroundColor: theme.colors['editor.background'],
            color: theme.colors['editor.foreground'],
            verticalAlign: inline ? 'middle' : undefined,
            ...style,
          }}
          {...props}
        />
      )

  return (
    <Container>
      {filename ? (
        <RegisterSourceFile
          filename={filename}
          source={sourceFile?.getFullText()}
        />
      ) : null}

      {shouldRenderToolbar ? (
        <CodeToolbar
          filename={shouldRenderFilename ? filename : undefined}
          value={value}
          sourcePath={sourcePath}
          theme={theme}
        />
      ) : null}

      {!inline && lineNumbers ? (
        <div
          className={className}
          style={{
            gridColumn: 1,
            gridRow: filename ? 2 : 1,
            width: '6ch',
            paddingTop: paddingVertical,
            paddingBottom: paddingVertical,
            fontSize: '1rem',
            lineHeight,
            paddingRight: '2ch',
            textAlign: 'right',
            userSelect: 'none',
            whiteSpace: 'pre',
            color: theme.colors['editorLineNumber.foreground'],
          }}
        >
          {tokens.map((_: any, lineIndex: number) => {
            const shouldHighlight = shouldHighlightLine(lineIndex)
            const isActive = row && row[0] <= lineIndex && lineIndex <= row[1]
            const Wrapper = ({ children }: { children: React.ReactNode }) =>
              shouldHighlight || isActive ? (
                <div
                  style={{
                    color: theme.colors['editorLineNumber.activeForeground'],
                  }}
                >
                  {children}
                </div>
              ) : (
                <Fragment>
                  {children}
                  {'\n'}
                </Fragment>
              )
            return <Wrapper key={lineIndex}>{lineIndex + 1}</Wrapper>
          })}
        </div>
      ) : null}

      <Pre
        inline={inline}
        isNestedInEditor={isNestedInEditor}
        className={className}
        style={{ gridRow: filename ? 2 : 1 }}
      >
        {/* {diagnostics
          ? diagnostics.map((diagnostic) => {
              const start = diagnostic.getStart()
              const length = diagnostic.getLength()

              if (!start || !length || !sourceFile) {
                return null
              }

              const end = start + length
              const { line, column } = sourceFile.getLineAndColumnAtPos(start)
              const yOffset = isJsxOnly ? 2 : 1
              const top = line - yOffset
              const width = end - start
              return (
                <div
                  key={start}
                  style={{
                    position: 'absolute',
                    top: `calc(${top} * ${lineHeight} + ${paddingVertical})`,
                    left: `calc(${column - 1} * 1ch + ${paddingHorizontal})`,
                    width: `calc(${width} * 1ch)`,
                    height: lineHeight,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%206%203'%20enable-background%3D'new%200%200%206%203'%20height%3D'3'%20width%3D'6'%3E%3Cg%20fill%3D'%23f14c4c'%3E%3Cpolygon%20points%3D'5.5%2C0%202.5%2C3%201.1%2C3%204.1%2C0'%2F%3E%3Cpolygon%20points%3D'4%2C0%206%2C2%206%2C0.6%205.4%2C0'%2F%3E%3Cpolygon%20points%3D'0%2C2%201%2C3%202.4%2C3%200%2C0.6'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: 'bottom left',
                    pointerEvents: 'none',
                  }}
                />
              )
            })
          : null} */}

        <QuickInfoProvider>
          <Element
            style={{
              display: inline ? 'inline-block' : 'block',
              paddingTop: paddingVertical,
              paddingBottom: paddingVertical,
              paddingLeft: paddingHorizontal,
              paddingRight: paddingHorizontal,
              overflow: 'auto',
            }}
          >
            {tokens.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {line.map((token, tokenIndex) => {
                  const isForegroundColor = token.color
                    ? token.color.toLowerCase() === editorForegroundColor
                    : false
                  const isWhitespace = token.content.trim() === ''

                  if (!inline) {
                    const bounds = symbolBounds.find(
                      (bounds) =>
                        bounds.start === token.start &&
                        bounds.width === token.end - token.start
                    )
                    if (bounds && filename && language) {
                      const tokenDiagnostics = diagnostics.filter(
                        (diagnostic) => {
                          const start = diagnostic.getStart()
                          const length = diagnostic.getLength()
                          if (!start || !length) {
                            return false
                          }
                          const end = start + length
                          return start <= token.start && token.end <= end
                        }
                      )

                      return (
                        <span
                          key={tokenIndex}
                          style={{
                            ...token.fontStyle,
                            position: 'relative',
                            color: isForegroundColor ? undefined : token.color,
                          }}
                        >
                          {token.content}
                          <Symbol>
                            <QuickInfo
                              position={token.start}
                              filename={filename}
                              highlighter={highlighter}
                              language={language}
                              theme={theme}
                              diagnostics={tokenDiagnostics}
                              edit={edit}
                              rootDirectory={rootDirectory}
                              baseDirectory={baseDirectory}
                            />
                          </Symbol>
                        </span>
                      )
                    }
                  }

                  if (isForegroundColor || isWhitespace) {
                    return token.content
                  }

                  return (
                    <span
                      key={tokenIndex}
                      style={{ ...token.fontStyle, color: token.color }}
                    >
                      {token.content}
                    </span>
                  )
                })}
                {lineIndex === tokens.length - 1 ? null : '\n'}
              </Fragment>
            ))}
          </Element>
        </QuickInfoProvider>

        {highlight
          ? highlight
              .split(',')
              .map((range) => {
                const [start, end] = range.split('-')
                const parsedStart = parseInt(start, 10)
                const parsedEnd = end ? parseInt(end, 10) : parsedStart
                return {
                  start: parsedStart,
                  end: parsedEnd,
                }
              })
              .map((range, index) => {
                const start = range.start - 1
                const end = range.end ? range.end - 1 : start
                const height = end - start + 1

                return (
                  <div
                    key={index}
                    style={{
                      position: 'absolute',
                      top: `calc(${start} * ${lineHeight} + ${paddingVertical})`,
                      left: 0,
                      width: '100%',
                      height: `calc(${height} * ${lineHeight})`,
                      backgroundColor: '#87add726',
                      pointerEvents: 'none',
                    }}
                  />
                )
              })
          : null}
      </Pre>
    </Container>
  )
}

/** Calculate which lines to highlight based on the range meta string added by the rehype plugin. */
function calculateLinesToHighlight(meta: string | undefined) {
  if (meta === '' || meta === undefined) {
    return () => false
  }
  const lineNumbers = meta
    .split(',')
    .map((value: string) => value.split('-').map((y) => parseInt(y, 10)))

  return (index: number) => {
    const lineNumber = index + 1
    const inRange = lineNumbers.some(([start, end]: number[]) =>
      end ? lineNumber >= start && lineNumber <= end : lineNumber === start
    )
    return inRange
  }
}

/** Get the diagnostics for a source file. */
function getDiagnostics(sourceFile: SourceFile) {
  // if no imports/exports are found, add an empty export to ensure the file is a module
  const hasImports = sourceFile.getImportDeclarations().length > 0
  const hasExports = sourceFile.getExportDeclarations().length > 0

  if (!hasImports && !hasExports) {
    sourceFile.addExportDeclaration({})
  }

  const diagnostics = sourceFile.getPreEmitDiagnostics()

  // remove the empty export
  if (!hasImports && !hasExports) {
    sourceFile.getExportDeclarations().at(0)!.remove()
  }

  return diagnostics
}

/* Get the bounding rectangle of all module import specifiers and identifiers in a source file. */
function getSymbolBounds(
  sourceFile: SourceFile,
  isJsxOnly: boolean,
  lineHeight: string
) {
  const importSpecifiers = isJsxOnly
    ? []
    : sourceFile
        .getImportDeclarations()
        .map((importDeclaration) => importDeclaration.getModuleSpecifier())
  const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier)
  const importCount = sourceFile.getImportDeclarations().length
  const allNodes = [...importSpecifiers, ...identifiers]
  const bounds = allNodes
    .filter((node) => {
      const parent = node.getParent()
      const isJsxOnlyImport = isJsxOnly
        ? parent?.getKind() === SyntaxKind.ImportSpecifier ||
          parent?.getKind() === SyntaxKind.ImportClause
        : false
      return (
        !Node.isJSDocTag(parent) && !Node.isJSDoc(parent) && !isJsxOnlyImport
      )
    })
    .map((node) => {
      const start = node.getStart()
      const { line, column } = sourceFile.getLineAndColumnAtPos(start)
      const yOffset = isJsxOnly ? importCount + 2 : 1
      return {
        start,
        top: line - yOffset,
        left: column - 1,
        width: node.getWidth(),
        height: lineHeight,
      }
    })

  return bounds
}

import React, { Fragment } from 'react'

import { QuickInfo } from './QuickInfo'
import { QuickInfoProvider } from './QuickInfoProvider'
import { Symbol } from './Symbol'
import type { GetTokens, Token } from './get-tokens'
import { getTheme } from './get-theme'

export type RenderedTokensProps = {
  tokens: Awaited<ReturnType<GetTokens>>
  renderToken?: (token: Token) => React.ReactNode
  renderLine?: (
    line: React.ReactNode,
    lineIndex: number,
    isLastLine: boolean
  ) => React.ReactNode
}

export async function Tokens({
  tokens,
  renderLine,
  renderToken,
}: RenderedTokensProps) {
  const theme = await getTheme()
  const lastLineIndex = tokens.length - 1

  return (
    <QuickInfoProvider>
      {tokens.map((line, lineIndex) => {
        const lineContent = line.map((token) => {
          if (renderToken) {
            return renderToken(token)
          }

          const hasTextStyles = Boolean(
            token.fontStyle || token.fontWeight || token.textDecoration
          )

          if ((!hasTextStyles && token.isBaseColor) || token.isWhitespace) {
            return token.value
          }

          const diagnosticStyle = {
            backgroundImage: `url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20viewBox%3D'0%200%206%203'%20enable-background%3D'new%200%200%206%203'%20height%3D'3'%20width%3D'6'%3E%3Cg%20fill%3D'%23f14c4c'%3E%3Cpolygon%20points%3D'5.5%2C0%202.5%2C3%201.1%2C3%204.1%2C0'%2F%3E%3Cpolygon%20points%3D'4%2C0%206%2C2%206%2C0.6%205.4%2C0'%2F%3E%3Cpolygon%20points%3D'0%2C2%201%2C3%202.4%2C3%200%2C0.6'%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E")`,
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'bottom left',
          }

          return (
            <span
              key={token.start}
              style={{
                position: 'relative',
                fontStyle: token.fontStyle,
                fontWeight: token.fontWeight,
                textDecoration: token.textDecoration,
                color: token.isBaseColor ? undefined : token.color,
                ...(token.diagnostics && diagnosticStyle),
              }}
            >
              {token.value}
              {token.diagnostics || token.quickInfo ? (
                <Symbol
                  highlightColor={
                    theme.colors['editor.hoverHighlightBackground']
                  }
                >
                  <QuickInfo
                    diagnostics={token.diagnostics}
                    quickInfo={token.quickInfo}
                  />
                </Symbol>
              ) : null}
            </span>
          )
        })
        const isLastLine = lineIndex === lastLineIndex
        let lineToRender = renderLine
          ? renderLine(lineContent, lineIndex, isLastLine)
          : lineContent

        if (renderLine && lineToRender) {
          return lineToRender
        }

        return (
          <Fragment key={lineIndex}>
            {lineContent}
            {isLastLine ? null : '\n'}
          </Fragment>
        )
      })}
    </QuickInfoProvider>
  )
}
import React from 'react'
import { CodeBlock, LineNumbers, Tokens, Toolbar } from 'omnidoc/components'

export function Basic() {
  return (
    <CodeBlock
      source="./counter/useCounter.ts"
      workingDirectory={import.meta.url}
    />
  )
}

export function TypeChecking() {
  return (
    <CodeBlock
      value={`const a = 1; a + b;`}
      language="ts"
      allowCopy={false}
      allowErrors
      showErrors
    />
  )
}

export function Ordered() {
  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <CodeBlock filename="01.example.ts" value="const a = 1;" />
      <CodeBlock filename="02.example.ts" value="const a = 1; const b = 2;" />
    </div>
  )
}

export function LineNumbering() {
  return (
    <CodeBlock
      filename="line-numbers.ts"
      value={`const a = 1;\nconst b = 2;\n\nconst add = a + b\nconst subtract = a - b`}
      showLineNumbers
      highlightedLines="4"
    />
  )
}

export function LineHighlighting() {
  return (
    <CodeBlock
      filename="line-highlight.ts"
      value={`const a = 1;\nconst b = 2;\n\nconst add = a + b\nconst subtract = a - b`}
      highlightedLines="2, 4"
    />
  )
}

export function LineFocusing() {
  return (
    <CodeBlock
      filename="line-focus.ts"
      value={`const a = 1;\nconst b = 2;\n\nconst add = a + b\nconst subtract = a - b`}
      focusedLines="2, 4"
    />
  )
}

export function LineHighlightAndFocus() {
  return (
    <CodeBlock
      filename="line-highlight-and-focus.ts"
      value={`const a = 1;\nconst b = 2;\n\nconst add = a + b\nconst subtract = a - b`}
      highlightedLines="2, 4"
      focusedLines="2, 4"
    />
  )
}

export function Custom() {
  return (
    <CodeBlock
      allowErrors="2307"
      filename="toolbar.tsx"
      source="./counter/Counter.tsx"
      workingDirectory={import.meta.url}
    >
      <div style={{ fontSize: '1rem' }}>
        <Toolbar allowCopy style={{ padding: '0.5lh' }} />
        <pre
          style={{
            display: 'grid',
            gridTemplateColumns: 'min-content max-content',
            padding: '0.5lh 0',
            lineHeight: 1.4,
            whiteSpace: 'pre',
            wordWrap: 'break-word',
            overflow: 'auto',
          }}
        >
          <LineNumbers style={{ padding: '0 0.5lh' }} />
          <code style={{ paddingRight: '0.5lh' }}>
            <Tokens />
          </code>
        </pre>
      </div>
    </CodeBlock>
  )
}

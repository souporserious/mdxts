'use client'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { evaluateSync } from '@mdx-js/mdx'
import { Editor } from '@mdxts/react'
import { Logo } from 'components/Logo'
import Link from 'next/link'

type ContentComponent = React.ComponentType<any>

const buttonSourceCode = `
import { example } from 'mdxts'

/** Used for taking actions and navigating. */
export function Button({
  label,
  onAction,
}: {
  /** Provides a label for the button. */
  label: string

  /** Called when an action for this button is requested. */
  onAction: () => void
}) {
  return <button onClick={onAction}>{label}</button>
}

example(() => <Button label="Say hello" onAction={() => alert('Hello!')} />)
`.trim()

const initialContent = `
# Hello MDX

## Start editing to see some magic happen!
`.trim()

export default function Page() {
  const [value, setValue] = React.useState(initialContent)
  const [error, setError] = React.useState(null)
  const lastContent = React.useRef<ContentComponent>(null)
  const Content = React.useMemo(() => {
    try {
      const content = evaluateSync(value, jsxRuntime as any).default

      lastContent.current = content
      setError(null)

      return content
    } catch (error) {
      setError(error.toString())

      return lastContent.current
    }
  }, [value]) as ContentComponent

  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '1rem',
        }}
      >
        <Logo />
        <nav>
          <Link href="/getting-started">Docs</Link>
        </nav>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
          minHeight: '100vh',
        }}
      >
        <Editor height="100%" value={buttonSourceCode} />
        <Editor height="100%" value={value} onChange={setValue} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            boxShadow: error && 'inset 0 0 0 2px #d54040',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: 16,
              gap: 16,
              textAlign: 'center',
              flex: 1,
            }}
          >
            <Content
              components={{
                h1: (props) => <h1 {...props} style={{ fontSize: 40 }} />,
                h2: (props) => <h2 {...props} style={{ fontSize: 24 }} />,
              }}
            />
          </div>
          {error && (
            <div
              style={{
                padding: 16,
                backgroundColor: '#d54040',
                color: 'white',
              }}
            >
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

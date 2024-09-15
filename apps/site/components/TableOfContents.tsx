'use client'
import type { Headings } from '@renoun/mdx-plugins'

import { useSectionObserver } from 'hooks/use-section-observer'
import { ViewSource } from './ViewSource'

export function TableOfContents({
  headings,
  sourcePath,
}: {
  headings: Headings
  sourcePath?: string
}) {
  const sectionObserver = useSectionObserver()

  return (
    <nav
      css={{
        display: 'none',
        '@media screen and (min-width: 60rem)': {
          display: 'block',
        },
      }}
    >
      <ul
        css={{
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          margin: 0,
          marginTop: 'calc(var(--font-size-heading-1) + 1rem)',
          position: 'sticky',
          top: '2rem',
        }}
      >
        <li css={{ padding: '0.25rem 0px', marginBottom: '0.5rem' }}>
          <h4 className="title">On this page</h4>
        </li>
        {headings?.map(({ text, depth, id }) =>
          depth > 1 ? (
            <li
              key={id}
              css={{
                fontSize: 'var(--font-size-body-3)',
                padding: '0.25rem 0',
                paddingLeft: (depth - 2) * 0.8 + 'rem',
              }}
            >
              <Link id={id} sectionObserver={sectionObserver}>
                {text}
              </Link>
            </li>
          ) : null
        )}
        {sourcePath ? (
          <>
            <li css={{ margin: '0.8rem 0' }}>
              <hr
                css={{
                  border: 'none',
                  height: 1,
                  backgroundColor: 'var(--color-separator)',
                }}
              />
            </li>
            <li>
              <ViewSource href={sourcePath} />
            </li>
          </>
        ) : null}
      </ul>
    </nav>
  )
}

function Link({
  id,
  children,
  sectionObserver,
}: {
  id: string
  children: React.ReactNode
  sectionObserver: ReturnType<typeof useSectionObserver>
}) {
  const isActive = sectionObserver.useActiveSection(id)

  return (
    <a
      href={`#${id}`}
      onClick={(event) => {
        event.preventDefault()
        sectionObserver.scrollToSection(id)
      }}
      css={{
        color: isActive ? 'white' : 'var(--color-foreground-interactive)',
      }}
    >
      {children}
    </a>
  )
}

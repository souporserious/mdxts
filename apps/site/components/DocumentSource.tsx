import type { FileSystemSource } from 'renoun/collections'
import type { MDXContent, Headings } from 'renoun/mdx'

import { SiblingLink } from './SiblingLink'
import { TableOfContents } from './TableOfContents'

export async function DocumentSource<
  Source extends FileSystemSource<{
    default: MDXContent
    metadata: { title: string; description: string }
    headings: Headings
  }>,
>({
  source,
  shouldRenderTableOfContents = true,
  shouldRenderUpdatedAt = true,
}: {
  source: Source
  shouldRenderTableOfContents?: boolean
  shouldRenderUpdatedAt?: boolean
}) {
  const Content = await source.getExport('default').getValue()
  const metadata = await source.getExport('metadata').getValue()
  const headings = await source.getExport('headings').getValue()
  const updatedAt = shouldRenderUpdatedAt ? await source.getUpdatedAt() : null
  const editPath = source.getEditPath()
  const [previousSource, nextSource] = await source.getSiblings({
    depth: 0,
  })

  return (
    <>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4rem',
        }}
      >
        <div className="prose">
          <h1 css={{ fontSize: '3rem', margin: 0 }}>{metadata.title}</h1>
          {metadata.description ? <p>{metadata.description}</p> : null}
          <Content />
        </div>

        <div css={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {updatedAt ? (
            <div
              css={{
                fontSize: 'var(--font-size-body-3)',
                color: 'var(--color-foreground-secondary)',
              }}
            >
              Last updated{' '}
              <time
                dateTime={updatedAt.toString()}
                itemProp="dateModified"
                css={{ fontWeight: 600 }}
              >
                {updatedAt.toLocaleString('en', {
                  year: '2-digit',
                  month: '2-digit',
                  day: '2-digit',
                })}
              </time>
            </div>
          ) : null}

          <nav
            css={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
            }}
          >
            {previousSource ? (
              <SiblingLink
                source={previousSource}
                direction="previous"
                variant="title"
              />
            ) : null}
            {nextSource ? (
              <SiblingLink
                source={nextSource}
                direction="next"
                variant="title"
              />
            ) : null}
          </nav>
        </div>
      </div>

      {shouldRenderTableOfContents ? (
        <TableOfContents headings={headings} editPath={editPath} />
      ) : null}
    </>
  )
}

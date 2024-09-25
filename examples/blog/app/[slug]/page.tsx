import { PostsCollection } from '@/collections'

export async function generateStaticParams() {
  const sources = await PostsCollection.getSources()
  return sources.map((source) => ({ slug: source.getPathSegments().at(0) }))
}

export default async function Page({ params }: { params: { slug: string } }) {
  const PostSource = PostsCollection.getSource(params.slug)
  const Content = await PostSource.getExport('default').getValue()
  const frontmatter = await PostSource.getExport('frontmatter').getValue()
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'UTC',
  }).format(frontmatter.date)

  return (
    <>
      <h1>{frontmatter.title}</h1>
      <time>{formattedDate}</time>
      <Content />
    </>
  )
}

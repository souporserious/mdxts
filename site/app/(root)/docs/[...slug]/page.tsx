import { notFound } from 'next/navigation'
import { PageContainer } from 'components/PageContainer'
import { allData, allDocs } from 'data'
import { getSiteMetadata } from 'utils/get-site-metadata'
import { BASE_URL } from 'utils/constants'

export const dynamic = 'force-static'

export function generateStaticParams() {
  return allDocs.paths().map((pathname) => ({ slug: pathname.slice(1) }))
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string[] }
}) {
  const data = await allDocs.get(['docs', ...params.slug])
  return getSiteMetadata({
    title: `${data?.title} - MDXTS`,
    description: data?.description,
    openGraph: {
      images: [
        {
          url: `${BASE_URL}/og/${['docs', ...params.slug].join('/')}.png`,
          width: 1200,
          height: 630,
          type: 'image/png',
        },
      ],
    },
  })
}

export default async function Page({ params }: { params: { slug: string[] } }) {
  const doc = await allData.get(['docs', ...params.slug])

  if (doc === undefined) {
    return notFound()
  }

  const { Content, title } = doc

  return (
    <PageContainer dataSource={doc}>
      {title ? <h1>{title}</h1> : null}
      {Content ? <Content /> : null}
    </PageContainer>
  )
}

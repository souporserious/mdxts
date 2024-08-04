import Link from 'next/link'

import { ComponentsCollection, type ComponentSource } from './[...slug]/page'

export default async function Components() {
  return (
    <>
      <h1>Components</h1>
      <ul>
        {ComponentsCollection.getSources(Infinity).map((Source) => (
          <ComponentItem key={Source.getPath()} Source={Source} />
        ))}
      </ul>
    </>
  )
}

async function ComponentItem({ Source }: { Source: ComponentSource }) {
  const pathname = Source.getPath()

  return (
    <li key={pathname}>
      <Link href={pathname}>
        <h2>{pathname}</h2>
      </Link>
    </li>
  )
}

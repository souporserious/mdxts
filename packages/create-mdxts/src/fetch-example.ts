import path from 'node:path'
import {
  createWriteStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import chalk from 'chalk'

import { getCurrentVersion } from './is-package-outdated'
import { Log, askQuestion } from './utils'

/** Fetches the contents of an MDXTS example from the GitHub repository and downloads them to the local file system. */
export async function fetchExample(
  exampleSlug: string,
  prependMessage?: string
) {
  await fetchGitHubDirectory({
    owner: 'souporserious',
    repo: 'mdxts',
    branch: 'main',
    directoryPath: `examples/${exampleSlug}`,
    prependMessage,
  })
}

/** Fetches the contents of a directory in a GitHub repository and downloads them to the local file system. */
async function fetchGitHubDirectory({
  owner,
  repo,
  branch,
  directoryPath,
  basePath = '.',
  prependMessage,
}: {
  owner: string
  repo: string
  branch: string
  directoryPath: string
  basePath?: string
  prependMessage?: string
}) {
  const isRoot = basePath === '.'
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${directoryPath}?ref=${branch}`
  const response = await fetch(apiUrl)
  const directoryName = chalk.bold(path.basename(directoryPath))
  let workingDirectory = process.cwd()

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${chalk.red(directoryName)} at ${apiUrl}: ${
        response.statusText
      }`
    )
  }

  const items = await response.json()

  if (isRoot) {
    const userBasePath = await askQuestion(
      `${prependMessage}Download the ${directoryName} example to ${chalk.bold(
        workingDirectory
      )}? Press enter to proceed or specify a different directory: `
    )

    if (userBasePath !== '') {
      mkdirSync(userBasePath, { recursive: true })

      basePath = userBasePath
      workingDirectory = path.join(workingDirectory, userBasePath)
    }

    Log.info(
      `Downloading ${directoryName} example to ${chalk.bold(workingDirectory)}.`
    )
  }

  for (let item of items) {
    if (item.type === 'dir') {
      const nextDirectoryPath = path.join(directoryPath, item.name)
      const nextBasePath = path.join(basePath, item.name)

      mkdirSync(nextBasePath, { recursive: true })

      await fetchGitHubDirectory({
        owner,
        repo,
        branch,
        directoryPath: nextDirectoryPath,
        basePath: nextBasePath,
      })
    } else if (item.type === 'file') {
      const filePath = path.join(basePath, item.name)
      await downloadFile(item.download_url, filePath)
    }
  }

  if (isRoot) {
    const { detectPackageManager } = await import('@antfu/install-pkg')
    const packageManager = await detectPackageManager(process.cwd())
    const introInstallInstructions =
      basePath === '.'
        ? `Run`
        : `Change to the ${chalk.bold(directoryName)} directory and run`

    await reformatPackageJson(workingDirectory, basePath)

    Log.success(
      `Example ${chalk.bold(
        directoryName
      )} fetched and configured successfully! ${introInstallInstructions} ${chalk.bold(
        `${packageManager ?? 'npm'} install`
      )} to install the dependencies and get started.`
    )
  }
}

const downloadFile = async (url: string, filePath: string) => {
  const response = await fetch(url)

  if (!response.body) {
    throw new Error('Invalid response body')
  }

  if (!response.ok) {
    throw new Error(`Unexpected response ${response.statusText}`)
  }

  const reader = response.body.getReader()
  const stream = new Readable({
    async read() {
      const { done, value } = await reader.read()
      if (done) {
        this.push(null)
      } else {
        this.push(Buffer.from(value))
      }
    },
  })
  const fileStream = createWriteStream(filePath)

  await pipeline(stream, fileStream)
}

/** Re-format package.json file to remove monorepo dependencies and use the latest MDXTS version. */
async function reformatPackageJson(workingDirectory: string, basePath: string) {
  const packageJsonPath = path.join(workingDirectory, basePath, 'package.json')
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))

  // Remove "@example/" prefix from package name
  packageJson.name = packageJson.name.replace('@example/', '')

  // Replace mdxts "workspace:*" with the latest version of the package
  packageJson.dependencies['mdxts'] = await getCurrentVersion()

  // Remove shiki and prettier dependencies since they are only required for the monorepo
  delete packageJson.dependencies['prettier']
  delete packageJson.dependencies['shiki']

  // Write the updated package.json file
  writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf-8')
}

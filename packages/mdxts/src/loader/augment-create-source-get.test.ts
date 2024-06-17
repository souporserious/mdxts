import {
  Node,
  Project,
  SyntaxKind,
  StringLiteral,
  InMemoryFileSystemHost,
} from 'ts-morph'
// import { globSync } from 'fast-glob'
import globParent from 'glob-parent'
import path from 'path'

const workingDirectory = '/Users/username/Code/mdxts'

describe('augments createSource get', () => {
  beforeEach(() => {
    jest.spyOn(process, 'cwd').mockReturnValue(workingDirectory)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('augments createSource get method', () => {
    const fileSystem = new InMemoryFileSystemHost()
    const files = [
      {
        path: 'data.ts',
        content: `import { createSource } from 'mdxts'\n\nexport const allDocs = createSource('docs/*.mdx')`,
      },
      {
        path: 'docs/getting-started.mdx',
        content: `# Getting Started\n\nContent of getting started.`,
      },
      {
        path: 'docs/[slug]/page.tsx',
        content: `import { allDocs } from '../../data'\n\nconst post = allDocs.get('getting-started')`,
      },
    ]

    files.forEach((file) => {
      fileSystem.writeFileSync(`${workingDirectory}/${file.path}`, file.content)
    })

    const project = new Project({
      fileSystem,
      compilerOptions: {
        baseUrl: workingDirectory,
      },
    })

    project.addSourceFilesAtPaths(`${workingDirectory}/**/*.{ts,tsx,mdx}`)

    const dataSource = project
      .getSourceFileOrThrow('data.ts')
      .getVariableDeclarationOrThrow('allDocs')
    const dataSourceFirstArgument = dataSource
      .getInitializerIfKindOrThrow(SyntaxKind.CallExpression)
      .getArguments()
      .at(0)! as StringLiteral
    const filePattern = dataSourceFirstArgument.getLiteralText()
    // const allFilePaths = globSync(filePattern, {
    //   cwd: workingDirectory,
    // })
    // Mock allFilePaths to avoid running the glob function since it's not available in the test environment
    const allFilePaths = ['docs/getting-started.mdx']

    const baseFilePattern = globParent(filePattern)

    const allFilePatternExtensions = new Set<string>()

    allFilePaths.forEach((filePath) => {
      const extension = path.extname(filePath)
      allFilePatternExtensions.add(extension)
    })

    const references = dataSource
      .findReferencesAsNodes()
      .filter((reference) => {
        const parent = reference.getParentOrThrow()
        return (
          Node.isPropertyAccessExpression(parent) &&
          parent.getNameNode().getText() === 'get'
        )
      })

    references.forEach((reference) => {
      const relativeImportPath = path.relative(
        reference.getSourceFile().getFilePath(),
        path.resolve(workingDirectory, baseFilePattern)
      )

      // Insert an import for each file pattern extension
      Array.from(allFilePatternExtensions.values()).forEach(
        (extension, index) => {
          reference
            .getFirstAncestorByKindOrThrow(SyntaxKind.CallExpression)
            .insertArgument(
              index + 1,
              `slug => import(\`${relativeImportPath}/\${slug}${extension}\`)`
            )
        }
      )
    })

    const docsPage = project.getSourceFileOrThrow(
      workingDirectory + '/docs/[slug]/page.tsx'
    )
    const variableDeclaration = docsPage
      .getVariableDeclarationOrThrow('post')
      .getInitializerOrThrow()

    expect(variableDeclaration.getText()).toEqual(
      `allDocs.get('getting-started', slug => import(\`../../\${slug}.mdx\`))`
    )
  })
})

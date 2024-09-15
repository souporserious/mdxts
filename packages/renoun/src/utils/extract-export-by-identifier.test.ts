import { Project } from 'ts-morph'

import { extractExportByIdentifier } from './extract-export-by-identifier'

const sourceFileText = `
import { Image } from 'components'
export { useFocus } from 'hooks'
export * as system from 'system'

type UnusedTypeAlias = { as: any }

const unusedVariable = 'foo'

function unusedFunction() {
  return 'bar'
}

export function useHover() {
  return null
}

const AvatarAssignment = Avatar

const OtherComponentUsingAvatar = () => <AvatarAssignment />

export function Avatar() {
  const unusedNestedVariable = 'foo'
  function unusedNestedFunction() {
    return 'bar'
  }
  return <Image />
}

function ComponentUsingAvatar() {
  return <Avatar />
}

type SystemProps = { as: any }

type BoxProps = { children: any } & SystemProps

export const Box = (props: BoxProps) => <div {...props} />

const Stack = (props: { children: any; style?: any }) => <div {...props} />

export function Badge(props: { children: any }) {
  return <div {...props} />
}

interface ButtonProps {}

export const Button = (props: ButtonProps) => <Stack>Hello Button</Stack>

export { Stack as Stack2 }

export class Car {
  wheels = 4
}

const car = new Car()

class Animal {
  legs = 4
}
`.trim()

const result = `
type SystemProps = { as: any }

type BoxProps = { children: any } & SystemProps

export const Box = (props: BoxProps) => <div {...props} />
`.trim()

test('extracts export and dependencies', () => {
  const project = new Project({ useInMemoryFileSystem: true })
  const sourceFile = project.createSourceFile('test.tsx', sourceFileText)
  const codeString = extractExportByIdentifier(sourceFile, 'Box')

  expect(codeString).toBe(result)
})

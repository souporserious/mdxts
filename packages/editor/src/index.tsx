'use client'
import * as React from 'react'

export function Editor({
  defaultValue,
}: {
  defaultValue: string
}): JSX.Element {
  const [value, setValue] = React.useState<string>(defaultValue)

  return (
    <textarea
      value={value}
      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
        setValue((event.target as any).value)
      }}
    />
  )
}

// import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
// import { initializeMonaco } from './initialize'
// import { getTheme } from './theme'

// /* Convert VS Code theme to Monaco theme */
// // TODO: this should allow setting multiple themes that are all defined at the same time e.g. <Editor theme="night-owl" />
// try {
//   monaco.editor.defineTheme(
//     'mdxts',
//     getTheme(JSON.parse(process.env.MDXTS_THEME))
//   )
//   monaco.editor.setTheme('mdxts')
// } catch (error) {
//   throw new Error(
//     `MDXTS: Invalid theme configuration. Make sure theme is set to a path that exists and defines a valid VS Code theme.`,
//     { cause: error }
//   )
// }

// export function Editor({
//   defaultValue,
//   language = 'typescript',
//   ...props
// }: {
//   defaultValue?: string
//   language?: string
// }) {
//   const id = React.useId().slice(1, -1)
//   const ref = React.useRef(null)

//   React.useLayoutEffect(() => {
//     const model = monaco.editor.createModel(
//       defaultValue,
//       language,
//       monaco.Uri.parse(`${id}.index.tsx`)
//     )

//     const editor = monaco.editor.create(ref.current, {
//       model,
//       language,
//       theme: 'mdxts',
//       automaticLayout: true,
//       fontSize: 16,
//       fontFamily: 'monospace',
//       lineNumbers: 'off',
//       minimap: { enabled: false },
//       ...props,
//     })

//     initializeMonaco(editor)

//     return () => {
//       model.dispose()
//       editor.dispose()
//     }
//   }, [])

//   return <div ref={ref} style={{ height: 400 }} />
// }

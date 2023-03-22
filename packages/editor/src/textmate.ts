import type { Registry, StateStack } from 'vscode-textmate'
import { INITIAL } from 'vscode-textmate'
import * as monaco from 'monaco-editor'

class TokenizerState implements monaco.languages.IState {
  constructor(private _ruleStack: StateStack) {}

  public get ruleStack(): StateStack {
    return this._ruleStack
  }

  public clone(): TokenizerState {
    return new TokenizerState(this._ruleStack)
  }

  public equals(other: monaco.languages.IState): boolean {
    return (
      other instanceof TokenizerState &&
      (other === this || other.ruleStack === this.ruleStack)
    )
  }
}

/** Wires up monaco-editor with monaco-textmate */
export function wireTextMateGrammars(
  /** TmGrammar `Registry` this wiring should rely on to provide the grammars. */
  registry: Registry,

  /** `Map` of language ids (string) to TM names (string). */
  languages: Map<string, string>,

  /** The monaco editor instance to wire up. */
  editor: monaco.editor.ICodeEditor
) {
  const tokenTheme = editor['_themeService'].getColorTheme().tokenTheme
  const defaultForeground = tokenTheme._root._mainRule._foreground

  return Promise.all(
    Array.from(languages.keys()).map(async (languageId) => {
      const grammar = await registry.loadGrammar(languages.get(languageId))

      monaco.languages.setTokensProvider(languageId, {
        getInitialState: () => new TokenizerState(INITIAL),
        tokenize: (line: string, state: TokenizerState) => {
          const result = grammar.tokenizeLine(line, state.ruleStack)

          return {
            endState: new TokenizerState(result.ruleStack),
            tokens: result.tokens.map((token) => {
              const scopes = token.scopes.slice(0)

              for (let index = scopes.length - 1; index >= 0; index--) {
                const scope = scopes[index]
                const foreground = tokenTheme._match(scope)._foreground

                if (foreground !== defaultForeground) {
                  return {
                    ...token,
                    scopes: scope,
                  }
                }
              }

              return {
                ...token,
                scopes: scopes[scopes.length - 1],
              }
            }),
          }
        },
      })
    })
  )
}

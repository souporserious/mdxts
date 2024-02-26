import Highlighter from 'textmate-highlighter'

const ONIGURUMA = 'https://unpkg.com/vscode-oniguruma@2.0.1/release/onig.wasm'

const GRAMMARS = {
  'source.abap':
    'https://unpkg.com/shiki@^0.14.5/languages/abap.tmLanguage.json',
  'source.actionscript.3':
    'https://unpkg.com/shiki@^0.14.5/languages/actionscript-3.tmLanguage.json',
  'source.ada': 'https://unpkg.com/shiki@^0.14.5/languages/ada.tmLanguage.json',
  'source.apacheconf':
    'https://unpkg.com/shiki@^0.14.5/languages/apache.tmLanguage.json',
  'source.apex':
    'https://unpkg.com/shiki@^0.14.5/languages/apex.tmLanguage.json',
  'source.apl': 'https://unpkg.com/shiki@^0.14.5/languages/apl.tmLanguage.json',
  'source.applescript':
    'https://unpkg.com/shiki@^0.14.5/languages/applescript.tmLanguage.json',
  'source.ara': 'https://unpkg.com/shiki@^0.14.5/languages/ara.tmLanguage.json',
  'source.asm.x86_64':
    'https://unpkg.com/shiki@^0.14.5/languages/asm.tmLanguage.json',
  'source.astro':
    'https://unpkg.com/shiki@^0.14.5/languages/astro.tmLanguage.json',
  'source.awk': 'https://unpkg.com/shiki@^0.14.5/languages/awk.tmLanguage.json',
  'source.ballerina':
    'https://unpkg.com/shiki@^0.14.5/languages/ballerina.tmLanguage.json',
  'source.batchfile':
    'https://unpkg.com/shiki@^0.14.5/languages/bat.tmLanguage.json',
  'text.beancount':
    'https://unpkg.com/shiki@^0.14.5/languages/beancount.tmLanguage.json',
  'source.berry':
    'https://unpkg.com/shiki@^0.14.5/languages/berry.tmLanguage.json',
  'text.bibtex':
    'https://unpkg.com/shiki@^0.14.5/languages/bibtex.tmLanguage.json',
  'source.bicep':
    'https://unpkg.com/shiki@^0.14.5/languages/bicep.tmLanguage.json',
  'text.html.php.blade':
    'https://unpkg.com/shiki@^0.14.5/languages/blade.tmLanguage.json',
  'source.c': 'https://unpkg.com/shiki@^0.14.5/languages/c.tmLanguage.json',
  'source.cadence':
    'https://unpkg.com/shiki@^0.14.5/languages/cadence.tmLanguage.json',
  'source.clar':
    'https://unpkg.com/shiki@^0.14.5/languages/clarity.tmLanguage.json',
  'source.clojure':
    'https://unpkg.com/shiki@^0.14.5/languages/clojure.tmLanguage.json',
  'source.cmake':
    'https://unpkg.com/shiki@^0.14.5/languages/cmake.tmLanguage.json',
  'source.cobol':
    'https://unpkg.com/shiki@^0.14.5/languages/cobol.tmLanguage.json',
  'source.ql':
    'https://unpkg.com/shiki@^0.14.5/languages/codeql.tmLanguage.json',
  'source.coffee':
    'https://unpkg.com/shiki@^0.14.5/languages/coffee.tmLanguage.json',
  'source.cpp.embedded.macro':
    'https://unpkg.com/shiki@^0.14.5/languages/cpp-macro.tmLanguage.json',
  'source.cpp': 'https://unpkg.com/shiki@^0.14.5/languages/cpp.tmLanguage.json',
  'source.crystal':
    'https://unpkg.com/shiki@^0.14.5/languages/crystal.tmLanguage.json',
  'source.cs':
    'https://unpkg.com/shiki@^0.14.5/languages/csharp.tmLanguage.json',
  'source.css': 'https://unpkg.com/shiki@^0.14.5/languages/css.tmLanguage.json',
  'source.cue': 'https://unpkg.com/shiki@^0.14.5/languages/cue.tmLanguage.json',
  'source.cypher':
    'https://unpkg.com/shiki@^0.14.5/languages/cypher.tmLanguage.json',
  'source.d': 'https://unpkg.com/shiki@^0.14.5/languages/d.tmLanguage.json',
  'source.dart':
    'https://unpkg.com/shiki@^0.14.5/languages/dart.tmLanguage.json',
  'source.dax': 'https://unpkg.com/shiki@^0.14.5/languages/dax.tmLanguage.json',
  'source.diff':
    'https://unpkg.com/shiki@^0.14.5/languages/diff.tmLanguage.json',
  'source.dockerfile':
    'https://unpkg.com/shiki@^0.14.5/languages/docker.tmLanguage.json',
  'source.dm':
    'https://unpkg.com/shiki@^0.14.5/languages/dream-maker.tmLanguage.json',
  'source.elixir':
    'https://unpkg.com/shiki@^0.14.5/languages/elixir.tmLanguage.json',
  'source.elm': 'https://unpkg.com/shiki@^0.14.5/languages/elm.tmLanguage.json',
  'text.html.erb':
    'https://unpkg.com/shiki@^0.14.5/languages/erb.tmLanguage.json',
  'source.erlang':
    'https://unpkg.com/shiki@^0.14.5/languages/erlang.tmLanguage.json',
  'source.fish':
    'https://unpkg.com/shiki@^0.14.5/languages/fish.tmLanguage.json',
  'source.fsharp':
    'https://unpkg.com/shiki@^0.14.5/languages/fsharp.tmLanguage.json',
  'source.gdresource':
    'https://unpkg.com/shiki@^0.14.5/languages/gdresource.tmLanguage.json',
  'source.gdscript':
    'https://unpkg.com/shiki@^0.14.5/languages/gdscript.tmLanguage.json',
  'source.gdshader':
    'https://unpkg.com/shiki@^0.14.5/languages/gdshader.tmLanguage.json',
  'text.gherkin.feature':
    'https://unpkg.com/shiki@^0.14.5/languages/gherkin.tmLanguage.json',
  'text.git-commit':
    'https://unpkg.com/shiki@^0.14.5/languages/git-commit.tmLanguage.json',
  'text.git-rebase':
    'https://unpkg.com/shiki@^0.14.5/languages/git-rebase.tmLanguage.json',
  'source.gjs':
    'https://unpkg.com/shiki@^0.14.5/languages/glimmer-js.tmLanguage.json',
  'source.gts':
    'https://unpkg.com/shiki@^0.14.5/languages/glimmer-ts.tmLanguage.json',
  'source.glsl':
    'https://unpkg.com/shiki@^0.14.5/languages/glsl.tmLanguage.json',
  'source.gnuplot':
    'https://unpkg.com/shiki@^0.14.5/languages/gnuplot.tmLanguage.json',
  'source.go': 'https://unpkg.com/shiki@^0.14.5/languages/go.tmLanguage.json',
  'source.graphql':
    'https://unpkg.com/shiki@^0.14.5/languages/graphql.tmLanguage.json',
  'source.groovy':
    'https://unpkg.com/shiki@^0.14.5/languages/groovy.tmLanguage.json',
  'source.hack':
    'https://unpkg.com/shiki@^0.14.5/languages/hack.tmLanguage.json',
  'text.haml': 'https://unpkg.com/shiki@^0.14.5/languages/haml.tmLanguage.json',
  'text.html.handlebars':
    'https://unpkg.com/shiki@^0.14.5/languages/handlebars.tmLanguage.json',
  'source.haskell':
    'https://unpkg.com/shiki@^0.14.5/languages/haskell.tmLanguage.json',
  'source.hcl': 'https://unpkg.com/shiki@^0.14.5/languages/hcl.tmLanguage.json',
  'source.hjson':
    'https://unpkg.com/shiki@^0.14.5/languages/hjson.tmLanguage.json',
  'source.hlsl':
    'https://unpkg.com/shiki@^0.14.5/languages/hlsl.tmLanguage.json',
  'text.html.basic':
    'https://unpkg.com/shiki@^0.14.5/languages/html.tmLanguage.json',
  'source.http':
    'https://unpkg.com/shiki@^0.14.5/languages/http.tmLanguage.json',
  'source.imba':
    'https://unpkg.com/shiki@^0.14.5/languages/imba.tmLanguage.json',
  'source.ini': 'https://unpkg.com/shiki@^0.14.5/languages/ini.tmLanguage.json',
  'source.java':
    'https://unpkg.com/shiki@^0.14.5/languages/java.tmLanguage.json',
  'source.js':
    'https://unpkg.com/shiki@^0.14.5/languages/javascript.tmLanguage.json',
  'text.html.jinja':
    'https://unpkg.com/shiki@^0.14.5/languages/jinja-html.tmLanguage.json',
  'source.jinja':
    'https://unpkg.com/shiki@^0.14.5/languages/jinja.tmLanguage.json',
  'source.jison':
    'https://unpkg.com/shiki@^0.14.5/languages/jison.tmLanguage.json',
  'source.json':
    'https://unpkg.com/shiki@^0.14.5/languages/json.tmLanguage.json',
  'source.json5':
    'https://unpkg.com/shiki@^0.14.5/languages/json5.tmLanguage.json',
  'source.json.comments':
    'https://unpkg.com/shiki@^0.14.5/languages/jsonc.tmLanguage.json',
  'source.json.lines':
    'https://unpkg.com/shiki@^0.14.5/languages/jsonl.tmLanguage.json',
  'source.jsonnet':
    'https://unpkg.com/shiki@^0.14.5/languages/jsonnet.tmLanguage.json',
  'source.jssm':
    'https://unpkg.com/shiki@^0.14.5/languages/jssm.tmLanguage.json',
  'source.js.jsx':
    'https://unpkg.com/shiki@^0.14.5/languages/jsx.tmLanguage.json',
  'source.julia':
    'https://unpkg.com/shiki@^0.14.5/languages/julia.tmLanguage.json',
  'source.kotlin':
    'https://unpkg.com/shiki@^0.14.5/languages/kotlin.tmLanguage.json',
  'source.kusto':
    'https://unpkg.com/shiki@^0.14.5/languages/kusto.tmLanguage.json',
  'text.tex.latex':
    'https://unpkg.com/shiki@^0.14.5/languages/latex.tmLanguage.json',
  'source.css.less':
    'https://unpkg.com/shiki@^0.14.5/languages/less.tmLanguage.json',
  'text.html.liquid':
    'https://unpkg.com/shiki@^0.14.5/languages/liquid.tmLanguage.json',
  'source.lisp':
    'https://unpkg.com/shiki@^0.14.5/languages/lisp.tmLanguage.json',
  'source.logo':
    'https://unpkg.com/shiki@^0.14.5/languages/logo.tmLanguage.json',
  'source.lua': 'https://unpkg.com/shiki@^0.14.5/languages/lua.tmLanguage.json',
  'source.makefile':
    'https://unpkg.com/shiki@^0.14.5/languages/make.tmLanguage.json',
  'text.html.markdown':
    'https://unpkg.com/shiki@^0.14.5/languages/markdown.tmLanguage.json',
  'text.marko':
    'https://unpkg.com/shiki@^0.14.5/languages/marko.tmLanguage.json',
  'source.matlab':
    'https://unpkg.com/shiki@^0.14.5/languages/matlab.tmLanguage.json',
  'text.markdown.mdc':
    'https://unpkg.com/shiki@^0.14.5/languages/mdc.tmLanguage.json',
  'source.mdx': 'https://unpkg.com/shiki@^0.14.5/languages/mdx.tmLanguage.json',
  'source.mermaid':
    'https://unpkg.com/shiki@^0.14.5/languages/mermaid.tmLanguage.json',
  'source.mojo':
    'https://unpkg.com/shiki@^0.14.5/languages/mojo.tmLanguage.json',
  'source.narrat':
    'https://unpkg.com/shiki@^0.14.5/languages/narrat.tmLanguage.json',
  'source.nextflow':
    'https://unpkg.com/shiki@^0.14.5/languages/nextflow.tmLanguage.json',
  'source.nginx':
    'https://unpkg.com/shiki@^0.14.5/languages/nginx.tmLanguage.json',
  'source.nim': 'https://unpkg.com/shiki@^0.14.5/languages/nim.tmLanguage.json',
  'source.nix': 'https://unpkg.com/shiki@^0.14.5/languages/nix.tmLanguage.json',
  'source.objc':
    'https://unpkg.com/shiki@^0.14.5/languages/objective-c.tmLanguage.json',
  'source.objcpp':
    'https://unpkg.com/shiki@^0.14.5/languages/objective-cpp.tmLanguage.json',
  'source.ocaml':
    'https://unpkg.com/shiki@^0.14.5/languages/ocaml.tmLanguage.json',
  'source.pascal':
    'https://unpkg.com/shiki@^0.14.5/languages/pascal.tmLanguage.json',
  'source.perl':
    'https://unpkg.com/shiki@^0.14.5/languages/perl.tmLanguage.json',
  'text.html.php':
    'https://unpkg.com/shiki@^0.14.5/languages/php-html.tmLanguage.json',
  'source.php': 'https://unpkg.com/shiki@^0.14.5/languages/php.tmLanguage.json',
  'source.plsql.oracle':
    'https://unpkg.com/shiki@^0.14.5/languages/plsql.tmLanguage.json',
  'source.css.postcss':
    'https://unpkg.com/shiki@^0.14.5/languages/postcss.tmLanguage.json',
  'source.powerquery':
    'https://unpkg.com/shiki@^0.14.5/languages/powerquery.tmLanguage.json',
  'source.powershell':
    'https://unpkg.com/shiki@^0.14.5/languages/powershell.tmLanguage.json',
  'source.prisma':
    'https://unpkg.com/shiki@^0.14.5/languages/prisma.tmLanguage.json',
  'source.prolog':
    'https://unpkg.com/shiki@^0.14.5/languages/prolog.tmLanguage.json',
  'source.proto':
    'https://unpkg.com/shiki@^0.14.5/languages/proto.tmLanguage.json',
  'text.pug': 'https://unpkg.com/shiki@^0.14.5/languages/pug.tmLanguage.json',
  'source.puppet':
    'https://unpkg.com/shiki@^0.14.5/languages/puppet.tmLanguage.json',
  'source.purescript':
    'https://unpkg.com/shiki@^0.14.5/languages/purescript.tmLanguage.json',
  'source.python':
    'https://unpkg.com/shiki@^0.14.5/languages/python.tmLanguage.json',
  'source.r': 'https://unpkg.com/shiki@^0.14.5/languages/r.tmLanguage.json',
  'source.perl.6':
    'https://unpkg.com/shiki@^0.14.5/languages/raku.tmLanguage.json',
  'text.aspnetcorerazor':
    'https://unpkg.com/shiki@^0.14.5/languages/razor.tmLanguage.json',
  'source.reg': 'https://unpkg.com/shiki@^0.14.5/languages/reg.tmLanguage.json',
  'source.rel': 'https://unpkg.com/shiki@^0.14.5/languages/rel.tmLanguage.json',
  'source.riscv':
    'https://unpkg.com/shiki@^0.14.5/languages/riscv.tmLanguage.json',
  'source.rst': 'https://unpkg.com/shiki@^0.14.5/languages/rst.tmLanguage.json',
  'source.ruby':
    'https://unpkg.com/shiki@^0.14.5/languages/ruby.tmLanguage.json',
  'source.rust':
    'https://unpkg.com/shiki@^0.14.5/languages/rust.tmLanguage.json',
  'source.sas': 'https://unpkg.com/shiki@^0.14.5/languages/sas.tmLanguage.json',
  'source.sass':
    'https://unpkg.com/shiki@^0.14.5/languages/sass.tmLanguage.json',
  'source.scala':
    'https://unpkg.com/shiki@^0.14.5/languages/scala.tmLanguage.json',
  'source.scheme':
    'https://unpkg.com/shiki@^0.14.5/languages/scheme.tmLanguage.json',
  'source.css.scss':
    'https://unpkg.com/shiki@^0.14.5/languages/scss.tmLanguage.json',
  'source.shaderlab':
    'https://unpkg.com/shiki@^0.14.5/languages/shaderlab.tmLanguage.json',
  'source.shell':
    'https://unpkg.com/shiki@^0.14.5/languages/shellscript.tmLanguage.json',
  'text.shell-session':
    'https://unpkg.com/shiki@^0.14.5/languages/shellsession.tmLanguage.json',
  'source.smalltalk':
    'https://unpkg.com/shiki@^0.14.5/languages/smalltalk.tmLanguage.json',
  'source.solidity':
    'https://unpkg.com/shiki@^0.14.5/languages/solidity.tmLanguage.json',
  'source.sparql':
    'https://unpkg.com/shiki@^0.14.5/languages/sparql.tmLanguage.json',
  'source.splunk_search':
    'https://unpkg.com/shiki@^0.14.5/languages/splunk.tmLanguage.json',
  'source.sql': 'https://unpkg.com/shiki@^0.14.5/languages/sql.tmLanguage.json',
  'source.ssh-config':
    'https://unpkg.com/shiki@^0.14.5/languages/ssh-config.tmLanguage.json',
  'source.stata':
    'https://unpkg.com/shiki@^0.14.5/languages/stata.tmLanguage.json',
  'source.stylus':
    'https://unpkg.com/shiki@^0.14.5/languages/stylus.tmLanguage.json',
  'source.svelte':
    'https://unpkg.com/shiki@^0.14.5/languages/svelte.tmLanguage.json',
  'source.swift':
    'https://unpkg.com/shiki@^0.14.5/languages/swift.tmLanguage.json',
  'source.systemverilog':
    'https://unpkg.com/shiki@^0.14.5/languages/system-verilog.tmLanguage.json',
  'source.tasl':
    'https://unpkg.com/shiki@^0.14.5/languages/tasl.tmLanguage.json',
  'source.tcl': 'https://unpkg.com/shiki@^0.14.5/languages/tcl.tmLanguage.json',
  'text.tex': 'https://unpkg.com/shiki@^0.14.5/languages/tex.tmLanguage.json',
  'source.toml':
    'https://unpkg.com/shiki@^0.14.5/languages/toml.tmLanguage.json',
  'source.tsx': 'https://unpkg.com/shiki@^0.14.5/languages/tsx.tmLanguage.json',
  'source.turtle':
    'https://unpkg.com/shiki@^0.14.5/languages/turtle.tmLanguage.json',
  'text.html.twig':
    'https://unpkg.com/shiki@^0.14.5/languages/twig.tmLanguage.json',
  'source.ts':
    'https://unpkg.com/shiki@^0.14.5/languages/typescript.tmLanguage.json',
  'source.v': 'https://unpkg.com/shiki@^0.14.5/languages/v.tmLanguage.json',
  'source.asp.vb.net':
    'https://unpkg.com/shiki@^0.14.5/languages/vb.tmLanguage.json',
  'source.verilog':
    'https://unpkg.com/shiki@^0.14.5/languages/verilog.tmLanguage.json',
  'source.vhdl':
    'https://unpkg.com/shiki@^0.14.5/languages/vhdl.tmLanguage.json',
  'source.viml':
    'https://unpkg.com/shiki@^0.14.5/languages/viml.tmLanguage.json',
  'text.html.vue-html':
    'https://unpkg.com/shiki@^0.14.5/languages/vue-html.tmLanguage.json',
  'source.vue': 'https://unpkg.com/shiki@^0.14.5/languages/vue.tmLanguage.json',
  'source.vyper':
    'https://unpkg.com/shiki@^0.14.5/languages/vyper.tmLanguage.json',
  'source.wat':
    'https://unpkg.com/shiki@^0.14.5/languages/wasm.tmLanguage.json',
  'source.wenyan':
    'https://unpkg.com/shiki@^0.14.5/languages/wenyan.tmLanguage.json',
  'source.wgsl':
    'https://unpkg.com/shiki@^0.14.5/languages/wgsl.tmLanguage.json',
  'source.wolfram':
    'https://unpkg.com/shiki@^0.14.5/languages/wolfram.tmLanguage.json',
  'text.xml': 'https://unpkg.com/shiki@^0.14.5/languages/xml.tmLanguage.json',
  'text.xml.xsl':
    'https://unpkg.com/shiki@^0.14.5/languages/xsl.tmLanguage.json',
  'source.yaml':
    'https://unpkg.com/shiki@^0.14.5/languages/yaml.tmLanguage.json',
  'source.zenscript':
    'https://unpkg.com/shiki@^0.14.5/languages/zenscript.tmLanguage.json',
  'source.zig': 'https://unpkg.com/shiki@^0.14.5/languages/zig.tmLanguage.json',
} as const

const THEMES = {
  'css-variables': 'https://unpkg.com/shiki@^0.14.5/themes/css-variables.json',
  'dark-plus': 'https://unpkg.com/shiki@^0.14.5/themes/dark-plus.json',
  'dracula-soft': 'https://unpkg.com/shiki@^0.14.5/themes/dracula-soft.json',
  dracula: 'https://unpkg.com/shiki@^0.14.5/themes/dracula.json',
  'github-dark-dimmed':
    'https://unpkg.com/shiki@^0.14.5/themes/github-dark-dimmed.json',
  'github-dark': 'https://unpkg.com/shiki@^0.14.5/themes/github-dark.json',
  'github-light': 'https://unpkg.com/shiki@^0.14.5/themes/github-light.json',
  hc_light: 'https://unpkg.com/shiki@^0.14.5/themes/hc_light.json',
  'light-plus': 'https://unpkg.com/shiki@^0.14.5/themes/light-plus.json',
  'material-theme-darker':
    'https://unpkg.com/shiki@^0.14.5/themes/material-theme-darker.json',
  'material-theme-lighter':
    'https://unpkg.com/shiki@^0.14.5/themes/material-theme-lighter.json',
  'material-theme-ocean':
    'https://unpkg.com/shiki@^0.14.5/themes/material-theme-ocean.json',
  'material-theme-palenight':
    'https://unpkg.com/shiki@^0.14.5/themes/material-theme-palenight.json',
  'material-theme':
    'https://unpkg.com/shiki@^0.14.5/themes/material-theme.json',
  'min-dark': 'https://unpkg.com/shiki@^0.14.5/themes/min-dark.json',
  'min-light': 'https://unpkg.com/shiki@^0.14.5/themes/min-light.json',
  monokai: 'https://unpkg.com/shiki@^0.14.5/themes/monokai.json',
  nord: 'https://unpkg.com/shiki@^0.14.5/themes/nord.json',
  'one-dark-pro': 'https://unpkg.com/shiki@^0.14.5/themes/one-dark-pro.json',
  poimandres: 'https://unpkg.com/shiki@^0.14.5/themes/poimandres.json',
  'rose-pine-dawn':
    'https://unpkg.com/shiki@^0.14.5/themes/rose-pine-dawn.json',
  'rose-pine-moon':
    'https://unpkg.com/shiki@^0.14.5/themes/rose-pine-moon.json',
  'rose-pine': 'https://unpkg.com/shiki@^0.14.5/themes/rose-pine.json',
  'slack-dark': 'https://unpkg.com/shiki@^0.14.5/themes/slack-dark.json',
  'slack-ochin': 'https://unpkg.com/shiki@^0.14.5/themes/slack-ochin.json',
  'solarized-dark':
    'https://unpkg.com/shiki@^0.14.5/themes/solarized-dark.json',
  'solarized-light':
    'https://unpkg.com/shiki@^0.14.5/themes/solarized-light.json',
  'vitesse-dark': 'https://unpkg.com/shiki@^0.14.5/themes/vitesse-dark.json',
  'vitesse-light': 'https://unpkg.com/shiki@^0.14.5/themes/vitesse-light.json',
} as const

export function createHighlighter() {
  return new Highlighter({
    getGrammar: (grammar: keyof typeof GRAMMARS) => {
      return GRAMMARS[grammar]
    },
    getTheme: (theme: keyof typeof THEMES) => {
      return THEMES[theme]
    },
    getOniguruma: () => {
      return ONIGURUMA
    },
  })
}

# Pun Scripting Server

This document describes a future Language Server Protocol implementation for Pun scripting. It is a design and implementation guide, not a completed feature.

The goal is to support editor features for `.pun` files without changing the Pun language syntax or duplicating the compiler/runtime logic.

## Goals

- Diagnostics for syntax and runtime-structure errors where possible
- Syntax-aware highlighting support through semantic tokens or editor grammars
- Hover help for keywords, built-ins, and known symbols
- Completion for keywords, built-ins, properties, functions, and local variables
- Go to definition for user-defined functions and variables
- Document symbols for functions and top-level assignments
- Formatting or range formatting once the language grammar is stable enough
- Works for mixed HTML plus `<?pun ... ?>` blocks
- Reuses the existing lexer, parser, AST, and template block extraction behavior

## Non-Goals

- Do not execute Pun files while editing.
- Do not start `WebServer` from the language server.
- Do not require Swing, `MainWindow`, or desktop APIs.
- Do not add a large framework unless the implementation needs it.
- Do not change current `.pun` syntax just to simplify editor support.

## Current Project Context

Pun currently has:

- `Lexer`
- `Parser`
- AST node classes
- `Interpreter`
- `PunTemplateEngine`
- `RequestHandler`
- `WebServer`
- Swing GUI through `MainWindow`
- CLI entry through `CliRunner`

A language server should sit beside these pieces:

```text
Editor
  -> LSP JSON-RPC
Pun Scripting Server
  -> Document store
  -> Pun block extractor
  -> Lexer
  -> Parser
  -> Symbol index
  -> Diagnostics / completion / hover
Editor
```

It should not depend on GUI or web-server startup.

## Suggested Package Layout

```text
src/main/java/com/suneet/pun/lsp/
  PunLanguageServer.java
  PunTextDocumentService.java
  PunWorkspaceService.java
  DocumentStore.java
  PunDocument.java
  PunBlock.java
  PunBlockExtractor.java
  DiagnosticService.java
  CompletionService.java
  HoverService.java
  SymbolService.java
```

If LSP support grows, keep protocol adapters separate from Pun analysis:

```text
src/main/java/com/suneet/pun/analysis/
  Analyzer.java
  AnalysisResult.java
  SymbolTable.java
  Symbol.java
  Scope.java
```

The `analysis` package should be reusable by a CLI command such as:

```bash
java -jar pun-server.jar check file.pun
```

## Recommended Dependency

Use `org.eclipse.lsp4j` when implementing the protocol layer. It is the standard Java LSP library and avoids hand-writing JSON-RPC plumbing.

Do not add it until actual language server implementation begins.

Example future dependency:

```xml
<dependency>
    <groupId>org.eclipse.lsp4j</groupId>
    <artifactId>org.eclipse.lsp4j</artifactId>
    <version><!-- current stable version --></version>
</dependency>
```

## Transport

Start with standard input/output transport. This works with VS Code, IntelliJ integrations, Neovim, and other LSP clients.

Future command shape:

```bash
java -jar pun-server.jar lsp
```

Important: LSP protocol messages use stdout. Logs must go to stderr or a file, never stdout.

## Document Model

The server should keep an in-memory document store keyed by URI.

Each document should track:

- URI
- full text
- version from the editor
- line offsets
- extracted Pun blocks
- latest parse result
- latest diagnostics

Line and character positions must be based on UTF-16 code units because LSP positions use UTF-16 by default.

## Pun Block Extraction

`.pun` files are mixed documents:

```html
<h1>Hello</h1>

<?pun
naam = "Suneet"
dasso naam
?>
```

The language server should analyze only source inside `<?pun ... ?>` blocks, while preserving offsets back to the original document.

For every block, track:

```text
start offset of <?pun
start offset of Pun source
end offset of Pun source
end offset of ?>
source text
line/column mapping
```

Diagnostics from the lexer/parser must be translated back to the original `.pun` file range.

## Diagnostics

Diagnostics should run on:

- `textDocument/didOpen`
- `textDocument/didChange`
- `textDocument/didSave`, if supported by the client

Start with parser diagnostics:

- unterminated string
- unexpected token
- missing `}`
- missing `)`
- invalid expression
- invalid assignment target

Later add semantic diagnostics:

- unknown variable
- unknown function
- wrong function arity
- invalid property on `mang`
- invalid property on `jawab`
- suspicious unreachable code after `wapas`

Severity mapping:

```text
syntax error      -> Error
semantic error    -> Error or Warning
style suggestion  -> Information or Hint
```

Diagnostics must not execute user code.

## Completions

Completion should work inside Pun blocks only.

Initial completion items:

```pun
je
nahi_ta
jad_tak
kaam
wapas
dasso
sach
jhooth
khali
mang
jawab
```

Built-in property completions:

```pun
mang.GET
mang.method
mang.path
jawab.status
jawab.type
```

User symbols:

- variables assigned earlier in the same page
- function names declared in the same page
- function parameters inside function bodies

Completion should be context-aware enough to avoid suggesting Pun keywords in ordinary HTML.

## Hover

Hover text should explain core language items briefly:

```text
dasso
Prints a value into the rendered page response.
```

```text
mang.GET
Map of decoded query-string parameters. Missing keys return khali.
```

```text
jawab.status
HTTP response status code. Defaults to 200.
```

For user-defined functions, hover should show:

```pun
kaam function_name(param1, param2)
```

## Go To Definition

Definition lookup should support:

- function call to `kaam` declaration
- variable read to nearest assignment in visible scope
- function parameter read to parameter declaration

Start with same-document definitions only. Cross-file support can come later if Pun gains imports/modules.

## Document Symbols

Return symbols for:

- functions
- top-level variable assignments
- possibly Pun blocks

Example outline:

```text
index.pun
  Pun block
  kaam sat_sri_akal(banda)
  message
```

## Formatting

Formatting should be delayed until the grammar and style expectations are more stable.

When implemented:

- format only inside `<?pun ... ?>` blocks
- preserve surrounding HTML
- use 4 spaces for indentation
- place `{` on the same line as `je`, `nahi_ta`, `jad_tak`, and `kaam`

Example:

```pun
je naam == khali {
    naam = "Dost"
}
nahi_ta {
    dasso naam
}
```

## Semantic Tokens

Semantic token categories can include:

- keyword
- variable
- function
- parameter
- property
- string
- number
- comment
- operator

HTML highlighting should remain the editor's responsibility. The language server should only provide Pun tokens inside Pun blocks.

## Error Recovery

The current parser may stop at the first syntax error. For editor use, the analyzer should eventually recover enough to continue collecting symbols and diagnostics.

Possible recovery strategy:

- report the first parser error
- skip tokens until a likely statement boundary
- resume parsing after `}`, newline-equivalent boundaries, or known statement starts

This should be added carefully so normal server rendering behavior is not weakened.

## Reuse Rules

The language server must reuse existing Pun logic:

- use `Lexer` for tokens
- use `Parser` for AST
- use existing AST classes
- extract Pun template blocks consistently with `PunTemplateEngine`

If block extraction logic needs to be shared, move it into a small reusable class instead of copying it.

Do not make editor behavior depend on `Interpreter`, except for optional future static analysis helpers that do not execute code.

## CLI Integration

Future commands can fit the existing CLI shape:

```bash
java -jar pun-server.jar lsp
java -jar pun-server.jar check file.pun
```

`Main` should dispatch these commands without initializing Swing.

Recommended command ownership:

```text
Main
  -> CliRunner
      -> lsp
          -> PunLanguageServer
      -> check
          -> Analyzer
```

## Testing Plan

Add tests for:

- block extraction offsets
- diagnostics inside one Pun block
- diagnostics across multiple Pun blocks
- completion outside Pun blocks returns nothing
- completion inside Pun blocks returns keywords and built-ins
- symbol collection for functions and variables
- position mapping from block-local positions to document positions
- LSP `didOpen` and `didChange` behavior

Avoid tests that require an actual editor.

## Editor Integration Plan

Recommended order:

1. Implement analyzer and block extraction with unit tests.
2. Add `lsp` CLI command.
3. Wire LSP document open/change/diagnostics.
4. Add completion.
5. Add hover.
6. Add document symbols.
7. Add go to definition.
8. Build a small VS Code extension that launches:

```bash
java -jar pun-server.jar lsp
```

## Open Questions

- Should `.pun` files use embedded HTML language support from the editor, with only Pun blocks handled by the language server?
- Should Pun support imports/modules before cross-file symbols are implemented?
- Should diagnostics include warnings for unused variables?
- Should language server logs default to stderr or a configurable log file?
- Should `check` and `lsp` share one analyzer API from the start?

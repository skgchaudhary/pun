# Pun Language (VS Code)

Syntax highlighting for `.pun` files: HTML everywhere, Pun inside `<?pun ... ?>` blocks
(including blocks inside HTML attributes, `<script>` and `<style>`).

## Install

```sh
cd vscode-pun
npx @vscode/vsce package --skip-license --allow-missing-repository
code --install-extension pun-language-0.0.1.vsix
```

Then reload the VS Code window.

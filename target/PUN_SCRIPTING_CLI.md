# Pun Scripting CLI

This document covers running Pun from the command line.

## Requirements

- Java 21 or newer
- A built Pun Server JAR, usually:

```text
target/pun-server.jar
```

On Windows PowerShell, use backslashes in paths:

```powershell
target\pun-server.jar
```

## Commands

```text
serve    Start the Pun web server
repl     Start an interactive Pun prompt
help     Show CLI help
version  Show the Pun Server version
```

## Serve The Default `chowk` Folder

Start the web server on port `8080`:

```bash
java -jar target/pun-server.jar serve
```

On Windows PowerShell:

```powershell
java -jar target\pun-server.jar serve
```

When no folder is passed, Pun Server uses a default folder named:

```text
chowk
```

If `chowk` does not exist, Pun Server creates it.

Default layout:

```text
pun/
  chowk/
    index.pun
  target/
    pun-server.jar
```

In this layout, running:

```bash
java -jar target/pun-server.jar serve
```

serves:

```text
chowk/
```

## Serve A Custom Folder

Pass a folder path to override the default `chowk` folder:

```bash
java -jar target/pun-server.jar serve ./examples/hello-pun
```

On Windows PowerShell:

```powershell
java -jar target\pun-server.jar serve .\examples\hello-pun
```

You can also serve the current directory explicitly:

```bash
java -jar target/pun-server.jar serve .
```

## Custom Port

Use `--port`:

```bash
java -jar target/pun-server.jar serve ./examples/hello-pun --port 9000
```

Or the short form `-p`:

```bash
java -jar target/pun-server.jar serve ./examples/hello-pun -p 9000
```

Then open:

```text
http://localhost:9000/
```

## Server URL Mapping

When the server is running:

```text
GET /        -> index.pun
GET /x.pun   -> x.pun
GET /css/a.css -> css/a.css
```

`.pun` files are executed through the Pun template engine.

Static files are served directly, including:

```text
.html
.css
.js
.json
.png
.jpg
.jpeg
.gif
.svg
.ico
.txt
```

Stop the CLI server with `Ctrl+C`.

## REPL

Start the Pun REPL:

```bash
java -jar target/pun-server.jar repl
```

On Windows PowerShell:

```powershell
java -jar target\pun-server.jar repl
```

The REPL runs Pun statements directly using the same lexer, parser, and interpreter as `.pun` scripts.

Example:

```text
pun> naam = "Suneet"
pun> dasso "Sat Sri Akal " + naam
Sat Sri Akal Suneet
pun> :quit
```

Variables and functions stay available until the REPL exits:

```text
pun> x = 2
pun> kaam double(n) { wapas n * 2 }
pun> dasso double(x)
4
```

Multiline blocks are supported:

```text
pun> je sach {
...>     dasso "ok"
...> }
ok
```

REPL commands:

```text
:help   Show REPL help
:quit   Exit the REPL
:exit   Exit the REPL
```

Use `dasso` to print output. Plain expressions run, but they do not print automatically.

## Help And Version

Show CLI help:

```bash
java -jar target/pun-server.jar help
```

Show version:

```bash
java -jar target/pun-server.jar version
```

## Exit Codes

```text
0  success
1  runtime/startup error
2  CLI usage error
```

## Common Examples

Start default site:

```bash
java -jar target/pun-server.jar serve
```

Start custom site:

```bash
java -jar target/pun-server.jar serve ./my-site
```

Start custom site on port `9000`:

```bash
java -jar target/pun-server.jar serve ./my-site --port 9000
```

Open the REPL:

```bash
java -jar target/pun-server.jar repl
```

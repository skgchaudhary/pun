# Pun Server

Pun Server is a Java 21 desktop application and embedded web server for a small PHP-like server-side scripting language named Pun. Pun files use the `.pun` extension and mix normal HTML with backend script blocks:

```html
<?pun
naam = "Suneet"
dasso "<h1>Sat Sri Akal " + naam + "</h1>"
?>
```

The MVP is intentionally small: it has a custom lexer, parser, AST, interpreter, template engine, Swing GUI, and Java built-in `HttpServer`. It does not translate Pun to Java and does not use Spring Boot, Gradle, or an external scripting engine.

## Requirements

- Java 21 LTS
- Maven
- UTF-8 source files and runtime input

## Build

```bash
mvn clean package
```

The runnable JAR is:

```text
target/pun-server.jar
```

## Run GUI Mode

```bash
java -jar target/pun-server.jar
```

This opens the Pun Server desktop GUI. It defaults to a `chowk` website folder beside the server output folder and creates it if needed. Choose another website folder to override the default, choose a port, start the server, and open `http://localhost:PORT/`.

## Run CLI Mode

Serve the default `chowk` folder on port `8080`:

```bash
java -jar target/pun-server.jar serve
```

If `chowk` is missing, Pun Server creates it beside the folder that contains `target`.

Serve a project folder:

```bash
java -jar target/pun-server.jar serve ./examples/hello-pun
```

Serve a project folder on a custom port:

```bash
java -jar target/pun-server.jar serve ./examples/hello-pun --port 9000
```

The short port option is also supported:

```bash
java -jar target/pun-server.jar serve . -p 9000
```

CLI mode writes server logs to the terminal and is suitable for terminal use, headless Linux servers, Docker, and remote machines.

Use the built-in help and version commands:

```bash
java -jar target/pun-server.jar help
java -jar target/pun-server.jar version
```

## Run REPL Mode

Start an interactive Pun prompt:

```bash
java -jar target/pun-server.jar repl
```

Enter Pun statements directly. Variables and functions stay available until you exit:

```text
pun> x = 2
pun> kaam double(n) { wapas n * 2 }
pun> dasso double(x)
4
pun> :quit
```

Use `:help` for REPL commands and `:quit` or `:exit` to leave.

## Website Folders

A Pun website can look like this:

```text
project/
  index.pun
  login.pun
  users.pun
  css/style.css
  js/app.js
  images/logo.png
```

`GET /` maps to `index.pun`. Static assets such as CSS, JS, JSON, TXT, PNG, JPG, GIF, SVG, and ICO are served directly.

## Keywords

| Pun | Meaning |
| --- | --- |
| `je` | if |
| `nahi_ta` | else |
| `jad_tak` | while |
| `kaam` | function |
| `wapas` | return |
| `dasso` | print / echo |
| `sach` | true |
| `jhooth` | false |
| `khali` | null |

Reserved for later: `har_ik`, `vich`, `nava`, `jodo`.

## Syntax Examples

Variables need no declaration:

```pun
naam = "Suneet"
umar = 37
active = sach
value = khali
```

Print output with `dasso`:

```pun
dasso "Hello " + naam
dasso 10 + 20
```

Conditionals:

```pun
je umar >= 18 {
    dasso "Adult"
}
nahi_ta {
    dasso "Minor"
}
```

Loops:

```pun
i = 1
jad_tak i <= 5 {
    dasso i
    i = i + 1
}
```

Functions:

```pun
kaam jod(a, b) {
    wapas a + b
}

dasso jod(10, 20)
```

## Request And Response Objects

Pun exposes `mang` for request data:

```pun
naam = mang.GET["naam"]
dasso mang.method
dasso mang.path
```

Missing query values return `khali`.

Pun exposes `jawab` for response metadata:

```pun
jawab.status = 200
jawab.type = "application/json"
```

Defaults are status `200` and type `text/html; charset=UTF-8`.

## Template Blocks

HTML outside `<?pun ... ?>` is sent as-is. Pun source is executed and replaced by `dasso` output. Multiple blocks in one page share one environment:

```html
<?pun
naam = "Suneet"
?>
<h1>Hello</h1>
<?pun
dasso naam
?>
```

Raw Pun source is never sent to the browser for `.pun` files.

## Architecture

```text
Browser
  -> HTTP request
Pun Server
  -> RequestHandler
  -> PunTemplateEngine
  -> Lexer
  -> Parser
  -> AST
  -> Interpreter
  -> Generated HTML
  -> HTTP response
Browser
```

The interpreter only exposes explicit built-ins. Pun scripts do not get reflection, JVM classes, process execution, arbitrary filesystem access, environment variables, or `System.exit`.

## Sample Website

Use `examples/hello-pun` in the GUI. Then visit:

```text
http://localhost:8080/
http://localhost:8080/?naam=Suneet
http://localhost:8080/form.pun?naam=Suneet
```

The rendered text for the query example includes `Sat Sri Akal Suneet`.

## Future Roadmap

Planned but not fully implemented in this MVP:

- arrays and maps
- `har_ik ... vich` loops
- POST data
- cookies and sessions
- JSON helpers
- JDBC database support
- MySQL and PostgreSQL
- modules and imports
- package manager
- more Pun CLI commands
- production server hardening
- error debugger and source maps
- VS Code syntax highlighting
- IntelliJ plugin
- language server
- bytecode or JVM compilation
- parsed AST caching
- multithreading improvements

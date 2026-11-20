# Pun Server

**PUN 4.0.0 — Hisaab Pakka, Chaal Tez! 🚀**

Pun Server is a Java 21 desktop application and embedded web server for a small PHP-like server-side scripting language named Pun. Pun files use the `.pun` extension and mix normal HTML with backend script blocks:

```html
<?pun
naam = "Suneet"
dasso "<h1>Sat Sri Akal " + naam + "</h1>"
?>
```

The MVP is intentionally small: it has a custom lexer, parser, AST, interpreter, instruction VM for compiled pages, template engine, Swing GUI, and Java built-in `HttpServer`. It does not translate Pun to Java and does not use Spring Boot, Gradle, or an external scripting engine.

## Latest runtime development

Block scopes now allocate their variable map only when they store a local variable. This reduces allocation in loops that read or update variables in an outer scope. The existing 10,000-iteration execution benchmark measured about 1,175 KiB per run before this change and 707 KiB per run afterward. Five post-change runs had a median of 0.924 ms; the single pre-change run was 0.972 ms, so a reliable speedup has not been established. The scope behavior is covered by a focused regression test, and the full test suite passed with one conditional integration test aborted.

New in PUN 4.0.0: compiled pages run as JVM code. `build` writes each page of a `.pind` as `.ghar` version 2: the page compiled to stack-machine instructions with numbered variable slots, checked by a verifier when it is loaded. When the server mounts the bundle it translates each verified page into a JVM class, and the JVM compiles that to machine code as the page is used. Over HTTP, on the 13 sample_dsa workloads, a compiled page now takes 1.8 times as long as the same page in PHP 8.3 with OPcache (0.9 to 3.2 times by case); with PUN 3.0.0 it took 15 times as long. That is 8.5 times faster than 3.0.0 and 3.3 times faster than the instruction VM alone, with output and error messages identical to the interpreter. A unit too large for JVM code stays on the instruction VM. Version 1 `.ghar` files (serialized syntax trees, as written by PUN 3.0.0) still load and run on the interpreter, as do `.pun` source pages. See [performance measurements](benchmarks/RESULTS.md) for the test setup, where a request's time goes, and the limitations.

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

### Build and serve a compiled app

Build a source app into a separate folder (the source folder is not changed):

```bash
java -jar target/pun-server.jar build chowk/sample_site
# creates chowk/sample_site/sample_site.raah.json if missing
# writes chowk/sample_site_pind/sample_site.pind
```

Use `--out <folder>` to choose another output folder. On the first build, use
`--alias /dashboard=dashboard.pun` to add a clean route. Edit the generated
source `.raah.json` for later changes. The build preserves an existing source
controller and fails for missing pages or conflicting routes. Each `.pun` URL
is included in a generated controller; `/` points to `index.pun` when present.
Without `index.pun`, add an explicit `/` mapping to the source controller.

The route controller is JSON with `version`, `bundle`, and `routes` fields:

```json
{
  "version": 1,
  "routes": {
    "/": "index.pun",
    "/dashboard.pun": "dashboard.pun",
    "/dashboard": "dashboard.pun"
  }
}
```

The server discovers `.pind` files in subfolders beneath the document root at startup.
For example, `serve chowk` serves source `/sample_site/` and compiled
`/sample_site_pind/` on the same port. Deploy only `sample_site.pind` in the
compiled folder. Its route controller is embedded as private metadata.
`.pind`, `.raah.json`, and `.ghar` files are not downloadable. Rebuild and restart
the server to load a changed bundle.

Pages are compiled to instructions (`.ghar` version 2), which the server turns into
JVM code when it mounts the bundle: same output and errors as the interpreter, about
8.5 times faster than PUN 3.0.0 on loops and calls (4 to 14 times by case), with
much less allocation. Pages with a `kaam` nested in a block or another `kaam` stay
on the interpreter (version 1). `build ... --ghar 1` writes only version 1, for
servers that predate the VM. Version 1 bundles from earlier releases still load.

When using a reverse proxy or separate static server, forward requests for
deployment internals to Pun Server or serve from a public-assets directory
that excludes `.pind`, `.ghar`, `.raah.json`, and `META-INF` files.

In the GUI, choose **Build PIND**, select the source folder, then select the
output folder. The result appears in the log and a dialog. Use the existing
Project Folder picker and **Start Server** to serve the parent document root.

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
| `vekh` | switch |
| `jeh` | case |
| `jad_tak` | while |
| `kaam` | function |
| `wapas` | return |
| `dasso` | print / echo |
| `sach` | true |
| `jhooth` | false |
| `khali` | null |

Reserved for later: `nava`.

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

Switch on a value with `vekh`. The first matching `jeh` runs; `nahi_ta` runs when none match:

```pun
drink = "lassi"
vekh drink {
    jeh "chaa" { dasso "Chaa le aao!" }
    jeh "lassi" { dasso "Vadda glass le aao!" }
    nahi_ta { dasso "Paani hi de deo!" }
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

Collections:

```pun
names = soochi("Suneet", "Aman", "Suneet")
names.jodo("Gurpreet")

user = shabdkosh("naam": "Suneet", "umar": 37)
user["city"] = "Mumbai"

roles = jatha("admin", "developer", "admin")
dasso roles.ginti()

har_ik name vich names {
    dasso name
}

har_ik key, value vich user {
    dasso key + "=" + value
}
```

## Request And Response Objects

Pun exposes `mang` for request data:

```pun
naam = mang.GET["naam"]
email = mang.POST["email"]
dasso mang.method
dasso mang.path
```

`mang.GET` contains decoded query parameters. `mang.POST` contains decoded
form fields from `application/x-www-form-urlencoded` POST requests. Missing
values return `khali`. GET and POST are separate read-only `shabdkosh`
collections.

Request parsing rules:

- query string limit: 16 KiB
- form body limit: 1 MiB
- parameter limit: 1,000
- repeated GET/POST keys: last value wins, original key position remains
- malformed URL encoding returns `400`
- oversized form bodies return `413`
- oversized query strings return `414`
- unsupported non-empty POST content types return `415`
- JSON and multipart request bodies are not parsed into `mang.POST`

Pun has three collection types backed by Java collections:

| Pun | Java backing type |
| --- | --- |
| `shabdkosh` | `Map<String, PunValue>` |
| `soochi` | `List<PunValue>` |
| `jatha` | `Set<PunValue>` |

Use `soochi(...)` for ordered lists, `shabdkosh("key": value)` for maps, and
`jatha(...)` for insertion-ordered unique values. Collection assignment uses
references, so mutating an alias mutates the same collection.

```pun
skills = soochi("PHP", "Java", "PHP")
unique = jatha(skills)
user = shabdkosh("naam": "Suneet", "skills": skills)
dasso user["skills"][0]
```

Collection methods:

| Method | `soochi` | `shabdkosh` | `jatha` |
| --- | --- | --- | --- |
| `ginti()` | element count | key count | member count |
| `hai(value)` | contains value | contains key | contains member |
| `jodo(value)` | append | not supported | add member |
| `hatao(value)` | remove first value | remove key | remove member |
| `saaf()` | clear | clear | clear |
| `pehla()` | first value or `khali` | not supported | not supported |
| `akhri()` | last value or `khali` | not supported | not supported |
| `chaabiyan()` | not supported | list of keys | not supported |
| `mull()` | not supported | list of values | not supported |

Lists and sets iterate values. Maps iterate keys with one variable, or key/value
pairs with two variables. Mutable collections compare by reference identity.
`jatha` accepts strings, numbers, booleans, and `khali`; mutable collections are
rejected as set members.

Pun exposes `jawab` for response metadata:

```pun
jawab.status = 200
jawab.type = "application/json"
```

Defaults are status `200` and type `text/html; charset=UTF-8`.

## Database Access

Pun supports MySQL database access through JDBC prepared statements:

```pun
db = bhandar("mysql", "localhost", 3306, "pun_test", "root", "password")
db.jodo()

stmt = db.taiyar("SELECT id, naam FROM users WHERE active = ?")
stmt.mull(1, sach)
users = stmt.saare()

har_ik user vich users {
    dasso user["naam"]
}

db.band()
```

The Pun API is intentionally small: `bhandar`, `jodo`, `taiyar`, `mull`,
`ik`, `saare`, `chalao`, `badle`, and `band`. Raw JDBC objects are not exposed
to scripts. The implementation is MySQL-first and uses a driver abstraction so
additional JDBC databases can be added later without a major Pun syntax change.

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

Unchanged `.pun` files up to 128 KiB can reuse parsed template segments across requests. The cache defaults to 128 entries and an estimated 16 MiB budget; larger files are read and rendered incrementally. Rendered responses stay in memory up to 64 KiB of UTF-8 bytes, then spill to a temporary file before being sent. Static files stream directly from disk. Each request still gets its own script variables, request and response objects, and database handles.

These limits can be changed with JVM options: `-Dpun.cache.maxEntries=128`, `-Dpun.cache.maxWeightBytes=16777216`, `-Dpun.cache.maxFileBytes=131072`, and `-Dpun.response.memoryBytes=65536`. Set a cache limit to `0` to disable parsed-template caching.

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

The collection/request examples are in `examples/collections-demo`:

```bash
java -jar target/pun-server.jar serve ./examples/collections-demo
```

Then visit:

```text
http://localhost:8080/
http://localhost:8080/get.pun?naam=Suneet&naam=Mona&city=New+Delhi
http://localhost:8080/post.pun
```

The database example is in `examples/database`. It expects a local MySQL
database named `pun_test` and a `users` table.

## Future Roadmap

Planned but not fully implemented in this MVP:

- cookies and sessions
- JSON request-body parsing
- JDBC database drivers beyond MySQL
- connection pooling and transactions
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

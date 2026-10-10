# Pun Server Management

This document covers how to start and manage the Pun web server from the command line and from the desktop GUI.

## Prerequisites

- Java 21 or newer installed
- A built Pun Server JAR, usually:

```text
target/pun-server.jar
```

If the JAR is copied somewhere else, replace `target/pun-server.jar` in the examples with that path.

## Linux CLI

Start the server for the default `chowk` folder on the default port `8080`:

```bash
java -jar target/pun-server.jar serve
```

If `chowk` is missing, Pun Server creates it beside the folder that contains `target`. Pass a folder path to override this default.

Start the server for a specific Pun website folder:

```bash
java -jar target/pun-server.jar serve ./examples/hello-pun
```

Start on a custom port:

```bash
java -jar target/pun-server.jar serve ./examples/hello-pun --port 9000
```

The short port option is also supported:

```bash
java -jar target/pun-server.jar serve . -p 9000
```

Test the server from the same Linux machine:

```bash
curl http://localhost:8080/
```

If connecting from another machine, use the server IP address and make sure the firewall allows the port:

```text
http://SERVER_IP:8080/
```

Stop the CLI server with `Ctrl+C`.

## Windows CLI

Start the server for the default `chowk` folder on the default port `8080`:

```powershell
java -jar target\pun-server.jar serve
```

If `chowk` is missing, Pun Server creates it beside the folder that contains `target`. Pass a folder path to override this default.

Start the server for a specific Pun website folder:

```powershell
java -jar target\pun-server.jar serve .\examples\hello-pun
```

Start on a custom port:

```powershell
java -jar target\pun-server.jar serve .\examples\hello-pun --port 9000
```

The short port option is also supported:

```powershell
java -jar target\pun-server.jar serve . -p 9000
```

Test the server from the same Windows machine:

```powershell
curl http://localhost:8080/
```

Stop the CLI server with `Ctrl+C`.

## Pun Server Manager GUI

Start the desktop GUI:

```bash
java -jar target/pun-server.jar
```

On Windows PowerShell:

```powershell
java -jar target\pun-server.jar
```

In the Pun Server Manager GUI:

1. Use the default `chowk` folder or choose another Pun website folder to serve.
2. Choose the port.
3. Start the server.
4. Open the shown local URL in a browser, usually `http://localhost:8080/`.
5. Stop the server from the GUI when finished.

Use the GUI when working on a desktop machine. Use CLI mode for Linux servers, SSH sessions, headless machines, Docker, or system service setup.

## Help And Version

Show built-in help:

```bash
java -jar target/pun-server.jar help
```

Show the version:

```bash
java -jar target/pun-server.jar version
```

## REPL

Start an interactive Pun prompt:

```bash
java -jar target/pun-server.jar repl
```

On Windows PowerShell:

```powershell
java -jar target\pun-server.jar repl
```

Use Pun syntax directly. Output is produced with `dasso`, and variables/functions remain available until the REPL exits. Use `:help` for REPL commands and `:quit` or `:exit` to leave.

## Request Testing

GET example:

```bash
curl "http://localhost:8080/get.pun?naam=Suneet&naam=Mona"
```

URL-encoded POST example:

```bash
curl --location "http://localhost:8080/post.pun?naam=query-name" \
  --header "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "naam=form-name"
```

`multipart/form-data` and JSON request bodies are not parsed into `mang.POST`.
Non-empty unsupported POST content types return `415`.

## Database Example

Pun database access is MySQL-first and uses JDBC prepared statements. Serve the
database example with:

```bash
java -jar target/pun-server.jar serve ./examples/database
```

On Windows PowerShell:

```powershell
java -jar target\pun-server.jar serve .\examples\database
```

The example expects a local MySQL database named `pun_test` and a `users` table.
The Pun scripting API is:

```pun
db = bhandar("mysql", "localhost", 3306, "pun_test", "root", "password")
db.jodo()
stmt = db.taiyar("SELECT id, naam FROM users WHERE active = ?")
stmt.mull(1, sach)
users = stmt.saare()
db.band()
```

Only prepared statements are exposed to Pun scripts. Raw JDBC objects, Java
reflection, JVM classes, environment variables, filesystem access, and process
execution are not exposed through the database API.

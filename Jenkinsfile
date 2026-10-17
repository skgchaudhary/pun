// CI/CD for PUN Server (PUNjabi Server-side Scripting).
//
// This repo does not contain the engine's Java source. It ships a prebuilt,
// self-contained JAR (target/pun-server.jar: Java 21, MySQL driver bundled)
// and the website it serves (chowk/). The engine itself is built with
// `mvn clean package` in a separate project, so here "Build" checks the
// committed JAR instead of compiling it.
//
// Runtime layout on this machine, outside the Jenkins workspace:
//   /opt/pun/releases/<build>-<commit>/  one folder per deployed build
//   /opt/pun/current -> releases/...      the release that is running
//   /opt/pun/shared/chowk/                optional server-only site files (e.g. members.pun)
//   /opt/pun/run/pun-server.pid           PID of the running server
//   /opt/pun/logs/pun-server.log          server output, appended across restarts
//
// One-time setup (as a sudo user):
//   sudo mkdir -p /opt/pun && sudo chown jenkins:jenkins /opt/pun

pipeline {
    // The deploy stages act on this machine, so run on the controller itself.
    agent { label 'built-in' }

    options {
        skipDefaultCheckout(true)   // the Checkout stage does it explicitly
        disableConcurrentBuilds()   // two deploys at once would fight over the PID file and port
        timeout(time: 15, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
    }

    triggers {
        // Check GitHub for new commits every ~5 minutes. Takes effect after the first run.
        pollSCM('H/5 * * * *')
    }

    environment {
        PUN_HOME      = '/opt/pun'
        PUN_PORT      = '9000'   // PUN defaults to 8080, which Jenkins already uses
        SMOKE_PORT    = '19000'  // throwaway port for the pre-deploy smoke test
        JAVA_OPTS     = '-Xmx256m -Djava.awt.headless=true'
        KEEP_RELEASES = '5'
        PUN_PID_FILE  = "${PUN_HOME}/run/pun-server.pid"
        PUN_LOG_FILE  = "${PUN_HOME}/logs/pun-server.log"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                // Build exactly what is committed: remove anything a previous build left behind.
                sh 'git clean -ffdx'
                script {
                    env.GIT_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.GIT_SHORT  = sh(script: 'git rev-parse --short=8 HEAD', returnStdout: true).trim()
                    env.RELEASE_ID = "${env.BUILD_NUMBER}-${env.GIT_SHORT}"
                }
            }
        }

        stage('Show build environment') {
            steps {
                sh '''
                    for tool in java git curl ss setsid tar sha256sum; do
                        command -v "$tool" > /dev/null || { echo "Missing required command: $tool"; exit 1; }
                    done

                    echo "User      : $(id)"
                    echo "Host      : $(hostname)"
                    echo "Workspace : $WORKSPACE"
                    echo "Release   : $RELEASE_ID"
                    uname -a
                    java -version
                    git --version

                    # target/pun-server.jar is Java 21 bytecode (class file version 65).
                    JAVA_SPEC=$(java -XshowSettings:properties -version 2>&1 | awk -F' = ' '/java.specification.version/ {print $2}')
                    if [ "${JAVA_SPEC%%.*}" -lt 21 ]; then
                        echo "PUN Server needs Java 21 or newer; java on PATH is $JAVA_SPEC"
                        exit 1
                    fi

                    if [ ! -w "$PUN_HOME" ]; then
                        echo "$PUN_HOME is missing or not writable by $(id -un). Run once:"
                        echo "  sudo mkdir -p $PUN_HOME && sudo chown $(id -un):$(id -gn) $PUN_HOME"
                        exit 1
                    fi
                '''
            }
        }

        stage('Build') {
            // Nothing to compile: check that the committed JAR and site are present and that
            // the JAR runs on this JVM.
            steps {
                sh '''
                    test -f target/pun-server.jar || { echo "target/pun-server.jar is missing"; exit 1; }
                    test -f chowk/index.pun || { echo "chowk/index.pun is missing"; exit 1; }
                    sha256sum target/pun-server.jar
                '''
                script {
                    env.PUN_VERSION = sh(script: 'java -jar target/pun-server.jar version', returnStdout: true).trim()
                    currentBuild.description = "${env.PUN_VERSION} @ ${env.GIT_SHORT}"
                }
                echo "Committed JAR reports: ${env.PUN_VERSION}"
            }
        }

        stage('Test') {
            // The repo has no unit tests (they live with the engine source). Instead, start the
            // committed JAR on a spare port against the committed site and check that the entry
            // pages render. A broken JAR or page fails here, before the live server is touched.
            steps {
                sh '''
                    if ss -ltnH "sport = :$SMOKE_PORT" | grep -q .; then
                        echo "Smoke-test port $SMOKE_PORT is already in use"
                        exit 1
                    fi

                    mkdir -p dist
                    java $JAVA_OPTS -jar target/pun-server.jar serve chowk --port "$SMOKE_PORT" < /dev/null > dist/smoke-test.log 2>&1 &
                    SMOKE_PID=$!
                    # Always stop the smoke-test server and show its log, pass or fail. "|| true" because
                    # Jenkins runs sh with -e, and wait returns 143 for a process ended by SIGTERM.
                    trap 'kill "$SMOKE_PID" 2> /dev/null || true; wait "$SMOKE_PID" 2> /dev/null || true; echo "--- smoke-test server log:"; cat dist/smoke-test.log' EXIT

                    i=0
                    until curl -s -o /dev/null "http://127.0.0.1:$SMOKE_PORT/"; do
                        kill -0 "$SMOKE_PID" 2> /dev/null || { echo "Smoke-test server exited during startup"; exit 1; }
                        i=$((i + 1))
                        [ "$i" -lt 30 ] || { echo "Smoke-test server did not answer within 30s"; exit 1; }
                        sleep 1
                    done

                    for path in / /sample_site/; do
                        code=$(curl -s -o dist/smoke-page.html -w '%{http_code}' "http://127.0.0.1:$SMOKE_PORT$path")
                        echo "GET $path -> HTTP $code"
                        [ "$code" = 200 ] || exit 1
                        # Raw "<?pun" in the response would mean the page skipped the template engine.
                        if grep -q '<?pun' dist/smoke-page.html; then
                            echo "Unrendered Pun code in the response for $path"
                            exit 1
                        fi
                    done
                '''
            }
        }

        stage('Package') {
            steps {
                sh '''
                    rm -rf dist/release
                    mkdir -p dist/release
                    cp target/pun-server.jar dist/release/
                    cp -R chowk dist/release/chowk
                    {
                        echo "release=$RELEASE_ID"
                        echo "version=$PUN_VERSION"
                        echo "commit=$GIT_COMMIT"
                        echo "build_url=$BUILD_URL"
                        echo "built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
                        echo "jar_sha256=$(sha256sum target/pun-server.jar | cut -d ' ' -f 1)"
                    } > dist/release/BUILD_INFO
                    tar -czf "dist/pun-release-$RELEASE_ID.tar.gz" -C dist/release .
                    ls -l dist/*.tar.gz
                '''
                archiveArtifacts artifacts: 'dist/pun-release-*.tar.gz', fingerprint: true
            }
        }

        stage('Stop previous PUN server') {
            steps {
                sh '''
                    if [ ! -f "$PUN_PID_FILE" ]; then
                        echo "No PID file at $PUN_PID_FILE: nothing to stop."
                        exit 0
                    fi
                    PID=$(cat "$PUN_PID_FILE")

                    # Only signal the PID if it is alive AND is the PUN server this pipeline started.
                    # After a reboot the OS may have reused that PID for an unrelated process.
                    if [ -n "$PID" ] && kill -0 "$PID" 2> /dev/null && grep -qaF -- "$PUN_HOME/current/pun-server.jar" "/proc/$PID/cmdline"; then
                        echo "Stopping PUN server (PID $PID)"
                        kill -TERM "$PID"   # PUN's shutdown hook closes the HTTP listener cleanly
                        i=0
                        while kill -0 "$PID" 2> /dev/null; do
                            i=$((i + 1))
                            if [ "$i" -ge 30 ]; then
                                echo "PID $PID still running 30s after SIGTERM; sending SIGKILL"
                                kill -KILL "$PID"
                                break
                            fi
                            sleep 1
                        done
                        echo "Stopped."
                    else
                        echo "Stale PID file: PID '$PID' is not a running PUN server. Not killing anything."
                    fi
                    rm -f "$PUN_PID_FILE"
                '''
            }
        }

        stage('Deploy') {
            steps {
                sh '''
                    RELEASE_DIR="$PUN_HOME/releases/$RELEASE_ID"
                    mkdir -p "$PUN_HOME/releases" "$PUN_HOME/run" "$PUN_HOME/logs"
                    rm -rf "$RELEASE_DIR"
                    mkdir -p "$RELEASE_DIR"
                    tar -xzf "dist/pun-release-$RELEASE_ID.tar.gz" -C "$RELEASE_DIR"

                    # Site files that must never be in git (members.pun holds DB credentials)
                    # are kept on the server in shared/chowk and copied into every release.
                    if [ -d "$PUN_HOME/shared/chowk" ]; then
                        echo "Adding server-only files from $PUN_HOME/shared/chowk"
                        cp -R "$PUN_HOME/shared/chowk/." "$RELEASE_DIR/chowk/"
                    fi

                    # Repoint "current" in one atomic rename.
                    ln -sfn "$RELEASE_DIR" "$PUN_HOME/current.new"
                    mv -Tf "$PUN_HOME/current.new" "$PUN_HOME/current"
                    echo "current -> $(readlink "$PUN_HOME/current")"

                    # Keep the newest releases for rollback; never delete the current one.
                    CURRENT=$(readlink -f "$PUN_HOME/current")
                    ls -1dt "$PUN_HOME"/releases/*/ | tail -n +$((KEEP_RELEASES + 1)) | while read -r old; do
                        old=${old%/}
                        if [ "$old" != "$CURRENT" ]; then
                            echo "Removing old release $old"
                            rm -rf "$old"
                        fi
                    done
                '''
            }
        }

        stage('Start PUN server') {
            steps {
                sh '''
                    # Never start on top of another process: if the port is taken, report it and stop.
                    if ss -ltnH "sport = :$PUN_PORT" | grep -q .; then
                        echo "Port $PUN_PORT is already in use:"
                        ss -ltnp "sport = :$PUN_PORT" || true
                        exit 1
                    fi

                    echo "===== $(date -u +%Y-%m-%dT%H:%M:%SZ) starting release $RELEASE_ID on port $PUN_PORT =====" >> "$PUN_LOG_FILE"
                    rm -f "$PUN_PID_FILE"

                    # Jenkins kills processes left behind by a build unless they carry this marker.
                    export JENKINS_NODE_COOKIE=dontKillMe BUILD_ID=dontKillMe

                    # setsid + nohup detach the server from this build's shell. The small sh wrapper
                    # writes its own PID and then exec's java, so the PID file holds the java process.
                    setsid nohup sh -c 'echo $$ > "$PUN_PID_FILE"; exec "$@"' pun-server \
                        java $JAVA_OPTS -jar "$PUN_HOME/current/pun-server.jar" \
                        serve "$PUN_HOME/current/chowk" --port "$PUN_PORT" \
                        < /dev/null >> "$PUN_LOG_FILE" 2>&1 &

                    i=0
                    until [ -s "$PUN_PID_FILE" ]; do
                        i=$((i + 1))
                        [ "$i" -lt 10 ] || { echo "PUN server did not write $PUN_PID_FILE"; exit 1; }
                        sleep 1
                    done
                    echo "Started PUN server, PID $(cat "$PUN_PID_FILE"), log $PUN_LOG_FILE"
                '''
            }
        }

        stage('Verify') {
            steps {
                sh '''
                    PID=$(cat "$PUN_PID_FILE")
                    URL="http://127.0.0.1:$PUN_PORT/"

                    i=0
                    code=000
                    while [ "$code" != 200 ]; do
                        if ! kill -0 "$PID" 2> /dev/null; then
                            echo "PUN server (PID $PID) exited during startup. Last log lines:"
                            tail -n 40 "$PUN_LOG_FILE"
                            exit 1
                        fi
                        i=$((i + 1))
                        if [ "$i" -gt 30 ]; then
                            echo "No HTTP 200 from $URL within 30s (last status $code). Last log lines:"
                            tail -n 40 "$PUN_LOG_FILE"
                            exit 1
                        fi
                        sleep 1
                        code=$(curl -s -o dist/verify.html -w '%{http_code}' --max-time 5 "$URL" || true)
                    done

                    # Make sure the answer came from the process we started, not something else on the port.
                    if ! ss -ltnpH "sport = :$PUN_PORT" | grep -q "pid=$PID,"; then
                        echo "Port $PUN_PORT is not held by PID $PID:"
                        ss -ltnp "sport = :$PUN_PORT" || true
                        exit 1
                    fi
                    if grep -q '<?pun' dist/verify.html; then
                        echo "Unrendered Pun code in the response for /"
                        exit 1
                    fi

                    echo "PUN server is up: PID $PID, release $RELEASE_ID, port $PUN_PORT"
                    tail -n 12 "$PUN_LOG_FILE"
                '''
            }
        }
    }

    post {
        success {
            echo "Deployed ${env.PUN_VERSION} (release ${env.RELEASE_ID}) on port ${env.PUN_PORT}"
        }
    }
}

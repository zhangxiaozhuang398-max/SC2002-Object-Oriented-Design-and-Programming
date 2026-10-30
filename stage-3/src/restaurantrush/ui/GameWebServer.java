package restaurantrush.ui;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.awt.Desktop;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Boundary object: a tiny local web server that exposes the existing game to a
 * browser. It adds no rules; {@code GET /api/state} renders the current state as
 * JSON and {@code /api/action} forwards one decision to {@link GameSession}.
 *
 * <p>All three stages can be played from the same page. Each stage folder has its
 * own {@code GameSession}, compiled into that folder's {@code build/web}; the server
 * loads every compiled stage through {@link StageSession}, keeps one game per stage,
 * and routes each request by its {@code stage} parameter (Stage 3 by default).
 * {@code GET /api/stages} lists what is available.</p>
 *
 * <p>The JDK ships the HTTP server ({@code jdk.httpserver}), so this boundary
 * keeps the project's promise of zero external dependencies and works offline:
 * everything is served from {@code 127.0.0.1} and the static files under
 * {@code web/}.</p>
 *
 * <p>Run from the {@code stage-3} folder, or simply use {@code web.ps1} /
 * {@code web.bat}:</p>
 * <pre>java -cp build/web restaurantrush.ui.GameWebServer [--preview]</pre>
 */
public final class GameWebServer {

    private static final int FIRST_PORT = 8765;
    private static final int PORT_ATTEMPTS = 20;

    private static final int DEFAULT_STAGE = 3;

    private final Map<Integer, StageSession> stages;
    private final Path webDir;

    private GameWebServer(Path webDir, Map<Integer, StageSession> stages) {
        this.webDir = webDir;
        this.stages = stages;
    }

    /**
     * Loads every stage that has been compiled. The server runs from the
     * {@code stage-3} folder, so Stage 3 is {@code build/web} and the others are
     * the sibling folders' {@code build/web}.
     */
    private static Map<Integer, StageSession> loadStages() throws IOException {
        Map<Integer, StageSession> loaded = new TreeMap<>();
        for (int number = 1; number <= 3; number++) {
            Path classes = number == DEFAULT_STAGE
                    ? Path.of("build", "web")
                    : Path.of("..", "stage-" + number, "build", "web");
            StageSession stage = StageSession.load(number, classes);
            if (stage != null) {
                loaded.put(number, stage);
            } else {
                System.out.println("Stage " + number + " is not compiled (" + classes
                        + "); it will be unavailable. web.ps1 / web.sh compile all three.");
            }
        }
        if (!loaded.containsKey(DEFAULT_STAGE)) {
            throw new IOException("Stage 3 classes not found in build/web. Start the server with web.ps1 / web.sh.");
        }
        return loaded;
    }

    public static void main(String[] args) throws IOException {
        Path webDir = Path.of("web");
        if (!Files.isDirectory(webDir)) {
            System.err.println("Cannot find the 'web' folder here: " + webDir.toAbsolutePath());
            System.err.println("Start the server from the stage-3 folder, or use web.ps1 / web.bat,"
                    + " which change into it for you.");
            return;
        }
        GameWebServer app = new GameWebServer(webDir, loadStages());
        if (contains(args, "--preview")) {
            for (StageSession stage : app.stages.values()) {
                stage.seedPreview();
            }
            System.out.println("Preview mode: a scripted mid-game state is shown instead of a fresh game.");
        }
        System.out.println("Stages available: " + app.stages.keySet());
        HttpServer server = app.start();
        String url = "http://127.0.0.1:" + server.getAddress().getPort() + "/";
        System.out.println("Restaurant Rush web UI: " + url);
        System.out.println("Stop the server with Ctrl+C.");
        if (!contains(args, "--no-browser")) {
            openBrowser(url);
        }
    }

    private static boolean contains(String[] args, String flag) {
        for (String arg : args) {
            if (flag.equals(arg)) {
                return true;
            }
        }
        return false;
    }

    private HttpServer start() throws IOException {
        HttpServer server = null;
        for (int port = FIRST_PORT; port < FIRST_PORT + PORT_ATTEMPTS && server == null; port++) {
            try {
                server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
            } catch (IOException busy) {
                // Port in use; try the next one.
            }
        }
        if (server == null) {
            throw new IOException("No free port between " + FIRST_PORT
                    + " and " + (FIRST_PORT + PORT_ATTEMPTS - 1));
        }
        server.createContext("/api/stages", this::handleStages);
        server.createContext("/api/state", this::handleState);
        server.createContext("/api/action", this::handleAction);
        server.createContext("/", this::handleStatic);
        server.setExecutor(null);
        server.start();
        return server;
    }

    // ------------------------------------------------------------------
    // Handlers
    // ------------------------------------------------------------------

    private void handleStages(HttpExchange exchange) throws IOException {
        List<String> items = new ArrayList<>();
        for (int number = 1; number <= 3; number++) {
            StageSession stage = stages.get(number);
            items.add(new Json.Obj()
                    .num("id", number)
                    .str("name", stage == null ? null : stage.name())
                    .bool("available", stage != null)
                    .toString());
        }
        respondJson(exchange, 200, new Json.Obj()
                .num("default", DEFAULT_STAGE)
                .value("stages", Json.array(items))
                .toString());
    }

    private void handleState(HttpExchange exchange) throws IOException {
        Map<String, String> params = parseQuery(exchange.getRequestURI().getRawQuery());
        StageSession stage = stage(params);
        if (stage == null) {
            respondUnknownStage(exchange, params);
            return;
        }
        respondJson(exchange, 200, stage.stateJson(params.get("lang")));
    }

    private void handleAction(HttpExchange exchange) throws IOException {
        Map<String, String> params = parseQuery(exchange.getRequestURI().getRawQuery());
        StageSession stage = stage(params);
        if (stage == null) {
            respondUnknownStage(exchange, params);
            return;
        }
        int id = parseInt(params.get("id"), 0);
        boolean on = "true".equalsIgnoreCase(params.get("on")) || "1".equals(params.get("on"));
        respondJson(exchange, 200,
                stage.actionResponse(params.get("type"), params.get("task"), id, on, params.get("lang")));
    }

    /** The stage a request names, Stage 3 when it names none, or null when it is not available. */
    private StageSession stage(Map<String, String> params) {
        return stages.get(parseInt(params.get("stage"), DEFAULT_STAGE));
    }

    private static void respondUnknownStage(HttpExchange exchange, Map<String, String> params) throws IOException {
        String message = Messages.localise("Unknown stage: " + params.get("stage"), params.get("lang"));
        respondJson(exchange, 404, new Json.Obj().bool("ok", false).str("message", message).toString());
    }

    private void handleStatic(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        if ("/".equals(path)) {
            path = "/index.html";
        }
        if (path.contains("..")) {
            respondText(exchange, 403, "Forbidden");
            return;
        }
        Path file = webDir.resolve(path.substring(1)).normalize();
        if (!file.startsWith(webDir) || !Files.isRegularFile(file)) {
            respondText(exchange, 404, "Not found: " + path);
            return;
        }
        byte[] body = Files.readAllBytes(file);
        exchange.getResponseHeaders().set("Content-Type", contentType(file.getFileName().toString()));
        exchange.sendResponseHeaders(200, body.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(body);
        }
    }

    // ------------------------------------------------------------------
    // Plumbing
    // ------------------------------------------------------------------

    private static void respondJson(HttpExchange exchange, int status, String json) throws IOException {
        byte[] body = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(status, body.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(body);
        }
    }

    private static void respondText(HttpExchange exchange, int status, String text) throws IOException {
        byte[] body = text.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        exchange.sendResponseHeaders(status, body.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(body);
        }
    }

    private static Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> params = new HashMap<>();
        if (rawQuery == null || rawQuery.isEmpty()) {
            return params;
        }
        for (String pair : rawQuery.split("&")) {
            int eq = pair.indexOf('=');
            if (eq < 0) {
                continue;
            }
            String key = URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8);
            String value = URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
            params.put(key, value);
        }
        return params;
    }

    private static int parseInt(String text, int fallback) {
        if (text == null) {
            return fallback;
        }
        try {
            return Integer.parseInt(text.trim());
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private static String contentType(String name) {
        if (name.endsWith(".html")) {
            return "text/html; charset=utf-8";
        }
        if (name.endsWith(".css")) {
            return "text/css; charset=utf-8";
        }
        if (name.endsWith(".js")) {
            return "application/javascript; charset=utf-8";
        }
        if (name.endsWith(".svg")) {
            return "image/svg+xml";
        }
        return "application/octet-stream";
    }

    private static void openBrowser(String url) {
        try {
            if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
                Desktop.getDesktop().browse(URI.create(url));
                return;
            }
        } catch (Exception ignored) {
            // The URL was already printed; nothing else to do.
        }
        System.out.println("If no browser opened, visit: " + url);
    }
}

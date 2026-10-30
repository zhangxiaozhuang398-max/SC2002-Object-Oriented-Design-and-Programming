package restaurantrush.ui;

import java.io.IOException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * One stage's game, as seen by the web server.
 *
 * <p>Every stage folder is a self-contained snapshot, so all three declare the same
 * class names ({@code restaurantrush.GameEngine}, ...). To host them side by side,
 * each stage's compiled classes are loaded by their own class loader whose parent is
 * the platform loader, so a stage never sees another stage's classes - not even
 * Stage 3's, which share this server's class path.</p>
 *
 * <p>Each stage ships its own {@code restaurantrush.ui.GameSession}. They all expose
 * the same JSON-in-strings surface, so this wrapper needs only a handful of
 * reflective calls and never touches a game class itself.</p>
 */
final class StageSession {

    private final int number;
    private final String name;
    private final Object session;
    private final Method stateJson;
    private final Method actionResponse;
    private final Method seedPreview;

    private StageSession(int number, Object session) throws ReflectiveOperationException {
        Class<?> type = session.getClass();
        this.number = number;
        this.session = session;
        this.stateJson = type.getMethod("stateJson", String.class);
        this.actionResponse = type.getMethod("actionResponse",
                String.class, String.class, int.class, boolean.class, String.class);
        this.seedPreview = type.getMethod("seedPreview");
        this.name = (String) type.getMethod("stageName").invoke(session);
    }

    /**
     * Loads one stage from its compiled classes.
     *
     * @return the stage, or {@code null} when that folder has not been compiled
     */
    @SuppressWarnings("resource") // The loader lives as long as the server.
    static StageSession load(int number, Path classes) throws IOException {
        if (!Files.isRegularFile(classes.resolve("restaurantrush/ui/GameSession.class"))) {
            return null;
        }
        URLClassLoader loader = new URLClassLoader("stage-" + number,
                new URL[] { classes.toUri().toURL() }, ClassLoader.getPlatformClassLoader());
        try {
            Object session = loader.loadClass("restaurantrush.ui.GameSession")
                    .getConstructor().newInstance();
            return new StageSession(number, session);
        } catch (ReflectiveOperationException broken) {
            throw new IOException("Cannot load stage " + number + " from " + classes, broken);
        }
    }

    int number() {
        return number;
    }

    String name() {
        return name;
    }

    String stateJson(String lang) {
        return (String) call(stateJson, lang);
    }

    String actionResponse(String type, String task, int id, boolean on, String lang) {
        return (String) call(actionResponse, type, task, id, on, lang);
    }

    void seedPreview() {
        call(seedPreview);
    }

    private Object call(Method method, Object... args) {
        try {
            return method.invoke(session, args);
        } catch (InvocationTargetException failed) {
            Throwable cause = failed.getCause();
            if (cause instanceof RuntimeException runtime) {
                throw runtime;
            }
            throw new IllegalStateException(cause);
        } catch (IllegalAccessException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}

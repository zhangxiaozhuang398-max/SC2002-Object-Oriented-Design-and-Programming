package restaurantrush.ui;

import java.util.List;

/**
 * Minimal JSON writer, so this boundary needs no external library.
 *
 * <p>There is deliberately no parser. The browser sends its decisions as query
 * parameters, which {@code URLDecoder} turns into strings without any JSON
 * handling, so the whole dependency-free promise stays intact.</p>
 */
public final class Json {

    private Json() {
    }

    /** Escapes text for use inside a JSON string literal. */
    public static String escape(String text) {
        StringBuilder out = new StringBuilder(text.length() + 8);
        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            switch (c) {
                case '"' -> out.append("\\\"");
                case '\\' -> out.append("\\\\");
                case '\n' -> out.append("\\n");
                case '\r' -> out.append("\\r");
                case '\t' -> out.append("\\t");
                default -> {
                    if (c < 0x20) {
                        out.append(String.format("\\u%04x", (int) c));
                    } else {
                        out.append(c);
                    }
                }
            }
        }
        return out.toString();
    }

    /** Renders a JSON string literal, or the literal {@code null}. */
    public static String string(String text) {
        return text == null ? "null" : "\"" + escape(text) + "\"";
    }

    /** Renders a JSON array from items that are already valid JSON. */
    public static String array(List<String> items) {
        return "[" + String.join(",", items) + "]";
    }

    /** Builds one JSON object literal. */
    public static final class Obj {

        private final StringBuilder body = new StringBuilder();

        public Obj value(String key, String jsonLiteral) {
            if (body.length() > 0) {
                body.append(',');
            }
            body.append(string(key)).append(':').append(jsonLiteral);
            return this;
        }

        public Obj str(String key, String value) {
            return value(key, string(value));
        }

        public Obj num(String key, long value) {
            return value(key, Long.toString(value));
        }

        public Obj bool(String key, boolean value) {
            return value(key, Boolean.toString(value));
        }

        public Obj nul(String key) {
            return value(key, "null");
        }

        @Override
        public String toString() {
            return "{" + body + "}";
        }
    }
}

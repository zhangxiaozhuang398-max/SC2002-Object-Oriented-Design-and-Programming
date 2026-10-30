package restaurantrush;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.io.Reader;
import java.util.Locale;

/** Parses manager decisions; ConsoleView renders them and domain objects enforce rules. */
public final class ConsoleUI {
    private final BufferedReader input;
    private final ConsoleView view;
    private final boolean echo;

    public ConsoleUI(Reader input, PrintWriter output, boolean echo) {
        this.input = new BufferedReader(input);
        this.view = new ConsoleView(output);
        this.echo = echo;
    }

    public void play(GameEngine game) throws IOException {
        view.showWelcome(game);
        while (!game.isFinished()) {
            view.showTurnStart(game.getTurn() + 1);
            readTurnStart(game);
            view.showState(game);
            readHost(game);
            readWaiter(game);
            readChef(game);
            view.showTurnEnd(game, game.finishTurn());
        }
        view.showGoodbye(game);
    }

    private void readTurnStart(GameEngine game) throws IOException {
        view.showHappyHourChoice(game);
        while (true) {
            String[] parts = readCommand("Manager");
            try {
                if (parts.length != 1 || (!parts[0].equalsIgnoreCase("activate")
                        && !parts[0].equalsIgnoreCase("continue")))
                    throw new IllegalArgumentException("Use activate once per game, or continue.");
                game.startTurn(parts[0].equalsIgnoreCase("activate"));
                return;
            } catch (IllegalArgumentException ex) {
                view.error(ex.getMessage(), true);
            }
        }
    }

    private void readHost(GameEngine game) throws IOException {
        view.showHost(game.getState());
        while (true) {
            String[] parts = readCommand("Host");
            try {
                if (!parts[0].equalsIgnoreCase("seat") && !parts[0].equalsIgnoreCase("wait"))
                    throw new IllegalArgumentException("Use seat ID or wait.");
                int id = parseTarget(parts, parts[0].equalsIgnoreCase("wait"));
                view.feedback(game.assignHost(id));
                return;
            } catch (IllegalArgumentException ex) {
                view.error(ex.getMessage(), false);
            }
        }
    }

    private void readWaiter(GameEngine game) throws IOException {
        view.showWaiter(game.getState());
        while (true) {
            String[] parts = readCommand("Waiter");
            try {
                WaiterTask task;
                try {
                    task = WaiterTask.valueOf(parts[0].toUpperCase(Locale.ROOT));
                } catch (IllegalArgumentException ex) {
                    throw new IllegalArgumentException("Use seat ID, order ID, serve ID or wait.");
                }
                int id = parseTarget(parts, task == WaiterTask.WAIT);
                view.feedback(game.assignWaiter(task, id));
                return;
            } catch (IllegalArgumentException ex) {
                view.error(ex.getMessage(), false);
            }
        }
    }

    private void readChef(GameEngine game) throws IOException {
        view.showChef(game.getState());
        while (true) {
            String[] parts = readCommand("Chef");
            try {
                if (!parts[0].equalsIgnoreCase("cook") && !parts[0].equalsIgnoreCase("wait"))
                    throw new IllegalArgumentException("Use cook ID or wait.");
                int id = parseTarget(parts, parts[0].equalsIgnoreCase("wait"));
                view.feedback(game.assignChef(id));
                return;
            } catch (IllegalArgumentException ex) {
                view.error(ex.getMessage(), false);
            }
        }
    }

    private int parseTarget(String[] parts, boolean wait) {
        if (parts.length != (wait ? 1 : 2))
            throw new IllegalArgumentException(wait ? "Wait takes no ID." : "This command needs exactly one ID.");
        if (wait) return 0;
        try {
            int id = Integer.parseInt(parts[1]);
            if (id <= 0) throw new NumberFormatException();
            return id;
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("The ID must be a positive integer.");
        }
    }

    private String[] readCommand(String role) throws IOException {
        view.prompt(role);
        while (true) {
            String line = input.readLine();
            if (line == null) throw new IOException("Input ended before turn 18. No final result was recorded.");
            line = line.trim();
            if (line.startsWith("#")) continue;
            if (echo) view.echo(line);
            if (line.isEmpty()) return new String[] { "" };
            return line.split("\\s+");
        }
    }
}

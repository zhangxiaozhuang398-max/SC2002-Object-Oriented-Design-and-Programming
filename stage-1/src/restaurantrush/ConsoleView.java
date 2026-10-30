package restaurantrush;

import java.io.PrintWriter;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/** Text presentation only: reads state without advancing the game or enforcing rules. */
public final class ConsoleView {
    private static final int WIDTH = 72;
    private final PrintWriter output;

    public ConsoleView(PrintWriter output) {
        this.output = output;
    }

    public void showWelcome(GameEngine game) {
        page("WELCOME TO RESTAURANT RUSH");
        output.println();
        art("R E S T A U R A N T");
        art(" ____  _   _ ____  _   _",
            "|  _ \\| | | / ___|| | | |",
            "| |_) | | | \\___ \\| |_| |",
            "|  _ <| |_| |___) |  _  |",
            "|_| \\_\\\\___/|____/|_| |_|");
        output.println();
        art(game.getStageName());
        section("YOUR SHIFT");
        line("You are the restaurant manager. Seat guests, take orders,");
        line("prepare meals and serve them before your customers lose patience.");
        line("18 turns | 2 tables | Arrivals on turns 1, 4, 7, 10, 13 and 16");
        line("Win by turn 18: at least 4 paid guests, $45.00 revenue,");
        line("and 60 average satisfaction among guests who have paid.");
        section("MENU");
        row("%-30s %10s %14s", "Meal", "Base price", "Prep units");
        for (MenuItem item : game.getState().getMenu().getItems())
            row("%-30s %10s %14d", item.getName(),
                Money.format(item.getPriceCents()), item.getPreparationUnits());
        section("HOW TO PLAY");
        line("Each turn: Waiter -> Chef -> automatic Cashier.");
        line("Each staff member gets one task; the Chef adds one prep unit.");
        line("Type the command shown at each prompt, e.g. seat 1 or wait.");
        line("Use customer IDs for the Waiter and order IDs for the Chef.");
        line("Customers choose their meals. A bill is locked when ordered.");
        line("A meal cooked this turn can be served from the next turn.");
        line("After serving: one full turn to eat, then payment next turn.");
        line("Invalid commands can be retried without spending a task.");
        output.println();
        art("THE RESTAURANT IS OPEN. LET'S BEGIN!");
    }

    public void showTurnStart(int turn) {
        page(String.format(Locale.ROOT, "TURN %02d / %02d", turn, GameSetup.MAX_TURNS));
    }

    public void showState(GameEngine game) {
        GameState state = game.getState();
        section("RESTAURANT STATUS");
        showScore(state, game.getTurn() - 1);
        section("WAITING QUEUE");
        if (state.getWaiting().isEmpty()) {
            line("No guests waiting.");
        } else {
            row("%-8s %-12s %12s", "Guest", "Type", "Satisfaction");
            for (Customer customer : state.getWaiting())
                row("%-8s %-12s %12d", "#" + customer.getId(),
                    customer.getType(), customer.getSatisfaction());
        }
        section("TABLES");
        row("%-8s %-16s %-20s %12s", "Table", "Guest", "Status", "Satisfaction");
        for (Table table : state.getTables()) {
            if (table.isFree()) {
                row("%-8s %-16s %-20s %12s", "#" + table.getId(), "-", "Available", "-");
            } else {
                Customer customer = table.getCustomer();
                row("%-8s %-16s %-20s %12d", "#" + table.getId(),
                    "#" + customer.getId() + " " + customer.getType(),
                    customerStatus(customer), customer.getSatisfaction());
            }
        }
        section("ACTIVE ORDERS");
        List<Order> active = state.getOrders().stream()
            .filter(o -> o.getStatus() != Order.Status.PAID && o.getStatus() != Order.Status.CANCELLED)
            .collect(Collectors.toList());
        if (active.isEmpty()) line("No active orders.");
        for (Order order : active) {
            line("Order #" + order.getId() + " | Guest #" + order.getCustomerId()
                + " | " + order.getItem().getName());
            line("  " + order.getStatus() + " | Prep " + order.getCompletedUnits()
                + "/" + order.getItem().getPreparationUnits()
                + " | Locked bill " + Money.format(order.getBillCents()));
        }
    }

    public void showWaiter(GameState state) {
        section("WAITER | choose ONE task");
        line("seat ID   - seat a waiting guest");
        line("order ID  - take a seated guest's order");
        line("serve ID  - serve a guest whose meal is READY");
        line("wait      - skip this task");
        line("Seat guests: " + seatTargets(state));
        line("Order for: " + customerIds(state.getCustomers().stream()
            .filter(c -> c.getStatus() == Customer.Status.SEATED).collect(Collectors.toList())));
        String ready = state.getOrders().stream().filter(o -> o.getStatus() == Order.Status.READY)
            .map(o -> "#" + o.getCustomerId()).collect(Collectors.joining(", "));
        line("Serve guests: " + (ready.isEmpty() ? "none" : ready));
    }

    public void showChef(GameState state) {
        section("CHEF | choose ONE task");
        line("cook ID   - add one prep unit to an order");
        line("wait      - skip this task");
        List<Order> available = state.getOrders().stream().filter(Order::canPrepare)
            .collect(Collectors.toList());
        if (available.isEmpty()) line("No orders can be cooked. Choose wait.");
        for (Order order : available)
            line("Cook #" + order.getId() + ": " + order.getItem().getName()
                + " (prep " + order.getCompletedUnits() + "/"
                + order.getItem().getPreparationUnits() + ")");
    }

    public void showTurnEnd(GameEngine game, List<String> events) {
        section("END OF TURN " + game.getTurn());
        if (events.isEmpty()) line("No automatic service events this turn.");
        for (String event : events) line("* " + event);
        line("Waiting guests' satisfaction has been updated.");
        output.println();
        showScore(game.getState(), game.getTurn());
    }

    public void showGoodbye(GameEngine game) {
        page("SHIFT COMPLETE | FINAL RESULTS");
        output.println();
        art(game.getResult().isVictory() ? "*** VICTORY ***" : "--- DEFEAT ---");
        output.println();
        line(game.getResult().isVictory()
            ? "All three goals reached. Great work, manager!"
            : "Some goals were missed. Try a different service plan next time.");
        section("FINAL SCORE");
        showScore(game.getState(), game.getTurn());
        section("GUEST SUMMARY");
        row("%-8s %-12s %-20s %12s", "Guest", "Type", "Final status", "Satisfaction");
        for (Customer customer : game.getState().getCustomers())
            row("%-8s %-12s %-20s %12d", "#" + customer.getId(), customer.getType(),
                customerStatus(customer), customer.getSatisfaction());
        line("Only paid guests contribute to revenue and average satisfaction.");
        output.println();
        art(" ____  __   __ _____",
            "| __ ) \\ \\ / /| ____|",
            "|  _ \\  \\ V / |  _|",
            "| |_) |  | |  | |___",
            "|____/   |_|  |_____|");
        output.println();
        art("GOODBYE & THANK YOU FOR PLAYING RESTAURANT RUSH!");
        output.println("=".repeat(WIDTH));
        output.flush();
    }

    public void feedback(String message) {
        output.println();
        line("[OK] " + message);
    }

    public void error(String message, boolean beforeTurn) {
        output.println();
        line("[!] Invalid choice: " + message);
        line(beforeTurn ? "Please choose again; the turn has not started."
            : "Please choose again; no task was spent.");
        output.println();
    }

    public void prompt(String role) {
        output.print("  " + role + " > ");
        output.flush();
    }

    public void echo(String command) {
        output.println(command);
    }

    private void showScore(GameState state, int completedTurns) {
        line("Paid guests: " + state.getPaidCount() + " / 4"
            + "    Revenue: " + Money.format(state.getRevenueCents()) + " / $45.00");
        line("Average paid satisfaction: " + state.averageSatisfactionText() + " / 60");
        line("Served: " + state.getServedCount() + "    Unhappy departures: "
            + state.getUnhappyDepartures() + "    Turns completed: " + completedTurns + "/" + GameSetup.MAX_TURNS);
    }

    private String seatTargets(GameState state) {
        return state.getTables().stream().anyMatch(Table::isFree)
            ? customerIds(state.getWaiting()) : "none (both tables occupied)";
    }

    private String customerIds(List<Customer> customers) {
        return customers.isEmpty() ? "none" : customers.stream()
            .map(c -> "#" + c.getId()).collect(Collectors.joining(", "));
    }

    private String customerStatus(Customer customer) {
        return switch (customer.getStatus()) {
            case WAITING -> "Waiting for table";
            case SEATED -> "Needs order";
            case WAITING_FOR_FOOD -> "Waiting for food";
            case EATING -> "Eating";
            case READY_TO_PAY -> "Ready to pay";
            case PAID -> "Paid";
            case LEFT -> "Left unhappy";
        };
    }

    private void page(String title) {
        output.println();
        output.println("=".repeat(WIDTH));
        art(title);
        output.println("=".repeat(WIDTH));
    }

    private void section(String title) {
        output.println();
        String label = "-- " + title + " ";
        output.println(label + "-".repeat(Math.max(0, WIDTH - label.length())));
    }

    private void art(String... lines) {
        int longest = 0;
        for (String line : lines) longest = Math.max(longest, line.length());
        String padding = " ".repeat(Math.max(0, (WIDTH - longest) / 2));
        for (String line : lines) output.println(padding + line);
    }

    private void row(String format, Object... values) {
        line(String.format(Locale.ROOT, format, values).stripTrailing());
    }

    /** Keep long feedback readable in an ordinary 80-column terminal. */
    private void line(String message) {
        int available = WIDTH - 4;
        while (message.length() > available) {
            int split = message.lastIndexOf(' ', available);
            if (split <= 0) split = available;
            output.println("  " + message.substring(0, split));
            message = message.substring(split).stripLeading();
        }
        output.println("  " + message);
    }
}

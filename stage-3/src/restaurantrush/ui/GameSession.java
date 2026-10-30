package restaurantrush.ui;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import restaurantrush.Customer;
import restaurantrush.GameEngine;
import restaurantrush.GameResult;
import restaurantrush.GameSetup;
import restaurantrush.GameState;
import restaurantrush.MenuItem;
import restaurantrush.Order;
import restaurantrush.Table;
import restaurantrush.WaiterTask;

/**
 * One game, driven by the web boundary.
 *
 * <p>Every game rule stays where it already was: domain and control objects. This
 * class does two things only - turn one request into one call on {@link GameEngine},
 * and render the current state as JSON. It never decides whether a move is legal;
 * it calls the engine and forwards whatever message comes back, which is exactly
 * how the command line boundary works too.</p>
 *
 * <p>The four booleans below are <em>presentation</em> bookkeeping: which decision
 * slots the player has already filled during the current turn. They exist because
 * the page needs to know when to offer the "end turn" button, and they are reset
 * when a turn starts. They never gate a move.</p>
 */
public final class GameSession {

    private GameEngine engine;

    /** Read-only: used to show the arrival schedule, never to drive the game. */
    private final GameSetup schedule = new GameSetup();

    /** Every accepted command, in order, so the boundary can replay the game. */
    private final List<Action> history = new ArrayList<>();

    private boolean turnOpen;
    private boolean hostAssigned;
    private boolean waiterAssigned;
    private boolean chefAssigned;
    private String lastMessage = "";
    private List<String> lastEvents = List.of();

    /** What each role did this turn, shown next to that role's step. */
    private String hostMessage;
    private String waiterMessage;
    private String chefMessage;

    /** One entry per finished turn, so the page can show a shift log. */
    private final List<TurnRecord> log = new ArrayList<>();

    public GameSession() {
        newGame();
    }

    private void newGame() {
        engine = new GameEngine(new GameSetup());
        turnOpen = false;
        hostAssigned = false;
        waiterAssigned = false;
        chefAssigned = false;
        lastMessage = "";
        lastEvents = List.of();
        clearRoleMessages();
        log.clear();
    }

    private void clearRoleMessages() {
        hostMessage = null;
        waiterMessage = null;
        chefMessage = null;
    }

    // ------------------------------------------------------------------
    // Commands
    // ------------------------------------------------------------------

    /**
     * Runs one request.
     *
     * @param type one of {@code start}, {@code host}, {@code waiter}, {@code chef}, {@code finish}
     * @param task the sub-command, e.g. {@code seat}, {@code order}, {@code serve}, {@code wait}
     * @param id   a customer id or order id; ignored for {@code wait}
     * @param on   only for {@code start}: activate Happy Hour
     * @param lang the language to render messages in, {@code zh} or {@code en}
     * @return a JSON object {@code {ok, message, events, state}}
     */
    public synchronized String actionResponse(String type, String task, int id, boolean on, String lang) {
        String key = type == null ? "" : type.toLowerCase(Locale.ROOT);
        if ("undo".equals(key)) {
            return undoResponse(lang);
        }
        boolean ok = true;
        String message;
        try {
            message = dispatch(type, task, id, on);
            if ("reset".equals(key)) {
                history.clear();
            } else {
                history.add(new Action(key, task, id, on));
            }
        } catch (IllegalArgumentException | IllegalStateException refused) {
            ok = false;
            message = refused.getMessage() == null ? "Illegal action." : refused.getMessage();
        }
        String shown = Messages.localise(message, lang);
        return new Json.Obj()
                .bool("ok", ok)
                .str("message", shown)
                .value("events", eventsJson(lang))
                .value("state", stateJson(message, lang))
                .toString();
    }

    private String eventsJson(String lang) {
        return Json.array(lastEvents.stream()
                .map(event -> Json.string(Messages.localise(event, lang)))
                .toList());
    }

    /**
     * Steps back one accepted action.
     *
     * <p>The engine has no undo, and adding one would mean copying its whole object graph on
     * every move. The boundary instead keeps the actions it already accepted and replays them
     * into a fresh engine, which reproduces the earlier state exactly: the game has no
     * randomness, and an order id is derived from its customer, so nothing depends on how many
     * objects were created before. Replaying a whole 18-turn game costs well under a
     * millisecond.</p>
     */
    private String undoResponse(String lang) {
        boolean ok = !history.isEmpty();
        String message;
        if (ok) {
            history.remove(history.size() - 1);
            rebuild();
            message = "Undid the last step.";
        } else {
            message = "Nothing to undo yet.";
        }
        lastMessage = message;
        return new Json.Obj()
                .bool("ok", ok)
                .str("message", Messages.localise(message, lang))
                .value("events", eventsJson(lang))
                .value("state", stateJson(message, lang))
                .toString();
    }

    /** Starts a fresh game and replays every action still in the history. */
    private void rebuild() {
        newGame();
        for (int index = 0; index < history.size(); index++) {
            Action action = history.get(index);
            dispatch(action.type, action.task, action.id, action.on);
        }
    }

    /** The events of one finished turn, kept for the shift log. */
    private static final class TurnRecord {
        private final int turn;
        private final boolean happyHour;
        private final List<String> events;

        private TurnRecord(int turn, boolean happyHour, List<String> events) {
            this.turn = turn;
            this.happyHour = happyHour;
            this.events = events;
        }
    }

    /** One accepted command, kept only so that it can be replayed. */
    private static final class Action {
        private final String type;
        private final String task;
        private final int id;
        private final boolean on;

        private Action(String type, String task, int id, boolean on) {
            this.type = type;
            this.task = task;
            this.id = id;
            this.on = on;
        }
    }

    private String dispatch(String type, String task, int id, boolean on) {
        String key = type == null ? "" : type.toLowerCase(Locale.ROOT);
        switch (key) {
            case "start" -> {
                engine.startTurn(on);
                turnOpen = true;
                hostAssigned = false;
                waiterAssigned = false;
                chefAssigned = false;
                clearRoleMessages();
                lastEvents = List.of();
                lastMessage = on ? "Happy Hour activated for this turn." : "Turn started.";
                return lastMessage;
            }
            case "host" -> {
                String message = engine.assignHost(isWait(task) ? 0 : id);
                hostAssigned = true;
                hostMessage = message;
                lastMessage = message;
                return message;
            }
            case "waiter" -> {
                WaiterTask waiterTask = WaiterTask.valueOf(
                        task == null ? "" : task.toUpperCase(Locale.ROOT));
                String message = engine.assignWaiter(waiterTask, id);
                waiterAssigned = true;
                waiterMessage = message;
                lastMessage = message;
                return message;
            }
            case "chef" -> {
                String message = engine.assignChef(isWait(task) ? 0 : id);
                chefAssigned = true;
                chefMessage = message;
                lastMessage = message;
                return message;
            }
            case "finish" -> {
                // Read before finishTurn(), which counts the Happy Hour turn down.
                boolean happyHourTurn = engine.getHappyHourRemaining() > 0;
                List<String> events = engine.finishTurn();
                log.add(new TurnRecord(engine.getTurn(), happyHourTurn, events));
                turnOpen = false;
                hostAssigned = false;
                waiterAssigned = false;
                chefAssigned = false;
                clearRoleMessages();
                lastEvents = events;
                lastMessage = "Turn " + engine.getTurn() + " finished.";
                return lastMessage;
            }
            case "reset" -> {
                newGame();
                lastMessage = "New game started.";
                return lastMessage;
            }
            default -> throw new IllegalArgumentException("Unknown action type: " + type);
        }
    }

    private static boolean isWait(String task) {
        return task != null && task.equalsIgnoreCase("wait");
    }

    // ------------------------------------------------------------------
    // State rendering
    // ------------------------------------------------------------------

    public synchronized String stateJson(String lang) {
        return stateJson(null, lang);
    }

    private String stateJson(String message, String lang) {
        GameState state = engine.getState();

        Json.Obj root = new Json.Obj()
                .str("stage", engine.getStageName())
                .num("turn", engine.getTurn())
                .num("maxTurns", GameSetup.MAX_TURNS)
                .str("phase", phase())
                .bool("canUndo", !history.isEmpty())
                .num("revenueCents", state.getRevenueCents())
                .num("paidCount", state.getPaidCount())
                .num("servedCount", state.getServedCount())
                .num("unhappyDepartures", state.getUnhappyDepartures())
                .str("averageSatisfaction", state.averageSatisfactionText())
                .value("happyHour", new Json.Obj()
                        .bool("used", engine.hasUsedHappyHour())
                        .bool("active", engine.getHappyHourRemaining() > 0)
                        .num("remaining", engine.getHappyHourRemaining())
                        .toString())
                .value("arrivals", arrivalsJson())
                .value("menu", Json.array(menu(state)))
                .value("targets", new Json.Obj()
                        .num("paid", GameResult.PAID_TARGET)
                        .num("revenueCents", GameResult.REVENUE_TARGET_CENTS)
                        .num("satisfaction", GameResult.SATISFACTION_TARGET)
                        .toString())
                .value("assignments", new Json.Obj()
                        .bool("host", hostAssigned)
                        .bool("waiter", waiterAssigned)
                        .bool("chef", chefAssigned)
                        .toString())
                .value("roleMessages", new Json.Obj()
                        .str("host", Messages.localise(hostMessage, lang))
                        .str("waiter", Messages.localise(waiterMessage, lang))
                        .str("chef", Messages.localise(chefMessage, lang))
                        .toString())
                .value("targetsNow", targetsJson(state))
                .value("waiting", Json.array(customers(state, state.getWaiting())))
                .value("tables", Json.array(tables(state)))
                .value("customers", Json.array(customers(state, state.getCustomers())))
                .value("orders", Json.array(orders(state.getOrders())))
                .value("kitchen", Json.array(activeOrders(state.getOrders())))
                .value("history", Json.array(history(state)))
                .value("log", logJson(lang))
                .str("message", Messages.localise(message == null ? lastMessage : message, lang))
                .value("events", eventsJson(lang));

        if (engine.isFinished()) {
            root.str("result", engine.getResult().describe());
        } else {
            root.nul("result");
        }
        return root.toString();
    }

    private String phase() {
        if (engine.isFinished()) {
            return "FINISHED";
        }
        if (engine.getTurn() == 0) {
            return "NOT_STARTED";
        }
        return turnOpen ? "DECIDING" : "BETWEEN_TURNS";
    }

    private static List<String> customers(GameState state, List<Customer> list) {
        List<String> items = new ArrayList<>();
        for (Customer customer : list) {
            items.add(customer(state, customer));
        }
        return items;
    }

    private static String customer(GameState state, Customer customer) {
        Order order = state.orderFor(customer.getId());
        return new Json.Obj()
                .num("id", customer.getId())
                .str("type", customer.getType())
                .str("status", customer.getStatus().name())
                .num("satisfaction", customer.getSatisfaction())
                .value("order", order == null ? "null" : order(order))
                .toString();
    }

    private static List<String> menu(GameState state) {
        List<String> items = new ArrayList<>();
        for (MenuItem item : state.getMenu().getItems()) {
            items.add(new Json.Obj()
                    .str("name", item.getName())
                    .num("priceCents", item.getPriceCents())
                    .num("units", item.getPreparationUnits())
                    .toString());
        }
        return items;
    }

    /**
     * The IDs each role can sensibly act on right now - the same lists the console
     * prints under each prompt ({@code ConsoleView}). They guide the player; the
     * engine still decides whether a move is legal.
     */
    private static String targetsJson(GameState state) {
        boolean freeTable = state.getTables().stream().anyMatch(Table::isFree);
        List<String> seat = new ArrayList<>();
        if (freeTable) {
            for (Customer customer : state.getWaiting()) {
                seat.add(Integer.toString(customer.getId()));
            }
        }
        List<String> order = new ArrayList<>();
        for (Customer customer : state.getCustomers()) {
            if (customer.getStatus() == Customer.Status.SEATED) {
                order.add(Integer.toString(customer.getId()));
            }
        }
        List<String> serve = new ArrayList<>();
        List<String> cook = new ArrayList<>();
        for (Order item : state.getOrders()) {
            if (item.getStatus() == Order.Status.READY) {
                serve.add(Integer.toString(item.getCustomerId()));
            }
            if (item.canPrepare()) {
                cook.add(Integer.toString(item.getId()));
            }
        }
        return new Json.Obj()
                .bool("freeTable", freeTable)
                .value("seat", Json.array(seat))
                .value("order", Json.array(order))
                .value("serve", Json.array(serve))
                .value("cook", Json.array(cook))
                .toString();
    }

    private String arrivalsJson() {
        List<String> turns = new ArrayList<>();
        int next = 0;
        // While a turn is open, that turn's arrival has already happened.
        int after = turnOpen ? engine.getTurn() : engine.getTurn() - 1;
        for (int turn = 1; turn <= GameSetup.MAX_TURNS; turn++) {
            if (schedule.hasArrival(turn)) {
                turns.add(Integer.toString(turn));
                if (next == 0 && turn > after) {
                    next = turn;
                }
            }
        }
        return new Json.Obj()
                .value("turns", Json.array(turns))
                .num("next", next)
                .toString();
    }

    private String logJson(String lang) {
        List<String> items = new ArrayList<>();
        for (TurnRecord record : log) {
            items.add(new Json.Obj()
                    .num("turn", record.turn)
                    .bool("happyHour", record.happyHour)
                    .value("events", Json.array(record.events.stream()
                            .map(event -> Json.string(Messages.localise(event, lang)))
                            .toList()))
                    .toString());
        }
        return Json.array(items);
    }

    private static List<String> tables(GameState state) {
        List<String> items = new ArrayList<>();
        for (Table table : state.getTables()) {
            Customer occupant = table.getCustomer();
            items.add(new Json.Obj()
                    .num("id", table.getId())
                    .value("customer", occupant == null ? "null" : customer(state, occupant))
                    .toString());
        }
        return items;
    }

    private static List<String> orders(List<Order> list) {
        List<String> items = new ArrayList<>();
        for (Order order : list) {
            items.add(order(order));
        }
        return items;
    }

    private static String order(Order order) {
        return new Json.Obj()
                .num("id", order.getId())
                .num("customerId", order.getCustomerId())
                .str("name", order.getItem().getName())
                .num("priceCents", order.getBillCents())
                .str("status", order.getStatus().name())
                .num("done", order.getCompletedUnits())
                .num("total", order.getItem().getPreparationUnits())
                .toString();
    }

    /**
     * What belongs on the kitchen board: orders still being worked on. Grouping is
     * presentation, so it is decided here rather than in the browser.
     */
    private static List<String> activeOrders(List<Order> list) {
        List<Order> active = new ArrayList<>();
        for (Order order : list) {
            if (order.getStatus() == Order.Status.PLACED
                    || order.getStatus() == Order.Status.PREPARING
                    || order.getStatus() == Order.Status.READY) {
                active.add(order);
            }
        }
        return orders(active);
    }

    private static List<String> history(GameState state) {
        List<Customer> left = new ArrayList<>();
        for (Customer customer : state.getCustomers()) {
            if (customer.getStatus() == Customer.Status.PAID
                    || customer.getStatus() == Customer.Status.LEFT) {
                left.add(customer);
            }
        }
        return customers(state, left);
    }

    // ------------------------------------------------------------------
    // Preview seeding (P1 style review only)
    // ------------------------------------------------------------------

    /**
     * Advances a fresh game along a fixed, legal decision script so the page can be
     * reviewed with realistic data instead of an empty turn 1.
     *
     * <p>Used only by {@code --preview}; a normal launch starts a genuinely new game.
     * The script goes through the same replay path as {@code undo}, so the preview state
     * can be stepped back like any other.</p>
     */
    public synchronized void seedPreview() {
        history.clear();
        previewTurn(false, 1, WaiterTask.ORDER, 1, 1);
        previewTurn(false, 0, WaiterTask.SERVE, 1, 0);
        previewTurn(false, 0, WaiterTask.WAIT, 0, 0);
        previewTurn(false, 2, WaiterTask.ORDER, 2, 2);
        previewTurn(false, 0, WaiterTask.SERVE, 2, 0);
        previewTurn(false, 0, WaiterTask.WAIT, 0, 0);
        previewTurn(false, 3, WaiterTask.ORDER, 3, 3);
        previewTurn(false, 0, WaiterTask.WAIT, 0, 3);
        previewTurn(false, 0, WaiterTask.WAIT, 0, 0);
        history.add(new Action("start", null, 0, false));
        rebuild();
    }

    private void previewTurn(boolean activate, int hostSeat, WaiterTask waiterTask, int waiterId, int cookOrder) {
        history.add(new Action("start", null, 0, activate));
        history.add(new Action("host", hostSeat == 0 ? "wait" : "seat", hostSeat, false));
        history.add(new Action("waiter", waiterTask.name().toLowerCase(Locale.ROOT), waiterId, false));
        history.add(new Action("chef", cookOrder == 0 ? "wait" : "cook", cookOrder, false));
        history.add(new Action("finish", null, 0, false));
    }
}

package restaurantrush.ui;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import restaurantrush.Customer;
import restaurantrush.GameEngine;
import restaurantrush.GameResult;
import restaurantrush.GameSetup;
import restaurantrush.GameState;
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

    private boolean turnOpen;
    private boolean hostAssigned;
    private boolean waiterAssigned;
    private boolean chefAssigned;
    private String lastMessage = "";
    private List<String> lastEvents = List.of();

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
     * @return a JSON object {@code {ok, message, events, state}}
     */
    public synchronized String actionResponse(String type, String task, int id, boolean on) {
        boolean ok = true;
        String message;
        try {
            message = dispatch(type, task, id, on);
        } catch (IllegalArgumentException | IllegalStateException refused) {
            ok = false;
            message = refused.getMessage() == null ? "Illegal action." : refused.getMessage();
        }
        return new Json.Obj()
                .bool("ok", ok)
                .str("message", message)
                .value("events", Json.array(lastEvents.stream().map(Json::string).toList()))
                .value("state", stateJson(message))
                .toString();
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
                lastEvents = List.of();
                lastMessage = on ? "Happy Hour activated for this turn." : "Turn started.";
                return lastMessage;
            }
            case "host" -> {
                String message = engine.assignHost(isWait(task) ? 0 : id);
                hostAssigned = true;
                lastMessage = message;
                return message;
            }
            case "waiter" -> {
                WaiterTask waiterTask = WaiterTask.valueOf(
                        task == null ? "" : task.toUpperCase(Locale.ROOT));
                String message = engine.assignWaiter(waiterTask, id);
                waiterAssigned = true;
                lastMessage = message;
                return message;
            }
            case "chef" -> {
                String message = engine.assignChef(isWait(task) ? 0 : id);
                chefAssigned = true;
                lastMessage = message;
                return message;
            }
            case "finish" -> {
                List<String> events = engine.finishTurn();
                turnOpen = false;
                hostAssigned = false;
                waiterAssigned = false;
                chefAssigned = false;
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

    public synchronized String stateJson() {
        return stateJson(null);
    }

    private String stateJson(String message) {
        GameState state = engine.getState();

        Json.Obj root = new Json.Obj()
                .str("stage", engine.getStageName())
                .num("turn", engine.getTurn())
                .num("maxTurns", GameSetup.MAX_TURNS)
                .str("phase", phase())
                .num("revenueCents", state.getRevenueCents())
                .num("paidCount", state.getPaidCount())
                .num("servedCount", state.getServedCount())
                .num("unhappyDepartures", state.getUnhappyDepartures())
                .str("averageSatisfaction", state.averageSatisfactionText())
                .value("happyHour", new Json.Obj()
                        .bool("used", engine.hasUsedHappyHour())
                        .num("remaining", engine.getHappyHourRemaining())
                        .toString())
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
                .value("waiting", Json.array(customers(state.getWaiting())))
                .value("tables", Json.array(tables(state)))
                .value("orders", Json.array(orders(state.getOrders())))
                .value("kitchen", Json.array(activeOrders(state.getOrders())))
                .value("history", Json.array(history(state)))
                .str("message", message == null ? lastMessage : message)
                .value("events", Json.array(lastEvents.stream().map(Json::string).toList()));

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

    private static List<String> customers(List<Customer> list) {
        List<String> items = new ArrayList<>();
        for (Customer customer : list) {
            items.add(customer(customer));
        }
        return items;
    }

    private static String customer(Customer customer) {
        return new Json.Obj()
                .num("id", customer.getId())
                .str("type", customer.getType())
                .str("status", customer.getStatus().name())
                .num("satisfaction", customer.getSatisfaction())
                .toString();
    }

    private static List<String> tables(GameState state) {
        List<String> items = new ArrayList<>();
        for (Table table : state.getTables()) {
            Customer occupant = table.getCustomer();
            items.add(new Json.Obj()
                    .num("id", table.getId())
                    .value("customer", occupant == null ? "null" : customer(occupant))
                    .toString());
        }
        return items;
    }

    private static List<String> orders(List<Order> list) {
        List<String> items = new ArrayList<>();
        for (Order order : list) {
            items.add(new Json.Obj()
                    .num("id", order.getId())
                    .num("customerId", order.getCustomerId())
                    .str("name", order.getItem().getName())
                    .num("priceCents", order.getBillCents())
                    .str("status", order.getStatus().name())
                    .num("done", order.getCompletedUnits())
                    .num("total", order.getItem().getPreparationUnits())
                    .toString());
        }
        return items;
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
        return customers(left);
    }

    // ------------------------------------------------------------------
    // Preview seeding (P1 style review only)
    // ------------------------------------------------------------------

    /**
     * Advances a fresh game along a fixed, legal decision script so the page can be
     * reviewed with realistic data instead of an empty turn 1.
     *
     * <p>Used only by {@code --preview}; a normal launch starts a genuinely new game.
     * Every call is an ordinary public engine call, so no rule is bypassed.</p>
     */
    public synchronized void seedPreview() {
        turn(false, 1, WaiterTask.ORDER, 1, 1);
        turn(false, 0, WaiterTask.SERVE, 1, 0);
        turn(false, 0, WaiterTask.WAIT, 0, 0);
        turn(false, 2, WaiterTask.ORDER, 2, 2);
        turn(false, 0, WaiterTask.SERVE, 2, 0);
        turn(false, 0, WaiterTask.WAIT, 0, 0);
        turn(false, 3, WaiterTask.ORDER, 3, 3);
        turn(false, 0, WaiterTask.WAIT, 0, 3);
        turn(false, 0, WaiterTask.WAIT, 0, 0);
        engine.startTurn(false);
        turnOpen = true;
    }

    private void turn(boolean activate, int hostSeat, WaiterTask waiterTask, int waiterId, int cookOrder) {
        engine.startTurn(activate);
        engine.assignHost(hostSeat);
        engine.assignWaiter(waiterTask, waiterId);
        engine.assignChef(cookOrder);
        engine.finishTurn();
    }
}

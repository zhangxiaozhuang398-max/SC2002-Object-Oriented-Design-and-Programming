# Stage 3 Host ComboMeal and Happy Hour

Requires JDK 17 or newer. Everything compiles and runs offline with the Java standard library.

Windows, from this folder:
```bat
run.bat
run.bat --replay examples\victory.txt
run.bat --replay examples\defeat.txt
test.bat
```

The `.bat` files wrap `run.ps1` / `test.ps1` and bypass the PowerShell execution
policy, which otherwise refuses to load an unsigned script ("not digitally signed").

macOS/Linux: `sh run.sh`, `sh run.sh --replay examples/victory.txt`, `sh test.sh`.
Script paths are resolved relative to this stage, so invoking a script from the repository root also works.

## Optional web UI

An optional browser front-end exists as a second boundary object. It was added
after the stage-3 tag as an extra and changes no game rule: the page only draws
`GET /api/state` and forwards each click to `POST /api/action`, and the engine's
rejections are shown verbatim, so all rules still live in Java.

```bat
web.bat            start the web UI (fresh game) and open the browser
web.bat --preview  scripted mid-game state, for reviewing the layout
```

- Served from `http://127.0.0.1:8765` (the next free port if that one is busy);
  entirely offline, using the JDK's built-in `jdk.httpserver` - no libraries.
- Follows the console presentation: welcome page, a step-by-step turn panel
  (Happy Hour -> Host -> Waiter -> Chef -> Cashier) listing each role's current
  targets, end-of-turn summary, shift log and a final results page.
- Chinese / English toggle, undo, light and dark themes.
- Stage 1, 2 or 3 can be chosen in the page. `web.ps1` / `web.sh` compile all three
  stage folders (each into its own `build/web`), and the server loads each one with a
  separate class loader, one game per stage.
- `--no-browser` skips opening the browser (for headless checks).

The command-line interface remains the primary entry point and is unchanged.

## Commands and turn order

Each turn asks for four decisions:

1. Happy Hour: `activate` or `continue`. Continue leaves an ongoing promotion active; it does not cancel it.
2. Host: `seat CUSTOMER_ID` or `wait`.
3. Waiter: `seat CUSTOMER_ID`, `order CUSTOMER_ID`, `serve CUSTOMER_ID`, or `wait`.
4. Chef: `cook ORDER_ID` or `wait`.

The Host acts before the Waiter, so a newly seated customer may order that turn.
Both staff may seat different customers if two tables are free. The Chef acts after the Waiter.
Customer and order IDs match. Customers choose their own meals when the Waiter takes the order.
The Cashier acts automatically after eating updates, and never charges a customer who just became ready this turn.
An occupied table is unavailable to the Host/Waiter until payment or abandonment at a turn end.
A served customer becomes ready to pay on the next turn, then may pay on the following turn.
Cashier priority is earliest READY_TO_PAY turn, then customer ID. Invalid decisions consume no task.
EOF before the final turn aborts with a nonzero exit status.

## Deterministic base rules

- 18 turns, two tables, six arrivals on 1, 4, 7, 10, 13, 16.
- Customer 2 is VIP, customer 3 is Critic, others are Regular.
- Regular/VIP food cycles by ID: Burger, Salad, Pasta. Every fourth such customer chooses the combo.
- Critics always choose Pasta, including if their ID would otherwise select a combo.
- The offered combo is Salad + Pasta: $24.30 and three preparation units.
- Waiting losses: Regular 8, VIP 5, Critic 12. Served/eating/ready-to-pay customers lose nothing.
- The target remains at least four payments, $45.00 revenue and 60 average paid satisfaction after turn 18.
- Served and paid counts are separate. The last arrival may be served, but cannot pay by turn 18.

## Happy Hour and money

Activation is allowed once per game at a turn start and lasts for that turn plus the next.
The display includes remaining active turns, including the current turn.
At each active turn start, existing waiting/seated/unserved customers recover 15 satisfaction, capped at 100.
Arrivals then start at 100. Eating, ready-to-pay, paid and departed customers receive no recovery.
Normal waiting losses still occur at the end of an active turn.

A combo first calculates 90% of its components' total. A VIP then receives 10% off.
Happy Hour then takes 20% off the customer-adjusted price.
Every monetary percentage calculation rounds half up to the nearest integer cent.
Examples: VIP Burger during Happy Hour = $10.80; VIP Salad+Pasta combo during Happy Hour = $17.50.
The order stores its final price once, when placed; later policy changes never reprice it.

## Reproducible test notes

- Victory replay activates Happy Hour on turn 4 and uses all three new features.
  Five paid customers, six served, $72.78 revenue, average paid satisfaction 85.60, VICTORY.
  Payments: turns 4, 7, 11, 15, 17; satisfaction 92, 100, 76, 76, 84.
- Defeat replay: no activation, all staff wait for all 18 turns; no payments, $0.00, N/A, two unhappy departures, DEFEAT.
- Tests retain the original six-turn Pasta scenario with the Host waiting and promotion unused.
  They additionally cover Host capacity/retries, component identity and rounding, activation duration,
  lock-in before/after promotion, recovery scope, result thresholds and all CLI replays.

## Changes from Stage 2

New source files: `Host.java`, `ComboMeal.java`, `HappyHourPolicy.java`.

| Changed source | Reason |
| --- | --- |
| `GameSetup.java` | Register combo and change stage banner |
| `Menu.java` | Hold combo choices and apply deterministic combo preference |
| `Customer.java` | Encapsulate bounded recovery for customers still waiting |
| `GameState.java` | Delegate locked order quotations to promotion pricing |
| `GameEngine.java` | Add start-of-turn policy hook and independent Host phase |
| `ConsoleUI.java` | Collect promotion/Host choices and display remaining duration |

Tests, replay inputs and this README are updated for the new phases.
No source files were deleted. Waiter, Chef, Cashier, Order, Table, Receipt, GameResult,
customer subclasses and existing money calculations remain unchanged.
[Stage comparison](https://github.com/DasbootU9607/SC2002-Object-Oriented-Design-and-Programming/compare/stage-2...stage-3).

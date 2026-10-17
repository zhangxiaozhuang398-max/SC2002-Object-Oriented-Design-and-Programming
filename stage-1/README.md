# Stage 1 Basic operation

Requires JDK 17 or newer. No libraries, build service, or network access are required.

From this folder on Windows:
```bat
run.bat
run.bat --replay examples\victory.txt
run.bat --replay examples\defeat.txt
test.bat
```

The `.bat` files wrap `run.ps1` / `test.ps1` and bypass the PowerShell execution
policy, which otherwise refuses to load an unsigned script ("not digitally signed").

On macOS or Linux use `sh run.sh`, `sh run.sh --replay examples/victory.txt`, and `sh test.sh`.

The fixed base setting is 18 turns, two tables, one Waiter, one Chef, and one Cashier.
Six Regular customers arrive on turns 1, 4, 7, 10, 13 and 16.
By customer ID, food cycles through Burger, Salad, Pasta. The manager chooses priorities, never meals.

The Waiter accepts `seat CUSTOMER_ID`, `order CUSTOMER_ID`, `serve CUSTOMER_ID`, or `wait`.
The Chef accepts `cook ORDER_ID` or `wait`. An order ID equals its customer's ID.
The Chef may prepare an order taken this turn. A newly completed dish can only be served on a later turn.
After serving, the next turn completes eating and the following turn permits payment.
Cashier priority is the earliest READY_TO_PAY turn, then customer ID.
Invalid input retries without consuming a task. EOF aborts with a nonzero process exit status.

All prices use integer cents. Revenue and satisfaction statistics use immutable payment receipts.
The average shown is rounded for display only; victory uses the unrounded satisfaction sum.
Served count and paid count are separate. No game ends before turn 18.

## Reproducible test notes

- `examples/victory.txt`: five paid customers, $66.00, average satisfaction 79.20, VICTORY.
  Payments occur on turns 5, 8, 12, 15, 18 with satisfaction 84, 84, 76, 76, 76.
- `examples/defeat.txt`: all staff wait for 18 turns; no payments, $0.00, average N/A, two unhappy departures, DEFEAT.
- `test/restaurantrush/GameTests.java` checks the brief's six-turn Pasta example, task limits,
  invalid input, full tables, abandonment, cancellation, payment timing, ordering, snapshots, and both replays.

This folder contains only Stage 1 features and compiles independently.

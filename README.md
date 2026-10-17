# Restaurant Rush

An offline Java 17 command-line restaurant management game for SC2002.

Repository: https://github.com/DasbootU9607/SC2002-Object-Oriented-Design-and-Programming

## Build and play

Install JDK 17 or newer. No Maven, Gradle, external libraries, server or network access is needed.

Windows, from the repository root:

```bat
stage-3\run.bat
stage-3\run.bat --replay examples\victory.txt
stage-3\run.bat --replay examples\defeat.txt
verify.bat
```

The `.bat` files wrap the `.ps1` scripts and pass `-ExecutionPolicy Bypass`, because
PowerShell otherwise refuses to load an unsigned script ("not digitally signed").
`.ps1` equivalents: `.\stage-3\run.ps1` and `.\verify.ps1`.

`stage-3\web.bat` starts the optional browser front-end for Stage 3 - a second
boundary object that contains no game rules. See `stage-3/README.md`.

macOS/Linux:

```sh
sh stage-3/run.sh
sh stage-3/run.sh --replay examples/victory.txt
sh stage-3/run.sh --replay examples/defeat.txt
sh verify.sh
```

Replace `stage-3` with `stage-1` or `stage-2` to run an earlier stage.
The scripts resolve paths from their own folder. Each stage is independently compilable.

For a direct build from a stage folder:

```sh
mkdir -p build/classes
javac -encoding UTF-8 --release 17 -d build/classes src/restaurantrush/*.java
java -cp build/classes restaurantrush.Main
```

## Runnable stages

| Folder | Git tag | Features | Behavioural assertions |
| --- | --- | --- | ---: |
| [stage-1](stage-1/README.md) | `stage-1` | Complete basic game with Regular customers | 99 |
| [stage-2](stage-2/README.md) | `stage-2` | Adds VIP and Critic behaviours | 110 |
| [stage-3](stage-3/README.md) | `stage-3` | Adds Host, ComboMeal and Happy Hour | 159 |

Every folder contains `src/restaurantrush`, `test/restaurantrush`, `examples`,
and its own build/run/test scripts. Repeated source files are intentional: stages do not depend on each other.

The tags are successive real development snapshots. The first tag contains only Stage 1;
the second adds Stage 2; the third adds Stage 3. To inspect a historical snapshot,
use a separate checkout or `git switch --detach stage-1`; return with `git switch main`.

## Rules and reproducibility

The base game always uses 18 turns, two tables and six arrivals on turns 1, 4, 7, 10, 13 and 16.
A result is evaluated only after all 18 turns. Victory requires at least four payments,
$45.00 revenue and average paid-customer satisfaction of 60.

Customers choose their own meals deterministically; no seed or external data is needed.
The stage READMEs explain food preferences, customer schedules, exact turn order, money rounding,
Host priority and Happy Hour. Prices are stored as integer cents and locked when orders are taken.
Average satisfaction uses payment-time snapshots; it is N/A before any payment.
GUI, networking, multiplayer and persistent save/load are outside the mandatory implementation.

| Replay | Paid | Served | Revenue | Paid satisfaction average | Outcome |
| --- | ---: | ---: | ---: | ---: | --- |
| Stage 1 victory | 5 | 5 | $66.00 | 79.20 | VICTORY |
| Stage 2 victory | 5 | 5 | $65.10 | 78.00 | VICTORY |
| Stage 3 victory | 5 | 6 | $72.78 | 85.60 | VICTORY |
| Each stage defeat | 0 | 0 | $0.00 | N/A | DEFEAT |

Every supplied replay runs all 18 turns. The Stage 3 victory activates Happy Hour on turn 4,
processes a VIP order at the promotional price, prepares a three-unit combo,
and uses the Host in addition to the Waiter.

## Stage 1 to Stage 2

[GitHub comparison](https://github.com/DasbootU9607/SC2002-Object-Oriented-Design-and-Programming/compare/stage-1...stage-2)

New logical source files: `VIPCustomer.java`, `CriticCustomer.java`.

Changed source: `GameSetup.java` registers the mixed arrival schedule and changes the stage banner.
`GameTests.java` adds polymorphism checks and updates replay expectations; the stage README documents the rules.
No source files were deleted. GameEngine, staff, ConsoleUI and existing model classes are unchanged.

## Stage 2 to Stage 3

[GitHub comparison](https://github.com/DasbootU9607/SC2002-Object-Oriented-Design-and-Programming/compare/stage-2...stage-3)

New logical source files: `Host.java`, `ComboMeal.java`, `HappyHourPolicy.java`.

| Changed source | Reason |
| --- | --- |
| `GameSetup.java` | Register the combo and update the stage banner |
| `Menu.java` | Store combo choices and implement the documented selection rule |
| `Customer.java` | Encapsulate satisfaction recovery without reviving departed customers |
| `GameState.java` | Delegate price quotations to the active policy |
| `GameEngine.java` | Add the Host phase and policy hooks around the existing turn sequence |
| `ConsoleUI.java` | Collect the new choices and display remaining Happy Hour duration |

The test suite, stage README and both replay files are extended for the new phases.
No source files were deleted. Order lifecycle, preparation, serving, payment, table release,
customer subclasses, integer money and result rules remain unchanged.

Since stages live in separate self-contained folders, GitHub compares added snapshots.
For a focused source comparison locally, use:
```sh
git diff --no-index stage-1/src stage-2/src
git diff --no-index stage-2/src stage-3/src
```
A diff exit code of 1 means differences were found, not a failed build.

## Validation

`verify.ps1` / `verify.sh` runs all three dependency-free suites, totalling 368 assertions.
They cover the brief's Pasta timeline, staff capacity, invalid input retries, queue/table rules,
abandonment and cancellation, payment order, price and satisfaction snapshots, both endings,
polymorphic customer behaviour, Host actions, combo rounding, and Happy Hour duration/lock-in.
The Stage 3 suite also checks each victory threshold separately.

Sources were compiled with `javac --release 17 -Xlint:all -Werror`.
Command-line help, invalid arguments and missing replay files were also checked.
Earlier behaviour is exercised in Stage 3 with the Host waiting and promotion unused.

## Remaining course submission materials

The repository supplies code, runnable stage snapshots, test evidence and source documentation.
The group still needs to prepare the final UML class and sequence diagrams, PDF report,
recorded group video, signed original-work declarations, and individual GAI-use declarations.

No video has been recorded. Add the actual video link and segment timestamps here after recording:
launch; constrained manager choice; READY/SERVED/payment; VIP or Critic; Stage 3 feature;
victory and defeat; stage comparisons and diagrams.

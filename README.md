<h1 align="center">🍽️ Restaurant Rush</h1>

<p align="center">
A turn-based restaurant management game in Java · SC2002 Object-Oriented Design &amp; Programming
</p>

<p align="center">
One README, two languages: open <b>中文</b> below to switch · 点击下方「中文」标题即可切换语言
</p>

| Dashboard, mid-game / 游戏面板（中局） | A new game / 全新开局 |
| :---: | :---: |
| ![Dashboard](docs/ui-dashboard.png) | ![New game](docs/ui-start.png) |

<details name="lang" open>
<summary><b>🇬🇧 English</b></summary>

### What this is

Restaurant Rush is a turn-based restaurant management game in Java. The player is the
manager: staff time is scarce, so deciding **who gets served first** is the whole game.
It comes in three runnable stages, each a git tag, plus an optional browser front-end.

- Java 17 or newer. No Maven, no Gradle, no external libraries, no network access.
- Two interfaces over the same rules: a **command-line game** (primary) and an
  optional **web UI**.

**Repositories**

- Group repository: <https://github.com/DasbootU9607/SC2002-Object-Oriented-Design-and-Programming>
- Fork that adds the optional web UI: <https://github.com/zhangxiaozhuang398-max/SC2002-Object-Oriented-Design-and-Programming>
- Documentation site with a one-click language switch: <https://zhangxiaozhuang398-max.github.io/SC2002-Object-Oriented-Design-and-Programming/>

### Quick start: one launcher

Windows — double-click **`start.bat`**, or from a terminal:

```bat
start.bat
```

macOS / Linux:

```sh
sh start.sh
```

The launcher offers:

| # | Action | What it does |
| --- | --- | --- |
| 1 | Web UI | Starts the local server and opens the browser |
| 2 | Web UI layout preview | Same, but with a scripted mid-game state |
| 3 | Command line, Stage 3 | The full game |
| 4 | Command line, Stage 2 | VIP and Critic customers |
| 5 | Command line, Stage 1 | Basic game |
| 6 | All tests | 368 assertions across the three stages |

Every entry also works as a direct command, which is convenient for scripts:

```bat
start.bat web       :: web UI, fresh game
start.bat preview   :: web UI, mid-game state
start.bat cli       :: Stage 3 in the terminal
start.bat cli2      :: Stage 2
start.bat cli1      :: Stage 1
start.bat test      :: all three test suites
```

### Web UI (front-end)

The browser front-end is an extra boundary object, added after the `stage-3` tag. It
contains **no game rules**: the page only draws `GET /api/state` and forwards each click
to `POST /api/action`, and whatever the engine replies is shown verbatim — including the
reason a move was rejected.

```bat
stage-3\web.bat              :: same as: start.bat web
stage-3\web.bat --preview    :: same as: start.bat preview
```

- Served from `http://127.0.0.1:8765` — the next free port if that one is busy — and the
  browser opens automatically.
- Uses the JDK's built-in `jdk.httpserver`, so it is still dependency-free and fully
  offline; nothing ever leaves the machine.
- Panels for the waiting queue, the two tables, the kitchen and the customers who have
  left, with a button per decision: seat, order, serve, cook, wait.
- Chinese / English toggle in the top-right corner; the choice is remembered.
- `--no-browser` starts the server without opening a browser (useful for a quick check).

### Command-line game (the primary interface)

```bat
stage-3\run.bat
stage-3\run.bat --replay examples\victory.txt
stage-3\run.bat --replay examples\defeat.txt
```

Replace `stage-3` with `stage-1` or `stage-2` for the earlier stages. Each stage folder is
self-contained — `src`, `test`, `examples`, its own scripts and README — so it can be built
and played on its own.

macOS / Linux: `sh stage-3/run.sh`, `sh stage-3/run.sh --replay examples/victory.txt`.

A direct build, without any script:

```sh
mkdir -p build/classes
javac -encoding UTF-8 --release 17 -d build/classes src/restaurantrush/*.java
java -cp build/classes restaurantrush.Main
```

### Tests

```bat
verify.bat          :: same as: start.bat test
```

Runs the three dependency-free suites: 99 + 110 + 159 = **368 assertions**, exit code 0
when everything passes. They cover the brief's Pasta timeline, staff capacity, invalid
input retries, queue and table rules, abandonment and cancellation, payment order, price
and satisfaction snapshots, both endings, polymorphic customer behaviour, Host actions,
combo rounding, and Happy Hour duration and lock-in.

### Project layout

```
.
├─ start.bat / start.ps1 / start.sh     one-stop launcher
├─ verify.bat / verify.ps1 / verify.sh  all three test suites
├─ docs/                                screenshots used by this README
├─ stage-1/  stage-2/  stage-3/         one self-contained snapshot per stage
│    ├─ src/restaurantrush/             Java sources
│    ├─ test/restaurantrush/            dependency-free test suite
│    ├─ examples/                       victory and defeat replays
│    └─ run / test scripts, README
└─ stage-3/
     ├─ src/restaurantrush/ui/          web boundary (server, session, JSON writer)
     └─ web/                            index.html, style.css, app.js
```

### Base setting

| Setting | Value |
| --- | --- |
| Turns | 18 (the game always plays all of them) |
| Tables | 2 |
| Staff | Waiter ×1 (one task per turn), Chef ×1 (one preparation unit per turn), Cashier ×1 (one payment per turn) |
| Arrivals | One customer on turns 1, 4, 7, 10, 13 and 16 |
| Victory | at least 4 paid customers **and** revenue ≥ $45.00 **and** average paid satisfaction ≥ 60 |

| Menu item | Price | Preparation units |
| --- | --- | --- |
| Salad | $9.00 | 1 |
| Burger | $15.00 | 1 |
| Pasta | $18.00 | 2 |
| Combo (Salad + Pasta) | $24.30 | 3 |

Customers choose their own meals by a documented deterministic rule. Prices are integer
cents and are locked when an order is taken. The average satisfaction uses the value
recorded at the moment each customer pays.

### The three stages

| Folder | Git tag | Adds | Assertions |
| --- | --- | --- | ---: |
| [stage-1](stage-1/README.md) | `stage-1` | Basic game with Regular customers | 99 |
| [stage-2](stage-2/README.md) | `stage-2` | VIP and Critic customers | 110 |
| [stage-3](stage-3/README.md) | `stage-3` | Host, ComboMeal, Happy Hour | 159 |

Repeated source files between stage folders are intentional: each stage is an independent,
self-contained snapshot. The tags are annotated and sit on successive commits, so
`git switch --detach stage-1` shows only Stage 1.

### Stage 1 → Stage 2

[GitHub comparison](https://github.com/DasbootU9607/SC2002-Object-Oriented-Design-and-Programming/compare/stage-1...stage-2)

New source files: `VIPCustomer.java`, `CriticCustomer.java`.

Changed source: `GameSetup.java` registers the mixed arrival schedule and changes the stage
banner; `GameTests.java` adds polymorphism checks and updates the replay expectations.
No source files were deleted — `GameEngine`, the staff classes, `ConsoleUI` and the existing
model classes are unchanged, which is the point: new customer behaviour arrives without
touching the turn sequence.

### Stage 2 → Stage 3

[GitHub comparison](https://github.com/DasbootU9607/SC2002-Object-Oriented-Design-and-Programming/compare/stage-2...stage-3)

New source files: `Host.java`, `ComboMeal.java`, `HappyHourPolicy.java`.

| Changed source | Reason |
| --- | --- |
| `GameSetup.java` | Register the combo and update the stage banner |
| `Menu.java` | Store combo choices and implement the documented selection rule |
| `Customer.java` | Encapsulate satisfaction recovery without reviving departed customers |
| `GameState.java` | Delegate price quotations to the active pricing policy |
| `GameEngine.java` | Add the Host phase and policy hooks around the existing turn sequence |
| `ConsoleUI.java` | Collect the new choices and display the remaining Happy Hour duration |

No source files were deleted. Order lifecycle, preparation, serving, payment, table release,
the customer subclasses, integer money and the result rules are unchanged.

Because each stage is a self-contained folder, GitHub shows these transitions as added
snapshots. For a focused source-only comparison locally:

```sh
git diff --no-index stage-1/src stage-2/src
git diff --no-index stage-2/src stage-3/src
```

(A diff exit code of 1 means differences were found — not a failed build.)

### Web UI as design evidence

The web front-end was added after `stage-3` and is a second boundary implementation over the
same control and domain classes. Adding it required **no change to any rule class**; the only
touch on existing code was extracting the three victory targets in `GameResult` into named
constants, so that the rule and the UI read the same numbers from one place. That is a
concrete, checkable example of keeping rules out of the UI.

### Reproducible runs

| Replay | Paid | Served | Revenue | Paid satisfaction average | Outcome |
| --- | ---: | ---: | ---: | ---: | --- |
| Stage 1 victory | 5 | 5 | $66.00 | 79.20 | VICTORY |
| Stage 2 victory | 5 | 5 | $65.10 | 78.00 | VICTORY |
| Stage 3 victory | 5 | 6 | $72.78 | 85.60 | VICTORY |
| Every stage, defeat | 0 | 0 | $0.00 | N/A | DEFEAT |

Every supplied replay runs all 18 turns. The Stage 3 victory activates Happy Hour on turn 4,
puts a VIP order through at the promotional price, prepares a three-unit combo and uses the
Host in addition to the Waiter. The same Stage 3 victory, replayed through the web API,
reaches identical figures — the web boundary is exercised end to end, not just by hand.

### Still to submit

The repository supplies the code, three runnable stage snapshots, test evidence and the
source documentation. The group still has to produce the final UML class and sequence
diagrams, the PDF report, the recorded group video, and the signed declarations.

Video segments (fill in the timestamps once recorded):

| # | Segment | Timestamp |
| --- | --- | --- |
| 1 | The game launching from the submitted project | |
| 2 | Meaningful manager choices, including a constrained decision | |
| 3 | A dish going READY → SERVED → payment | |
| 4 | A VIP or Critic behaviour | |
| 5 | A Stage 3 feature | |
| 6 | One victory and one defeat | |
| 7 | The stage tag comparisons and the diagrams | |

### Notes for anyone running this on Windows

- The `.ps1` scripts are wrapped by `.bat` files that pass `-ExecutionPolicy Bypass`,
  because PowerShell otherwise refuses to load an unsigned script.
- The scripts change into their own folder and pass only **relative** paths to `javac`.
  Windows PowerShell 5.1 mangles non-ASCII characters in absolute paths, which breaks the
  build when the project sits in a folder with a non-ASCII name.
- `start.ps1` is saved as UTF-8 **with BOM** on purpose: PowerShell 5.1 reads a BOM-less
  UTF-8 script as ANSI and then mis-parses the Chinese menu labels.

</details>

<details name="lang">
<summary><b>🇨🇳 中文</b></summary>

### 这是什么

Restaurant Rush 是一个用 Java 写的回合制餐厅经营游戏（SC2002 小组作业）。玩家扮演经理：
员工的时间极其有限，所以**先服务谁**就是整个游戏的博弈点。项目包含三个可独立运行的阶段
（各对应一个 git tag），以及一个可选的浏览器前端。

- Java 17 或更高版本。不需要 Maven、Gradle、任何外部库，也不需要联网。
- 两套界面共用同一份规则：**命令行版**（正式入口）和可选的**网页版**。

**仓库地址**

- 小组仓库：<https://github.com/DasbootU9607/SC2002-Object-Oriented-Design-and-Programming>
- 增加了网页版的分支仓库：<https://github.com/zhangxiaozhuang398-max/SC2002-Object-Oriented-Design-and-Programming>
- 可一键切换语言的文档站：<https://zhangxiaozhuang398-max.github.io/SC2002-Object-Oriented-Design-and-Programming/>

### 快速开始：一个启动器

Windows —— 双击 **`start.bat`**，或在终端里执行：

```bat
start.bat
```

macOS / Linux：

```sh
sh start.sh
```

菜单如下：

| 序号 | 功能 | 说明 |
| --- | --- | --- |
| 1 | 网页版 | 启动本地服务并自动打开浏览器 |
| 2 | 网页版布局预览 | 同上，但用脚本化的中局状态，方便截图 |
| 3 | 命令行 Stage 3 | 完整版游戏 |
| 4 | 命令行 Stage 2 | 含 VIP 与 Critic 顾客 |
| 5 | 命令行 Stage 1 | 基础版游戏 |
| 6 | 跑全部测试 | 三个阶段共 368 条断言 |

每个入口也能直接指定，写脚本时很方便：

```bat
start.bat web       :: 网页版，新开一局
start.bat preview   :: 网页版，中局状态
start.bat cli       :: 命令行 Stage 3
start.bat cli2      :: Stage 2
start.bat cli1      :: Stage 1
start.bat test      :: 跑全部测试
```

### 网页版（前端）

浏览器前端是一个额外的 boundary 对象，在 `stage-3` tag 之后追加。它**完全不包含游戏规则**：
页面只负责渲染 `GET /api/state`，并把每次点击转发到 `POST /api/action`；引擎返回什么就显示
什么——包括"为什么这一步不合法"的原始原因。

```bat
stage-3\web.bat              :: 等同 start.bat web
stage-3\web.bat --preview    :: 等同 start.bat preview
```

- 地址是 `http://127.0.0.1:8765`（被占用则自动顺延到下一个空闲端口），并自动打开浏览器。
- 用的是 JDK 自带的 `jdk.httpserver`，所以依然零依赖、完全离线，数据不出本机。
- 面板包含等待队列、两张桌子、厨房、已离店顾客；每一步操作都有对应按钮：落座 / 下单 /
  上菜 / 做菜 / 等待。
- 右上角可切换中文 / English，选择会被记住。
- `--no-browser` 只起服务不开浏览器（快速自检时用）。

### 命令行版（正式入口）

```bat
stage-3\run.bat
stage-3\run.bat --replay examples\victory.txt
stage-3\run.bat --replay examples\defeat.txt
```

把 `stage-3` 换成 `stage-1` 或 `stage-2` 即可运行早期阶段。每个阶段目录都是自包含的——
`src`、`test`、`examples`、各自的脚本和 README——可以单独编译单独跑。

macOS / Linux：`sh stage-3/run.sh`、`sh stage-3/run.sh --replay examples/victory.txt`。

不借助任何脚本，直接编译运行：

```sh
mkdir -p build/classes
javac -encoding UTF-8 --release 17 -d build/classes src/restaurantrush/*.java
java -cp build/classes restaurantrush.Main
```

### 测试

```bat
verify.bat          :: 等同 start.bat test
```

依次运行三套不依赖任何框架的测试：99 + 110 + 159 = **368 条断言**，全部通过时退出码为 0。
覆盖内容包括：作业原文的 Pasta 时间线、员工任务上限、非法输入重试、队列与桌子规则、顾客
放弃与订单取消、付款顺序、价格与满意度快照、两种结局、顾客多态行为、Host 的独立任务、
Combo 舍入、以及 Happy Hour 的持续回合与锁价。

### 目录结构

```
.
├─ start.bat / start.ps1 / start.sh     一键启动器
├─ verify.bat / verify.ps1 / verify.sh  三套测试
├─ docs/                                本 README 用到的截图
├─ stage-1/  stage-2/  stage-3/         每个阶段一份自包含快照
│    ├─ src/restaurantrush/             Java 源码
│    ├─ test/restaurantrush/            免框架测试
│    ├─ examples/                       胜利与失败的回放脚本
│    └─ 运行 / 测试脚本、README
└─ stage-3/
     ├─ src/restaurantrush/ui/          网页 boundary（服务、会话、JSON 写出）
     └─ web/                            index.html、style.css、app.js
```

### 基础设定

| 项目 | 数值 |
| --- | --- |
| 回合 | 18 回合（每局必定跑满） |
| 桌子 | 2 张 |
| 员工 | 服务生 ×1（每回合 1 个任务）、厨师 ×1（每回合 1 个准备单位）、收银员 ×1（每回合收 1 笔钱） |
| 到店 | 第 1、4、7、10、13、16 回合各来一位顾客 |
| 胜利条件 | 付款人数 ≥ 4 **且** 营收 ≥ $45.00 **且** 已付款顾客平均满意度 ≥ 60 |

| 菜品 | 价格 | 准备单位 |
| --- | --- | --- |
| Salad（沙拉） | $9.00 | 1 |
| Burger（汉堡） | $15.00 | 1 |
| Pasta（意面） | $18.00 | 2 |
| Combo（沙拉 + 意面） | $24.30 | 3 |

顾客按文档化的确定性规则自己点单。金额一律以整数分存储，并在下单瞬间锁价。平均满意度用的是
每位顾客**付款那一刻**记录的满意度。

### 三个阶段

| 目录 | Git tag | 新增内容 | 断言数 |
| --- | --- | --- | ---: |
| [stage-1](stage-1/README.md) | `stage-1` | 只有 Regular 顾客的基础游戏 | 99 |
| [stage-2](stage-2/README.md) | `stage-2` | VIP 与 Critic 顾客 | 110 |
| [stage-3](stage-3/README.md) | `stage-3` | Host、ComboMeal、Happy Hour | 159 |

阶段目录之间重复的源码是刻意为之：每个阶段都是一份独立、自包含的快照。三个 tag 都是
annotated tag，落在依次递进的提交上，所以 `git switch --detach stage-1` 看到的就是纯 Stage 1。

### Stage 1 → Stage 2

[GitHub 对比](https://github.com/DasbootU9607/SC2002-Object-Oriented-Design-and-Programming/compare/stage-1...stage-2)

新增源码：`VIPCustomer.java`、`CriticCustomer.java`。

修改源码：`GameSetup.java` 注册混合到来顺序并更新阶段横幅；`GameTests.java` 增加多态检查并
更新回放期望值。没有删除任何文件——`GameEngine`、各员工类、`ConsoleUI` 和既有的模型类都没有
改动，这正是重点：新增顾客行为不需要碰回合时序。

### Stage 2 → Stage 3

[GitHub 对比](https://github.com/DasbootU9607/SC2002-Object-Oriented-Design-and-Programming/compare/stage-2...stage-3)

新增源码：`Host.java`、`ComboMeal.java`、`HappyHourPolicy.java`。

| 修改的源码 | 原因 |
| --- | --- |
| `GameSetup.java` | 注册 Combo，并更新阶段横幅 |
| `Menu.java` | 保存 Combo 选项并实现文档化的选择规则 |
| `Customer.java` | 把满意度恢复封装起来，且不会让已离店顾客复活 |
| `GameState.java` | 把报价委托给当前生效的定价策略 |
| `GameEngine.java` | 在原有时序外补充 Host 阶段与策略钩子 |
| `ConsoleUI.java` | 收集新决策并显示欢乐时光剩余回合 |

未删除任何文件。订单生命周期、备餐、上菜、付款、释放桌子、顾客子类、整数金额与结果判定规则
均未改动。

因为每个阶段是自包含目录，GitHub 会把这两次演进显示成"新增快照"。想只看源码差异，可在本地执行：

```sh
git diff --no-index stage-1/src stage-2/src
git diff --no-index stage-2/src stage-3/src
```

（退出码为 1 只表示"发现差异"，不是构建失败。）

### 网页版作为设计证据

网页前端在 `stage-3` 之后追加，是在同一套 control 与 domain 类之上的**第二个 boundary 实现**。
加入它**没有改动任何规则类**；唯一动到既有代码的地方，是把 `GameResult` 里的三个胜利目标抽取成
具名常量，好让规则和界面从同一处读取同样的数字。这是"规则不进入 UI"的一个具体、可检查的例子。

### 可复现的运行结果

| 回放 | 付款人数 | 已上菜 | 营收 | 已付款平均满意度 | 结果 |
| --- | ---: | ---: | ---: | ---: | --- |
| Stage 1 胜利 | 5 | 5 | $66.00 | 79.20 | VICTORY |
| Stage 2 胜利 | 5 | 5 | $65.10 | 78.00 | VICTORY |
| Stage 3 胜利 | 5 | 6 | $72.78 | 85.60 | VICTORY |
| 每个阶段的失败局 | 0 | 0 | $0.00 | N/A | DEFEAT |

所有提供的回放都会跑满 18 回合。Stage 3 的胜利局在第 4 回合开启欢乐时光、让一张 VIP 订单按
促销价成交、完成一份三单位的 Combo，并且同时使用了 Host 和服务生。同一场 Stage 3 胜利通过
网页 API 重新跑一遍，得到的数字完全一致——说明网页 boundary 是被真正端到端验证过的。

### 还需提交的材料

仓库提供代码、三份可运行的阶段快照、测试证据和源码文档。小组还需要完成：最终的 UML 类图与
序列图、PDF 报告、录制的讲解视频，以及签名的原创声明与 GAI 使用声明。

视频分段（录完后把时间戳填进来）：

| # | 分段 | 时间戳 |
| --- | --- | --- |
| 1 | 从提交的项目启动游戏 | |
| 2 | 有意义的经理选择，含一次受资源限制的决策 | |
| 3 | 一道菜从 READY → SERVED → 付款 | |
| 4 | VIP 或 Critic 的行为 | |
| 5 | 一个 Stage 3 特性 | |
| 6 | 一次胜利与一次失败 | |
| 7 | 三个阶段 tag 的对比与图 | |

### 在 Windows 上运行时的三点说明

- 所有 `.ps1` 都配了 `.bat` 包装，并传入 `-ExecutionPolicy Bypass`——否则 PowerShell 会以
  "脚本未签名"为由拒绝加载。
- 脚本都会先切换到自身目录，并且只把**相对路径**传给 `javac`。Windows PowerShell 5.1 会把
  绝对路径里的非 ASCII 字符转坏，当项目位于中文目录下时构建会失败。
- `start.ps1` 刻意存成 **带 BOM 的 UTF-8**：PowerShell 5.1 会把不带 BOM 的 UTF-8 当作 ANSI
  读取，从而解析不了中文菜单标签。

</details>

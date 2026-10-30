"use strict";

/*
 * Restaurant Rush web UI.
 *
 * This file contains NO game rules. It draws whatever GET /api/state returns,
 * sends every decision back as an action request, and shows the message the
 * engine replies with. Whether a move is legal is decided in Java only.
 *
 * The page follows the console's presentation (ConsoleView): a welcome screen
 * with the menu and goals, one step per role in the engine's order
 * (Happy Hour -> Host -> Waiter -> Chef -> Cashier), the target IDs the server
 * lists for each role, an end-of-turn summary, and a closing page with every
 * guest's final status.
 *
 * Every request carries the chosen stage (1, 2 or 3); the server keeps one game per
 * stage. Stages without a Host or Happy Hour report that in `features`, and the
 * page simply leaves those steps out.
 */

const CUSTOMER_STATUS = {
  WAITING: { zh: '等位中', en: 'Waiting for table', tone: 'warn' },
  SEATED: { zh: '待点单', en: 'Needs order', tone: 'info' },
  WAITING_FOR_FOOD: { zh: '等餐中', en: 'Waiting for food', tone: 'warn' },
  EATING: { zh: '用餐中', en: 'Eating', tone: 'good' },
  READY_TO_PAY: { zh: '待付款', en: 'Ready to pay', tone: 'info' },
  PAID: { zh: '已付款', en: 'Paid', tone: 'good' },
  LEFT: { zh: '不满离店', en: 'Left unhappy', tone: 'bad' }
};

const ORDER_STATUS = {
  PLACED: { zh: '已下单', en: 'Placed', tone: 'muted' },
  PREPARING: { zh: '制作中', en: 'Preparing', tone: 'warn' },
  READY: { zh: '可上菜', en: 'Ready', tone: 'good' },
  SERVED: { zh: '已上菜', en: 'Served', tone: 'info' },
  PAID: { zh: '已付款', en: 'Paid', tone: 'good' },
  CANCELLED: { zh: '已取消', en: 'Cancelled', tone: 'bad' }
};

const CUSTOMER_TYPES = {
  Regular: { emoji: '🧑', cls: 'regular', zh: '普通顾客', en: 'Regular' },
  VIP: { emoji: '👑', cls: 'vip', zh: '贵宾', en: 'VIP' },
  Critic: { emoji: '🧐', cls: 'critic', zh: '美食评论家', en: 'Critic' }
};

const DISHES = {
  'Burger': { emoji: '🍔', zh: '汉堡' },
  'Salad': { emoji: '🥗', zh: '沙拉' },
  'Pasta': { emoji: '🍝', zh: '意面' },
  'Salad + Pasta Combo': { emoji: '🍱', zh: '沙拉 + 意面套餐' }
};

const I18N = {
  zh: {
    appTitle: '餐厅大作战',
    helpTitle: '玩法说明',
    stagePickerTitle: '选择关卡（每个关卡的进度分开保存）',
    stageShort: '关卡 {n}',
    stageChooseTitle: '选择关卡',
    stage1Desc: '基础玩法：只有普通顾客，服务员一人包办落座、点单和上菜。',
    stage2Desc: '加入贵宾和美食评论家，他们的耐心和点餐习惯各不相同。',
    stage3Desc: '再加入迎宾、套餐和欢乐时光，完整版玩法。',
    stageCurrent: '当前关卡',
    stageUnavailable: '未编译',
    stageKeepNote: '每个关卡的进度分开保存，随时可以切回来。',
    changeStage: '🎚️ 换个关卡',
    how1Basic: '每回合顺序：服务员 → 厨师 → 收银员（自动）。',
    how3Basic: '服务员用顾客编号，厨师用订单编号。',
    queueTitle: '等待队列',
    historyTitle: '已离店顾客',
    tablesTitle: '用餐区',
    kitchenTitle: '厨房',
    logTitle: '营业日志',
    turnLabel: '第 {n} / {m} 回合',
    turnLabelIdle: '尚未开门 · 共 {m} 回合',
    turnLabelDone: '营业结束 · {m} / {m} 回合',
    arrivalTick: '第 {n} 回合有新顾客到店',
    goalPaid: '已付款顾客',
    goalRevenue: '营收',
    goalSat: '已付款平均满意度',
    goalMet: '已达标',
    statsTitle: '服务统计',
    statServed: '已上菜',
    statLeft: '不满离店',
    hhTitle: '欢乐时光',
    hhActive: '进行中 · 含本回合还剩 {n} 回合',
    hhUpcoming: '已为下一回合生效',
    hhUsed: '已使用 / 已结束',
    hhAvailable: '可用 · 尚未开启',
    emptyQueue: '暂时没有人排队～',
    emptyKitchen: '厨房空空的，师傅们在休息～',
    emptyHistory: '还没有顾客离店',
    emptyLog: '开门营业后，每回合的结算会记在这里。',
    emptyTable: '空桌',
    table: '{n} 号桌',
    nextArrival: '下一位顾客：第 {n} 回合到店',
    nextArrivalNow: '本回合有新顾客到店',
    noMoreArrivals: '今天不会再有新顾客了',
    prep: '准备 {d}/{t}',
    bill: '账单 {v}',
    forGuest: '顾客 #{n}',
    // turn panel
    panelStartTitle: '经理 · 开始第 {n} 回合',
    hhIntro1: '欢乐时光每局只能开启一次，持续两个回合。',
    hhIntro2: '新订单在顾客折扣之后再打 8 折。',
    hhIntro3: '生效期间，每回合开始时等待中的顾客恢复 15 点满意度。',
    hhAlreadyActive: '欢乐时光对即将开始的回合仍然有效。',
    hhEnded: '欢乐时光已经结束，本局的开启机会已用掉。',
    activateAndStart: '☀️ 开启欢乐时光并开始',
    startTurn: '▶ 开始第 {n} 回合',
    turnEndTitle: '第 {n} 回合结算',
    noEvents: '本回合没有自动结算事件。',
    satUpdated: '等待中顾客的满意度已更新。',
    stepHost: '迎宾',
    stepWaiter: '服务员',
    stepChef: '厨师',
    stepCashier: '收银员',
    stepHostDesc: '选一项落座任务',
    stepWaiterDesc: '选一项任务：落座、点单或上菜',
    stepChefDesc: '为一个订单推进 1 个准备单位',
    stepCashierDesc: '回合结束时自动向最早可付款的顾客收款',
    stepLocked: '等前一步完成',
    seat: '落座',
    order: '点单',
    serve: '上菜',
    cook: '烹饪',
    wait: '💤 等待',
    noSeatFull: '两张桌子都满了，暂时没人能落座。',
    noSeatEmpty: '没有排队的顾客。',
    noWaiterTask: '现在没有可做的服务，可以选择等待。',
    noCook: '没有可以烹饪的订单，选择等待吧。',
    endTurn: '结束回合 · 收银结算 →',
    endTurnHint: '三个岗位都做出选择后才能结束回合',
    undo: '↶ 撤销',
    undoTitle: '撤销上一步（Ctrl+Z）',
    finishedTitle: '营业结束',
    viewResults: '🏆 查看结算',
    playAgain: '🔄 再来一局',
    // welcome
    welcomeKicker: '欢迎来到',
    welcomeLead: '你是餐厅经理：安排顾客落座、点单、做菜、上菜，赶在顾客失去耐心之前把他们服务好。',
    shiftTitle: '你的班次',
    shiftFacts: '{m} 回合 · 2 张餐桌 · 第 {arrivals} 回合各有一位顾客到店',
    winTitle: '第 {m} 回合结束时需要同时达成',
    winPaid: '至少 {n} 位顾客付款',
    winRevenue: '营收不少于 {v}',
    winSat: '已付款顾客的平均满意度不低于 {n}',
    menuTitle: '菜单',
    menuMeal: '菜品',
    menuPrice: '基础价格',
    menuUnits: '准备单位',
    guestsTitle: '顾客类型',
    guestRegular: '标准顾客，按菜单顺序点餐。',
    guestVip: '享受会员折扣，比较有耐心。',
    guestCritic: '只点意面，也最没有耐心。',
    howTitle: '怎么玩',
    how1: '每回合顺序：欢乐时光 → 迎宾 → 服务员 → 厨师 → 收银员（自动）。',
    how2: '每个岗位每回合做一件事；厨师每次推进 1 个准备单位。',
    how3: '迎宾和服务员用顾客编号，厨师用订单编号。',
    how4: '顾客自己选菜，下单时账单金额就锁定了。',
    how5: '本回合做好的菜，下一回合起才能上桌。',
    how6: '上菜后要用餐一整个回合，再下一回合付款。',
    how7: '不合法的操作会被拦下并说明原因，不会浪费这一步；随时可以撤销。',
    openRestaurant: '开始营业 🎉',
    close: '关闭',
    // results
    victory: '胜利！',
    defeat: '未达成目标',
    victoryLead: '三个目标全部达成，干得漂亮，经理！',
    defeatLead: '还有目标没有达成，换个服务顺序再试试吧。',
    finalScore: '最终成绩',
    guestSummary: '顾客总结',
    colGuest: '顾客',
    colType: '类型',
    colStatus: '最终状态',
    colMeal: '菜品',
    colBill: '账单',
    colSat: '满意度',
    summaryNote: '只有已付款的顾客计入营收和平均满意度。',
    goodbye: '感谢游玩餐厅大作战！',
    undoLast: '↶ 撤销最后一步',
    viewBoard: '查看棋盘',
    offline: '无法连接游戏服务器，请确认 web.bat / web.sh 仍在运行，然后刷新页面。',
    serverError: '无法连接游戏服务器：'
  },
  en: {
    appTitle: 'Restaurant Rush',
    helpTitle: 'How to play',
    stagePickerTitle: 'Choose a stage (each stage keeps its own game)',
    stageShort: 'Stage {n}',
    stageChooseTitle: 'Choose a stage',
    stage1Desc: 'Basic game: Regular guests only; the Waiter seats, takes orders and serves.',
    stage2Desc: 'Adds VIP and Critic guests, each with their own patience and ordering habits.',
    stage3Desc: 'Adds the Host, a combo meal and Happy Hour — the full game.',
    stageCurrent: 'Current',
    stageUnavailable: 'Not compiled',
    stageKeepNote: 'Each stage keeps its own game, so you can switch back any time.',
    changeStage: '🎚️ Change stage',
    how1Basic: 'Each turn: Waiter → Chef → Cashier (automatic).',
    how3Basic: 'Use customer IDs for the Waiter and order IDs for the Chef.',
    queueTitle: 'Waiting queue',
    historyTitle: 'Guests who left',
    tablesTitle: 'Dining area',
    kitchenTitle: 'Kitchen',
    logTitle: 'Shift log',
    turnLabel: 'Turn {n} / {m}',
    turnLabelIdle: 'Not open yet · {m} turns',
    turnLabelDone: 'Shift complete · {m} / {m}',
    arrivalTick: 'A new guest arrives on turn {n}',
    goalPaid: 'Paid guests',
    goalRevenue: 'Revenue',
    goalSat: 'Avg paid satisfaction',
    goalMet: 'Met',
    statsTitle: 'Service',
    statServed: 'Served',
    statLeft: 'Left unhappy',
    hhTitle: 'Happy Hour',
    hhActive: 'Active · {n} turn(s) left, incl. this one',
    hhUpcoming: 'Active for the upcoming turn',
    hhUsed: 'Used / expired',
    hhAvailable: 'Available · not activated',
    emptyQueue: 'Nobody is waiting~',
    emptyKitchen: 'The kitchen is quiet~',
    emptyHistory: 'No guest has left yet',
    emptyLog: 'Each turn\'s results will be recorded here once you open.',
    emptyTable: 'Free',
    table: 'Table {n}',
    nextArrival: 'Next guest arrives on turn {n}',
    nextArrivalNow: 'A new guest arrived this turn',
    noMoreArrivals: 'No more guests today',
    prep: 'Prep {d}/{t}',
    bill: 'Bill {v}',
    forGuest: 'Guest #{n}',
    panelStartTitle: 'Manager · start turn {n}',
    hhIntro1: 'Happy Hour can be activated once per game and lasts two turns.',
    hhIntro2: 'New orders get 20% off after customer discounts.',
    hhIntro3: 'Waiting guests recover 15 satisfaction at each active turn start.',
    hhAlreadyActive: 'Happy Hour is already active for this upcoming turn.',
    hhEnded: 'Happy Hour has ended. Activation has already been used.',
    activateAndStart: '☀️ Activate Happy Hour & start',
    startTurn: '▶ Start turn {n}',
    turnEndTitle: 'End of turn {n}',
    noEvents: 'No automatic service events this turn.',
    satUpdated: 'Waiting guests\' satisfaction has been updated.',
    stepHost: 'Host',
    stepWaiter: 'Waiter',
    stepChef: 'Chef',
    stepCashier: 'Cashier',
    stepHostDesc: 'Choose ONE seating task',
    stepWaiterDesc: 'Choose ONE task: seat, order or serve',
    stepChefDesc: 'Add one prep unit to an order',
    stepCashierDesc: 'Automatically collects from the earliest guest ready to pay',
    stepLocked: 'Waiting for the previous step',
    seat: 'Seat',
    order: 'Order',
    serve: 'Serve',
    cook: 'Cook',
    wait: '💤 Wait',
    noSeatFull: 'Both tables are occupied; nobody can be seated.',
    noSeatEmpty: 'Nobody is in the queue.',
    noWaiterTask: 'Nothing to do right now — choose wait.',
    noCook: 'No orders can be cooked. Choose wait.',
    endTurn: 'End turn · run the Cashier →',
    endTurnHint: 'All three roles must decide before the turn can end',
    undo: '↶ Undo',
    undoTitle: 'Step back one action (Ctrl+Z)',
    finishedTitle: 'Shift complete',
    viewResults: '🏆 View results',
    playAgain: '🔄 Play again',
    welcomeKicker: 'Welcome to',
    welcomeLead: 'You are the restaurant manager. Seat guests, take orders, prepare meals and serve them before your customers lose patience.',
    shiftTitle: 'Your shift',
    shiftFacts: '{m} turns · 2 tables · one arrival on turns {arrivals}',
    winTitle: 'Win by turn {m} — all at once',
    winPaid: 'At least {n} paid guests',
    winRevenue: 'At least {v} revenue',
    winSat: 'Average satisfaction of paid guests ≥ {n}',
    menuTitle: 'Menu',
    menuMeal: 'Meal',
    menuPrice: 'Base price',
    menuUnits: 'Prep units',
    guestsTitle: 'Guests',
    guestRegular: 'Standard guest; orders down the menu.',
    guestVip: 'Gets a member discount and is more patient.',
    guestCritic: 'Always orders Pasta and is the least patient.',
    howTitle: 'How to play',
    how1: 'Each turn: Happy Hour → Host → Waiter → Chef → Cashier (automatic).',
    how2: 'Each staff member gets one task; the Chef adds one prep unit.',
    how3: 'Use customer IDs for Host/Waiter and order IDs for the Chef.',
    how4: 'Customers choose their meals. A bill is locked when ordered.',
    how5: 'A meal cooked this turn can be served from the next turn.',
    how6: 'After serving: one full turn to eat, then payment next turn.',
    how7: 'Invalid moves are refused with the reason and cost nothing; you can always undo.',
    openRestaurant: 'Open the restaurant 🎉',
    close: 'Close',
    victory: 'Victory!',
    defeat: 'Defeat',
    victoryLead: 'All three goals reached. Great work, manager!',
    defeatLead: 'Some goals were missed. Try a different service plan next time.',
    finalScore: 'Final score',
    guestSummary: 'Guest summary',
    colGuest: 'Guest',
    colType: 'Type',
    colStatus: 'Final status',
    colMeal: 'Meal',
    colBill: 'Bill',
    colSat: 'Satisfaction',
    summaryNote: 'Only paid guests contribute to revenue and average satisfaction.',
    goodbye: 'Thank you for playing Restaurant Rush!',
    undoLast: '↶ Undo last step',
    viewBoard: 'View the board',
    offline: 'Cannot reach the game server. Make sure web.bat / web.sh is still running, then refresh.',
    serverError: 'Cannot reach the game server: '
  }
};

let lang = readLang();
let stage = readStage();
let stages = [];
let state = null;
let busy = false;
const welcomeSeen = new Set();
let lastPhase = null;
let toastTimer = 0;

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function readLang() {
  try {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl === 'zh' || fromUrl === 'en') return fromUrl;
    return localStorage.getItem('rr-lang') || 'en';
  } catch (ignored) {
    return 'en';
  }
}

/** The stage to show: ?stage=N, then the last one played, then whatever the server defaults to. */
function readStage() {
  try {
    const value = new URLSearchParams(location.search).get('stage') || localStorage.getItem('rr-stage');
    return value ? parseInt(value, 10) || null : null;
  } catch (ignored) {
    return null;
  }
}

function features() {
  return (state && state.features) || { host: true, happyHour: true };
}

function tr(key, vars) {
  let text = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll('{' + name + '}', String(value));
    }
  }
  return text;
}

function money(cents) {
  return '$' + (cents / 100).toFixed(2);
}

/** Tiny DOM builder: h('div.cls', {title: 'x'}, child, 'text', ...). */
function h(tag, attrs, ...children) {
  const [name, ...classes] = tag.split('.');
  const el = document.createElement(name || 'div');
  if (classes.length) el.className = classes.join(' ');
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'onclick') el.addEventListener('click', value);
      else if (key === 'style') el.style.cssText = value;
      else if (key === 'class') el.className += ' ' + value;
      else el.setAttribute(key, value === true ? '' : value);
    }
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.appendChild(typeof child === 'string' || typeof child === 'number'
      ? document.createTextNode(String(child)) : child);
  }
  return el;
}

function fill(id, ...children) {
  const box = document.getElementById(id);
  box.replaceChildren(...children.flat(Infinity).filter(Boolean));
  return box;
}

function typeInfo(type) {
  return CUSTOMER_TYPES[type] || CUSTOMER_TYPES.Regular;
}

function typeName(type) {
  return typeInfo(type)[lang] || type;
}

function dishName(name) {
  const dish = DISHES[name];
  return lang === 'zh' && dish ? dish.zh : name;
}

function dishEmoji(name) {
  return (DISHES[name] && DISHES[name].emoji) || '🍽️';
}

function statusPill(map, key) {
  const info = map[key] || { tone: 'muted' };
  return h('span.pill.tone-' + info.tone, null, info[lang] || key);
}

function satLevel(value) {
  const target = (state && state.targets && state.targets.satisfaction) || 60;
  return value >= target ? 'good' : (value >= target / 2 ? 'mid' : 'low');
}

function satBar(value) {
  const target = (state && state.targets && state.targets.satisfaction) || 60;
  return h('div.sat-row', null,
    h('div.sat-bar', null,
      h('div.sat-fill.' + satLevel(value), { style: 'width:' + Math.max(0, Math.min(100, value)) + '%' }),
      h('div.sat-target', { style: 'left:' + target + '%', title: String(target) })),
    h('span.sat-num', null, String(value)));
}

function progressDots(done, total) {
  const dots = [];
  for (let i = 0; i < total; i++) dots.push(h('span.seg' + (i < done ? '.on' : '')));
  return h('span.segs', { 'aria-label': done + '/' + total }, dots);
}

// ------------------------------------------------------------------
// Server
// ------------------------------------------------------------------

async function loadStages() {
  try {
    const response = await fetch('/api/stages', { cache: 'no-store' });
    const payload = await response.json();
    stages = payload.stages || [];
    const usable = (n) => stages.some((s) => s.id === n && s.available);
    if (!usable(stage)) stage = payload.default;
  } catch (error) {
    stages = [];
    if (!stage) stage = 3;
  }
}

async function load() {
  try {
    // The server renders messages and turn events in this language.
    const response = await fetch('/api/state?stage=' + stage + '&lang=' + encodeURIComponent(lang),
      { cache: 'no-store' });
    state = await response.json();
    setOffline(false);
    render();
  } catch (error) {
    setOffline(true);
  }
}

/** Switches to another stage. The server keeps one game per stage, so nothing is lost. */
async function setStage(number) {
  if (number === stage && state) return;
  stage = number;
  try { localStorage.setItem('rr-stage', String(stage)); } catch (ignored) { /* private mode */ }
  syncUrl();
  lastPhase = null;
  closeOverlay('results');
  await load();
  if (!document.getElementById('welcome').hidden) renderWelcome();
}

/** Keeps ?stage= and ?lang= in the address bar in step with the page, if they are there. */
function syncUrl() {
  const params = new URLSearchParams(location.search);
  if (!params.has('stage') && !params.has('lang')) return;
  if (params.has('stage')) params.set('stage', String(stage));
  if (params.has('lang')) params.set('lang', lang);
  history.replaceState(null, '', '?' + params.toString());
}

async function act(params) {
  if (busy) return;
  busy = true;
  document.body.classList.add('busy');
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) query.set(key, String(value));
  query.set('stage', String(stage));
  query.set('lang', lang);
  try {
    const response = await fetch('/api/action?' + query.toString(), { method: 'POST' });
    const payload = await response.json();
    state = payload.state;
    setOffline(false);
    render();
    showToast(payload.message, !payload.ok);
  } catch (error) {
    setOffline(true);
    showToast(tr('serverError') + error, true);
  } finally {
    busy = false;
    document.body.classList.remove('busy');
  }
}

function setOffline(offline) {
  const box = document.getElementById('offline');
  box.hidden = !offline;
  box.textContent = offline ? tr('offline') : '';
}

function showToast(text, isError) {
  const toast = document.getElementById('toast');
  if (!text) return;
  toast.textContent = (isError ? '⚠️ ' : '✓ ') + text;
  toast.classList.toggle('error', !!isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), isError ? 6000 : 3500);
}

// ------------------------------------------------------------------
// Render
// ------------------------------------------------------------------

function applyStaticTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = tr(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = tr(el.dataset.i18nTitle); });
  document.documentElement.lang = lang;
  document.title = tr('appTitle') + ' · Restaurant Rush';
  if (lang === 'en') document.title = 'Restaurant Rush';
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

function render() {
  if (!state) return;
  renderTop();
  renderGoals();
  renderTurnCard();
  renderTables();
  renderQueue();
  renderKitchen();
  renderHistory();
  renderLog();
  renderOverlays();
  lastPhase = state.phase;
}

function renderStageSwitch() {
  const buttons = (stages.length ? stages : [{ id: stage, name: state.stage, available: true }]).map((s) =>
    h('button.stage-btn' + (s.id === stage ? '.active' : ''), {
      type: 'button',
      title: s.available ? s.name : tr('stageUnavailable'),
      disabled: !s.available || null,
      'aria-pressed': s.id === stage ? 'true' : 'false',
      onclick: () => setStage(s.id)
    }, tr('stageShort', { n: s.id })));
  fill('stageSwitch', buttons);
}

function renderTop() {
  renderStageSwitch();
  document.getElementById('stageName').textContent = state.stage || '';
  const label = state.phase === 'NOT_STARTED' ? tr('turnLabelIdle', { m: state.maxTurns })
    : state.phase === 'FINISHED' ? tr('turnLabelDone', { m: state.maxTurns })
    : tr('turnLabel', { n: state.turn, m: state.maxTurns });
  document.getElementById('turnLabel').textContent = label;

  const arrivals = new Set((state.arrivals && state.arrivals.turns) || []);
  const completed = state.phase === 'DECIDING' ? state.turn - 1 : state.turn;
  const ticks = [];
  for (let turn = 1; turn <= state.maxTurns; turn++) {
    let cls = 'tick';
    if (turn <= completed) cls += ' done';
    if (state.phase === 'DECIDING' && turn === state.turn) cls += ' current';
    if (arrivals.has(turn)) cls += ' arrival';
    ticks.push(h('span', { class: cls, title: arrivals.has(turn) ? tr('arrivalTick', { n: turn }) : String(turn) }));
  }
  fill('turnTicks', ticks);
}

function goalCard(icon, label, valueText, targetText, ratio, met) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return h('div.goal' + (met ? '.met' : ''), null,
    h('div.goal-head', null,
      h('span.goal-icon', null, icon),
      h('span.goal-label', null, label),
      met ? h('span.goal-check', null, '✓ ' + tr('goalMet')) : null),
    h('div.goal-value', null, valueText, h('span.goal-target', null, ' / ' + targetText)),
    h('div.goal-bar', null, h('div.goal-fill', { style: 'width:' + pct + '%' })));
}

function renderGoals() {
  const t = state.targets;
  const avg = state.averageSatisfaction;
  const avgNum = avg === 'N/A' ? 0 : parseFloat(avg);
  const hh = state.happyHour;
  let hhText;
  if (hh.active) hhText = state.phase === 'DECIDING' ? tr('hhActive', { n: hh.remaining }) : tr('hhUpcoming');
  else hhText = hh.used ? tr('hhUsed') : tr('hhAvailable');

  fill('goals',
    goalCard('✅', tr('goalPaid'), String(state.paidCount), String(t.paid),
      state.paidCount / t.paid, state.paidCount >= t.paid),
    goalCard('💰', tr('goalRevenue'), money(state.revenueCents), money(t.revenueCents),
      state.revenueCents / t.revenueCents, state.revenueCents >= t.revenueCents),
    goalCard('💚', tr('goalSat'), avg, String(t.satisfaction),
      avgNum / t.satisfaction, state.paidCount > 0 && avgNum >= t.satisfaction),
    h('div.goal.stats', null,
      h('div.goal-head', null, h('span.goal-icon', null, '📊'), h('span.goal-label', null, tr('statsTitle'))),
      h('div.stat-pair', null,
        h('div', null, h('b', null, String(state.servedCount)), h('span', null, tr('statServed'))),
        h('div' + (state.unhappyDepartures > 0 ? '.bad' : ''), null,
          h('b', null, String(state.unhappyDepartures)), h('span', null, tr('statLeft'))))),
    features().happyHour ? h('div.goal.hh' + (hh.active ? '.on' : '') + (hh.used && !hh.active ? '.spent' : ''), null,
      h('div.goal-head', null, h('span.goal-icon', null, '☀️'), h('span.goal-label', null, tr('hhTitle'))),
      h('div.hh-text', null, hhText)) : null);
}

// ---------- customers ----------

function avatar(type, size) {
  const info = typeInfo(type);
  return h('div.avatar.' + info.cls + (size ? '.' + size : ''), { 'aria-hidden': 'true' }, info.emoji);
}

function orderLine(order) {
  if (!order) return null;
  return h('div.order-line', null,
    h('span.dish', null, dishEmoji(order.name) + ' ' + dishName(order.name)),
    order.status === 'PLACED' || order.status === 'PREPARING' || order.status === 'READY'
      ? progressDots(order.done, order.total) : null,
    statusPill(ORDER_STATUS, order.status),
    h('span.price', null, money(order.priceCents)));
}

function customerCard(customer, options) {
  const opts = options || {};
  return h('div.customer-card' + (opts.compact ? '.compact' : ''), null,
    avatar(customer.type),
    h('div.customer-info', null,
      h('div.customer-top', null,
        h('span.customer-id', null, '#' + customer.id),
        h('span.customer-type', null, typeName(customer.type)),
        statusPill(CUSTOMER_STATUS, customer.status)),
      satBar(customer.satisfaction),
      opts.withOrder ? orderLine(customer.order) : null));
}

function renderTables() {
  const cards = state.tables.map((table) => {
    if (!table.customer) {
      return h('div.table-card.free', null,
        h('div.table-number', null, tr('table', { n: table.id })),
        h('div.empty-table', null, h('span.chair', null, '🪑'), h('span', null, tr('emptyTable'))));
    }
    return h('div.table-card.busy', null,
      h('div.table-number', null, tr('table', { n: table.id })),
      customerCard(table.customer, { withOrder: true }));
  });
  fill('tableList', cards);
}

function renderQueue() {
  document.getElementById('queueCount').textContent = state.waiting.length ? String(state.waiting.length) : '';
  fill('queueList', state.waiting.length === 0
    ? h('p.empty-note', null, tr('emptyQueue'))
    : state.waiting.map((customer) => customerCard(customer)));

  const next = state.arrivals ? state.arrivals.next : 0;
  let note;
  if (state.phase === 'FINISHED' || !next) note = tr('noMoreArrivals');
  else if (state.phase === 'DECIDING' && next === state.turn) note = tr('nextArrivalNow');
  else note = tr('nextArrival', { n: next });
  document.getElementById('arrivalNote').textContent = '🔔 ' + note;
}

function renderKitchen() {
  document.getElementById('kitchenCount').textContent = state.kitchen.length ? String(state.kitchen.length) : '';
  fill('orderList', state.kitchen.length === 0
    ? h('p.empty-note', null, tr('emptyKitchen'))
    : state.kitchen.map((order) => h('div.order-card.' + order.status.toLowerCase(), null,
        h('div.order-emoji', { 'aria-hidden': 'true' }, dishEmoji(order.name)),
        h('div.order-main', null,
          h('div.order-title', null, h('b', null, '#' + order.id + ' ' + dishName(order.name)),
            h('span.order-guest', null, tr('forGuest', { n: order.customerId }))),
          h('div.order-meta', null, progressDots(order.done, order.total),
            h('span', null, tr('prep', { d: order.done, t: order.total })),
            statusPill(ORDER_STATUS, order.status))),
        h('div.order-price', null, money(order.priceCents)))));
}

function renderHistory() {
  fill('historyList', state.history.length === 0
    ? h('p.empty-note', null, tr('emptyHistory'))
    : state.history.map((customer) => customerCard(customer, { withOrder: true, compact: true })));
}

function renderLog() {
  const log = state.log || [];
  if (log.length === 0) {
    fill('logList', h('p.empty-note', null, tr('emptyLog')));
    return;
  }
  const items = log.slice().reverse().map((record) => h('div.log-turn', null,
    h('div.log-head', null, tr('turnEndTitle', { n: record.turn }), record.happyHour ? h('span.log-hh', null, '☀️') : null),
    record.events.length === 0
      ? h('div.log-event.muted', null, tr('noEvents'))
      : record.events.map((event) => h('div.log-event', null, eventIcon(event) + ' ' + event))));
  fill('logList', items);
}

/** Purely decorative: picks an icon by the shape of the (already localised) sentence. */
function eventIcon(text) {
  if (/\$\d/.test(text)) return '💰';
  if (/离店|left unhappy/i.test(text)) return '😠';
  return '🍽️';
}

// ---------- turn panel ----------

function pill(label, onClick, opts) {
  const o = opts || {};
  return h('button.pill-btn' + (o.cls ? '.' + o.cls : ''), {
    type: 'button', onclick: onClick, disabled: !!o.disabled || null, title: o.title || null
  }, label);
}

function undoButton() {
  return h('button.ghost-btn', {
    type: 'button', title: tr('undoTitle'), disabled: !state.canUndo || null,
    onclick: () => act({ type: 'undo' })
  }, tr('undo'));
}

function renderTurnCard() {
  const card = document.getElementById('turnCard');
  if (state.phase === 'FINISHED') {
    card.replaceChildren(
      h('div.turn-head', null, h('h2', null, '🏁 ' + tr('finishedTitle')), undoButton()),
      h('div.finished-box', null,
        h('div.result-line', null, state.result || ''),
        h('div.start-buttons', null,
          pill(tr('viewResults'), () => openOverlay('results'), { cls: 'primary' }),
          pill(tr('playAgain'), () => act({ type: 'reset' })))));
    return;
  }
  if (state.phase === 'NOT_STARTED' || state.phase === 'BETWEEN_TURNS') {
    card.replaceChildren(...startPanel());
    return;
  }
  card.replaceChildren(...decidingPanel());
}

function startPanel() {
  const nodes = [h('div.turn-head', null, h('h2', null, '🧑‍💼 ' + tr('panelStartTitle', { n: state.turn + 1 })), undoButton())];

  if (state.phase === 'BETWEEN_TURNS') {
    const events = state.events || [];
    nodes.push(h('div.summary', null,
      h('div.summary-title', null, '🧾 ' + tr('turnEndTitle', { n: state.turn })),
      events.length === 0 ? h('div.summary-row.muted', null, tr('noEvents'))
        : events.map((event) => h('div.summary-row', null, eventIcon(event) + ' ' + event)),
      h('div.summary-row.muted', null, '⏳ ' + tr('satUpdated'))));
  }

  const hh = state.happyHour;
  const withHappyHour = features().happyHour;
  if (withHappyHour) {
    const info = [];
    if (!hh.used) info.push(tr('hhIntro1'), tr('hhIntro2'), tr('hhIntro3'));
    else if (hh.active) info.push(tr('hhAlreadyActive'));
    else info.push(tr('hhEnded'));
    nodes.push(h('div.hh-box' + (hh.active ? '.on' : ''), null,
      h('div.hh-box-title', null, '☀️ ' + tr('hhTitle')),
      info.map((line) => h('div.hh-line', null, line))));
  }

  nodes.push(h('div.start-buttons', null,
    !withHappyHour || hh.used ? null
      : pill(tr('activateAndStart'), () => act({ type: 'start', on: true }), { cls: 'sun' }),
    pill(tr('startTurn', { n: state.turn + 1 }), () => act({ type: 'start', on: false }), { cls: 'primary' })));
  return nodes;
}

function decidingPanel() {
  const a = state.assignments;
  const withHost = features().host;
  // The engine's order; a stage without a Host simply starts at the Waiter.
  const roles = [
    withHost ? ['host', '🛎️', tr('stepHost'), tr('stepHostDesc'), hostBody] : null,
    ['waiter', '🧑‍🍳', tr('stepWaiter'), tr('stepWaiterDesc'), waiterBody],
    ['chef', '🍳', tr('stepChef'), tr('stepChefDesc'), chefBody]
  ].filter(Boolean);
  const pending = roles.find(([key]) => !a[key]);
  const active = pending ? pending[0] : 'end';
  const ready = active === 'end';
  return [
    h('div.turn-head', null, h('h2', null, '🗓️ ' + tr('turnLabel', { n: state.turn, m: state.maxTurns })), undoButton()),
    h('ol.steps', null,
      roles.map(([key, icon, title, desc, body], index) =>
        step(key, index + 1, icon, title, desc, a[key], active, body)),
      h('li.step.cashier' + (ready ? '.active' : '.locked'), null,
        h('div.step-head', null, h('span.step-num', null, String(roles.length + 1)), h('span.step-icon', null, '💵'),
          h('div', null, h('div.step-title', null, tr('stepCashier')), h('div.step-desc', null, tr('stepCashierDesc')))),
        h('div.step-body', null,
          h('button.end-turn' + (ready ? '.ready' : ''), {
            type: 'button', disabled: !ready || null, title: ready ? null : tr('endTurnHint'),
            onclick: () => act({ type: 'finish' })
          }, tr('endTurn')))))
  ];
}

function step(key, number, icon, title, desc, done, active, body) {
  const isActive = active === key;
  const cls = done ? '.done' : isActive ? '.active' : '.locked';
  const message = state.roleMessages && state.roleMessages[key];
  return h('li.step' + cls, null,
    h('div.step-head', null,
      h('span.step-num', null, done ? '✓' : String(number)),
      h('span.step-icon', null, icon),
      h('div', null, h('div.step-title', null, title), h('div.step-desc', null, desc))),
    done ? h('div.step-result', null, message || '')
      : isActive ? h('div.step-body', null, body())
      : h('div.step-wait', null, tr('stepLocked')));
}

function customerById(id) {
  return (state.customers || []).find((c) => c.id === id);
}

function targetButton(verb, id, onClick) {
  const customer = customerById(id);
  const icon = customer ? typeInfo(customer.type).emoji : '';
  return pill(verb + ' ' + icon + ' #' + id, onClick);
}

function group(label, buttons) {
  if (buttons.length === 0) return null;
  return h('div.btn-group', null, h('span.group-label', null, label), h('div.btn-row', null, buttons));
}

function hostBody() {
  const t = state.targetsNow;
  const seat = t.seat.map((id) => targetButton(tr('seat'), id, () => act({ type: 'host', task: 'seat', id })));
  return [
    seat.length ? group('🪑 ' + tr('seat'), seat)
      : h('div.step-note', null, state.waiting.length ? tr('noSeatFull') : tr('noSeatEmpty')),
    h('div.btn-row', null, pill(tr('wait'), () => act({ type: 'host', task: 'wait' }), { cls: 'quiet' }))
  ];
}

function waiterBody() {
  const t = state.targetsNow;
  const groups = [
    group('🪑 ' + tr('seat'), t.seat.map((id) => targetButton(tr('seat'), id, () => act({ type: 'waiter', task: 'seat', id })))),
    group('📝 ' + tr('order'), t.order.map((id) => targetButton(tr('order'), id, () => act({ type: 'waiter', task: 'order', id })))),
    group('🍽️ ' + tr('serve'), t.serve.map((id) => targetButton(tr('serve'), id, () => act({ type: 'waiter', task: 'serve', id }))))
  ].filter(Boolean);
  return [
    groups.length ? groups : h('div.step-note', null, tr('noWaiterTask')),
    h('div.btn-row', null, pill(tr('wait'), () => act({ type: 'waiter', task: 'wait' }), { cls: 'quiet' }))
  ];
}

function chefBody() {
  const t = state.targetsNow;
  const orders = state.orders || [];
  const cook = t.cook.map((id) => {
    const order = orders.find((o) => o.id === id);
    const label = order
      ? tr('cook') + ' #' + id + ' ' + dishEmoji(order.name) + ' ' + dishName(order.name) + ' (' + order.done + '/' + order.total + ')'
      : tr('cook') + ' #' + id;
    return pill(label, () => act({ type: 'chef', task: 'cook', id }));
  });
  return [
    cook.length ? group('🍳 ' + tr('cook'), cook) : h('div.step-note', null, tr('noCook')),
    h('div.btn-row', null, pill(tr('wait'), () => act({ type: 'chef', task: 'wait' }), { cls: 'quiet' }))
  ];
}

// ---------- overlays ----------

function openOverlay(id) {
  if (id === 'welcome') renderWelcome();
  if (id === 'results') renderResults();
  const box = document.getElementById(id);
  box.hidden = false;
  box.scrollTop = 0;
  requestAnimationFrame(() => box.classList.add('open'));
  const focusable = box.querySelector('button.primary') || box.querySelector('button');
  // Without preventScroll a long dialog would jump to its bottom button.
  if (focusable) focusable.focus({ preventScroll: true });
}

function closeOverlay(id) {
  const box = document.getElementById(id);
  box.classList.remove('open');
  box.hidden = true;
  if (id === 'welcome') welcomeSeen.add(stage);
}

function renderOverlays() {
  if (state.phase === 'NOT_STARTED' && !welcomeSeen.has(stage) && document.getElementById('welcome').hidden) {
    openOverlay('welcome');
  } else if (!document.getElementById('welcome').hidden) {
    renderWelcome();
  }
  if (state.phase === 'FINISHED' && lastPhase && lastPhase !== 'FINISHED') {
    openOverlay('results');
  } else if (state.phase !== 'FINISHED') {
    closeOverlay('results');
  } else if (!document.getElementById('results').hidden) {
    renderResults();
  }
}

function renderWelcome() {
  const t = state.targets;
  const arrivals = ((state.arrivals && state.arrivals.turns) || []).join(lang === 'zh' ? '、' : ', ');
  const menuRows = (state.menu || []).map((item) => h('tr', null,
    h('td', null, dishEmoji(item.name) + ' ' + dishName(item.name)),
    h('td.num', null, money(item.priceCents)),
    h('td.num', null, progressDots(item.units, item.units), ' ' + item.units)));
  const guestTypes = state.customerTypes && state.customerTypes.length ? state.customerTypes : ['Regular'];
  const howKeys = features().host
    ? ['how1', 'how2', 'how3', 'how4', 'how5', 'how6', 'how7']
    : ['how1Basic', 'how2', 'how3Basic', 'how4', 'how5', 'how6', 'how7'];

  fill('welcomeBody',
    h('button.close-x', { type: 'button', 'aria-label': tr('close'), onclick: () => closeOverlay('welcome') }, '×'),
    h('div.hero', null,
      h('div.hero-emoji', { 'aria-hidden': 'true' }, '🍝🍔🥗'),
      h('div.hero-kicker', null, tr('welcomeKicker')),
      h('h1', { id: 'welcomeTitle' }, tr('appTitle')),
      h('div.hero-stage', null, state.stage || ''),
      h('p.hero-lead', null, tr('welcomeLead'))),
    stagePicker(),
    h('div.welcome-grid', null,
      h('section.panel', null,
        h('h3', null, '🗓️ ' + tr('shiftTitle')),
        h('p.muted', null, tr('shiftFacts', { m: state.maxTurns, arrivals })),
        h('div.win-title', null, '🏆 ' + tr('winTitle', { m: state.maxTurns })),
        h('ul.win-list', null,
          h('li', null, '✅ ' + tr('winPaid', { n: t.paid })),
          h('li', null, '💰 ' + tr('winRevenue', { v: money(t.revenueCents) })),
          h('li', null, '💚 ' + tr('winSat', { n: t.satisfaction })))),
      h('section.panel', null,
        h('h3', null, '📋 ' + tr('menuTitle')),
        h('table.menu-table', null,
          h('thead', null, h('tr', null, h('th', null, tr('menuMeal')), h('th.num', null, tr('menuPrice')), h('th.num', null, tr('menuUnits')))),
          h('tbody', null, menuRows))),
      h('section.panel', null,
        h('h3', null, '👥 ' + tr('guestsTitle')),
        h('ul.guest-types', null,
          guestTypes.map((type) => h('li', null, avatar(type, 'sm'),
            h('div', null, h('b', null, typeName(type)),
              h('div.muted', null, tr(type === 'VIP' ? 'guestVip' : type === 'Critic' ? 'guestCritic' : 'guestRegular'))))))),
      h('section.panel', null,
        h('h3', null, '🎮 ' + tr('howTitle')),
        h('ol.how-list', null, howKeys.map((key) => h('li', null, tr(key)))))),
    h('div.dialog-actions', null,
      pill(tr('openRestaurant'), () => closeOverlay('welcome'), { cls: 'primary big' })));
}

/** Three cards, one per stage; picking one switches the game behind the welcome page. */
function stagePicker() {
  if (stages.length === 0) return null;
  return h('section.panel.stage-picker', null,
    h('h3', null, '🎚️ ' + tr('stageChooseTitle')),
    h('div.stage-cards', null, stages.map((s) => h('button.stage-card' + (s.id === stage ? '.active' : ''), {
      type: 'button',
      disabled: !s.available || null,
      'aria-pressed': s.id === stage ? 'true' : 'false',
      onclick: () => setStage(s.id)
    },
      h('div.stage-card-head', null,
        h('b', null, tr('stageShort', { n: s.id })),
        s.id === stage ? h('span.pill.tone-good', null, tr('stageCurrent'))
          : !s.available ? h('span.pill.tone-muted', null, tr('stageUnavailable')) : null),
      h('div.stage-card-desc', null, tr('stage' + s.id + 'Desc'))))),
    h('p.muted.small', null, tr('stageKeepNote')));
}

function renderResults() {
  if (state.phase !== 'FINISHED') return;
  const won = typeof state.result === 'string' && state.result.indexOf('VICTORY') === 0;
  const t = state.targets;
  const avg = state.averageSatisfaction;
  const avgNum = avg === 'N/A' ? 0 : parseFloat(avg);
  const checks = [
    ['✅', tr('goalPaid'), state.paidCount + ' / ' + t.paid, state.paidCount >= t.paid],
    ['💰', tr('goalRevenue'), money(state.revenueCents) + ' / ' + money(t.revenueCents), state.revenueCents >= t.revenueCents],
    ['💚', tr('goalSat'), avg + ' / ' + t.satisfaction, state.paidCount > 0 && avgNum >= t.satisfaction]
  ];
  const rows = (state.customers || []).map((c) => h('tr', null,
    h('td', null, h('span.cell-guest', null, avatar(c.type, 'xs'), '#' + c.id)),
    h('td', null, typeName(c.type)),
    h('td', null, statusPill(CUSTOMER_STATUS, c.status)),
    h('td', null, c.order ? dishEmoji(c.order.name) + ' ' + dishName(c.order.name) : '—'),
    h('td.num', null, c.order ? money(c.order.priceCents) : '—'),
    h('td.num', null, h('span.sat-chip.' + satLevel(c.satisfaction), null, String(c.satisfaction)))));

  fill('resultsBody',
    h('button.close-x', { type: 'button', 'aria-label': tr('close'), onclick: () => closeOverlay('results') }, '×'),
    h('div.hero' + (won ? '.won' : '.lost'), null,
      h('div.hero-emoji', { 'aria-hidden': 'true' }, won ? '🎉🏆🎉' : '🌧️🍽️🌧️'),
      h('h1', { id: 'resultsTitle' }, won ? tr('victory') : tr('defeat')),
      h('p.hero-lead', null, won ? tr('victoryLead') : tr('defeatLead'))),
    h('section.panel', null,
      h('h3', null, '🏁 ' + tr('finalScore')),
      h('div.check-grid', null, checks.map(([icon, label, value, met]) =>
        h('div.check' + (met ? '.met' : '.miss'), null,
          h('span.check-mark', null, met ? '✓' : '✗'),
          h('div', null, h('div.check-label', null, icon + ' ' + label), h('div.check-value', null, value))))),
      h('div.stat-line.muted', null,
        tr('statServed') + ' ' + state.servedCount + ' · ' + tr('statLeft') + ' ' + state.unhappyDepartures)),
    h('section.panel', null,
      h('h3', null, '👥 ' + tr('guestSummary')),
      h('div.table-scroll', null,
        h('table.summary-table', null,
          h('thead', null, h('tr', null,
            h('th', null, tr('colGuest')), h('th', null, tr('colType')), h('th', null, tr('colStatus')),
            h('th', null, tr('colMeal')), h('th.num', null, tr('colBill')), h('th.num', null, tr('colSat')))),
          h('tbody', null, rows))),
      h('p.muted.small', null, tr('summaryNote'))),
    h('p.goodbye', null, '👋 ' + tr('goodbye')),
    h('div.dialog-actions', null,
      pill(tr('playAgain'), () => act({ type: 'reset' }), { cls: 'primary big' }),
      pill(tr('undoLast'), () => act({ type: 'undo' })),
      stages.length > 1 ? pill(tr('changeStage'), () => { closeOverlay('results'); openOverlay('welcome'); }) : null,
      pill(tr('viewBoard'), () => closeOverlay('results'), { cls: 'quiet' })));
}

// ------------------------------------------------------------------
// Boot
// ------------------------------------------------------------------

document.getElementById('helpBtn').addEventListener('click', () => { if (state) openOverlay('welcome'); });

document.querySelectorAll('.overlay').forEach((overlay) => {
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeOverlay(overlay.id);
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.overlay').forEach((overlay) => { if (!overlay.hidden) closeOverlay(overlay.id); });
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && state && state.canUndo) {
    event.preventDefault();
    act({ type: 'undo' });
  }
});

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    lang = btn.dataset.lang;
    try { localStorage.setItem('rr-lang', lang); } catch (ignored) { /* private mode */ }
    syncUrl();
    applyStaticTexts();
    render();
    // Re-fetch so the last message, turn events and log come back in the new language.
    load();
  });
});

document.addEventListener('DOMContentLoaded', async () => {
  applyStaticTexts();
  await loadStages();
  await load();
});

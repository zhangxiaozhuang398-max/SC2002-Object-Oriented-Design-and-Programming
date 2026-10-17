"use strict";

/*
 * P2 scope: fully playable web UI.
 *
 * This file contains NO game rules. It draws whatever GET /api/state returns,
 * sends every decision back as an action request, and shows the message the
 * engine replies with. Whether a move is legal is decided in Java only; the
 * buttons below are generated from the lists the server provides (who is in
 * the queue, who is seated, which orders are in the kitchen).
 */

const CUSTOMER_STATUS = {
  WAITING: { zh: '排队中', en: 'Waiting' },
  SEATED: { zh: '已落座', en: 'Seated' },
  WAITING_FOR_FOOD: { zh: '等餐中', en: 'Waiting for food' },
  EATING: { zh: '用餐中', en: 'Eating' },
  READY_TO_PAY: { zh: '待付款', en: 'Ready to pay' },
  PAID: { zh: '已付款', en: 'Paid' },
  LEFT: { zh: '已离店', en: 'Left' }
};

const ORDER_STATUS = {
  PLACED: { zh: '已下单', en: 'Placed' },
  PREPARING: { zh: '制作中', en: 'Preparing' },
  READY: { zh: '可上菜', en: 'Ready' },
  SERVED: { zh: '已上菜', en: 'Served' },
  PAID: { zh: '已付款', en: 'Paid' },
  CANCELLED: { zh: '已取消', en: 'Cancelled' }
};

const I18N = {
  zh: {
    appTitle: '餐厅大作战',
    queueTitle: '等待队列',
    historyTitle: '已离店顾客',
    tablesTitle: '用餐区',
    kitchenTitle: '厨房',
    turn: '📅 第 {n} / {m} 天',
    revenue: '💰 营收 {v}',
    paid: '✅ 已付款 {n}',
    served: '🍽️ 已上菜 {n}',
    satisfaction: '💚 平均满意度 {v}',
    happyHour: '🌞 欢乐时光',
    happyHourOff: '未开启',
    happyHourRemaining: '剩 {n} 回合',
    emptyQueue: '暂时没有人排队～',
    emptyKitchen: '厨房空空的，师傅们在休息～',
    emptyHistory: '还没有顾客离店',
    emptyTable: '空桌',
    table: '{n} 号桌',
    phaseNotStarted: '欢迎光临！从第 1 天开始营业吧～',
    phaseBetweenTurns: '第 {n} 天打烊啦',
    phaseFinished: '游戏结束',
    endTurn: '结束本回合',
    startDay: '▶️ 开始第 {n} 天',
    activateHappyHour: '☀️ 开启欢乐时光',
    activateHappyHourUsed: '☀️ 欢乐时光已用掉啦',
    resetGame: '🔄 再来一局',
    host: '迎宾',
    waiter: '服务员',
    chef: '厨师',
    seat: '🪑 落座',
    order: '📝 下单',
    serve: '🍽️ 上菜',
    cook: '🍳 做',
    wait: '💤 等待',
    hint: '点一个按钮就是做一次决定；不合法的操作会被拦下并告诉你原因。三个岗位都决定好之后，结束本回合。'
  },
  en: {
    appTitle: 'Restaurant Rush',
    queueTitle: 'Waiting queue',
    historyTitle: 'Customers who left',
    tablesTitle: 'Dining area',
    kitchenTitle: 'Kitchen',
    turn: '📅 Day {n} / {m}',
    revenue: '💰 Revenue {v}',
    paid: '✅ Paid {n}',
    served: '🍽️ Served {n}',
    satisfaction: '💚 Avg satisfaction {v}',
    happyHour: '🌞 Happy Hour',
    happyHourOff: 'off',
    happyHourRemaining: '{n} turn(s) left',
    emptyQueue: 'Nobody is waiting~',
    emptyKitchen: 'Kitchen is quiet, chefs are resting~',
    emptyHistory: 'No one has left yet',
    emptyTable: 'Free',
    table: 'Table {n}',
    phaseNotStarted: 'Welcome! Open up for day 1~',
    phaseBetweenTurns: 'Day {n} is over',
    phaseFinished: 'Game over',
    endTurn: 'End turn',
    startDay: '▶️ Start day {n}',
    activateHappyHour: '☀️ Activate Happy Hour',
    activateHappyHourUsed: '☀️ Happy Hour used up',
    resetGame: '🔄 Play again',
    host: 'Host',
    waiter: 'Waiter',
    chef: 'Chef',
    seat: '🪑 Seat',
    order: '📝 Order',
    serve: '🍽️ Serve',
    cook: '🍳 Cook',
    wait: '💤 Wait',
    hint: 'Each click is one decision; illegal moves are rejected with the reason. End the turn once all three staff have decided.'
  }
};

const AVATARS = {
  Regular: { emoji: '🧑‍💼', cls: '' },
  VIP: { emoji: '👑', cls: 'vip' },
  Critic: { emoji: '🧐', cls: 'critic' }
};

let lang = localStorage.getItem('rr-lang') || 'zh';
let state = null;

function tr(key, vars) {
  let text = (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll('{' + name + '}', String(value));
    }
  }
  return text;
}

function statusText(map, key) {
  return map[key] ? map[key][lang] : key;
}

function money(cents) {
  return '$' + (cents / 100).toFixed(2);
}

function applyStaticTexts() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = tr(el.dataset.i18n);
  });
  document.documentElement.lang = lang;
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
}

async function load() {
  try {
    const response = await fetch('/api/state');
    state = await response.json();
    render();
  } catch (error) {
    showToast('Cannot reach the game server: ' + error, true);
  }
}

async function act(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    query.set(key, String(value));
  }
  try {
    const response = await fetch('/api/action?' + query.toString(), { method: 'POST' });
    const payload = await response.json();
    state = payload.state;
    render();
    showToast(payload.message, !payload.ok);
  } catch (error) {
    showToast('Cannot reach the game server: ' + error, true);
  }
}

function showToast(text, isError) {
  const toast = document.getElementById('toast');
  toast.textContent = text || '';
  toast.classList.toggle('error', !!isError);
}

function render() {
  if (!state) return;
  renderTop();
  renderPhaseBanner();
  renderQueue();
  renderTables();
  renderKitchen();
  renderHistory();
  renderActions();
}

// ------------------------------------------------------------------
// Panels
// ------------------------------------------------------------------

function renderTop() {
  const targets = state.targets || {};
  document.getElementById('chipTurn').textContent = tr('turn', { n: state.turn, m: state.maxTurns });
  document.getElementById('chipRevenue').textContent = tr('revenue', {
    v: money(state.revenueCents) + targetSuffix(money(targets.revenueCents))
  });
  document.getElementById('chipPaid').textContent = tr('paid', {
    n: state.paidCount + targetSuffix(targets.paid)
  });
  document.getElementById('chipSat').textContent = tr('satisfaction', {
    v: state.averageSatisfaction + targetSuffix(targets.satisfaction)
  });
  const hh = state.happyHour;
  const hhText = hh.remaining > 0 ? tr('happyHourRemaining', { n: hh.remaining }) : tr('happyHourOff');
  document.getElementById('chipHappyHour').textContent = tr('happyHour') + '：' + hhText;
}

function targetSuffix(value) {
  return value == null || value === '' ? '' : ' / ' + value;
}

function renderPhaseBanner() {
  const banner = document.getElementById('phaseBanner');
  banner.classList.remove('done', 'lost');
  if (state.phase === 'FINISHED') {
    const won = typeof state.result === 'string' && state.result.indexOf('VICTORY') === 0;
    banner.textContent = (won ? '🎉 ' : '😢 ') + (state.result || tr('phaseFinished'));
    banner.classList.add(won ? 'done' : 'lost');
  } else if (state.phase === 'NOT_STARTED') {
    banner.textContent = tr('phaseNotStarted');
  } else if (state.phase === 'BETWEEN_TURNS') {
    banner.textContent = tr('phaseBetweenTurns', { n: state.turn });
  } else {
    banner.textContent = '';
  }
}

function customerCard(customer) {
  const wrap = document.createElement('div');
  wrap.className = 'customer-card';
  const avatar = AVATARS[customer.type] || AVATARS.Regular;
  const level = customer.satisfaction >= 60 ? 'good' : (customer.satisfaction >= 30 ? 'mid' : 'low');
  wrap.innerHTML =
    '<div class="avatar ' + avatar.cls + '">' + avatar.emoji + '</div>' +
    '<div class="customer-info">' +
      '<div class="customer-name">C' + customer.id + ' · ' + customer.type + '</div>' +
      '<div class="customer-status">' + statusText(CUSTOMER_STATUS, customer.status) + '</div>' +
      '<div class="sat-row">' +
        '<div class="sat-bar"><div class="sat-fill ' + level + '" style="width:' + customer.satisfaction + '%"></div></div>' +
        '<span class="sat-num">' + customer.satisfaction + '</span>' +
      '</div>' +
    '</div>';
  return wrap;
}

function renderQueue() {
  const box = document.getElementById('queueList');
  box.innerHTML = '';
  if (state.waiting.length === 0) {
    box.innerHTML = '<p class="empty-note">' + tr('emptyQueue') + '</p>';
    return;
  }
  for (const customer of state.waiting) box.appendChild(customerCard(customer));
}

function renderTables() {
  const box = document.getElementById('tableList');
  box.innerHTML = '';
  for (const table of state.tables) {
    const card = document.createElement('div');
    card.className = 'table-card' + (table.customer ? ' busy' : '');
    if (table.customer) {
      card.innerHTML = '<div class="table-number">' + tr('table', { n: table.id }) + '</div>';
      card.appendChild(customerCard(table.customer));
    } else {
      card.innerHTML =
        '<div class="table-number">' + tr('table', { n: table.id }) + '</div>' +
        '<div class="empty-table"><span class="chair">🪑</span><span>' + tr('emptyTable') + '</span></div>';
    }
    box.appendChild(card);
  }
}

function renderKitchen() {
  const box = document.getElementById('orderList');
  box.innerHTML = '';
  if (state.kitchen.length === 0) {
    box.innerHTML = '<p class="empty-note">' + tr('emptyKitchen') + '</p>';
    return;
  }
  for (const order of state.kitchen) {
    const row = document.createElement('div');
    row.className = 'order-row';
    let dots = '';
    for (let i = 0; i < order.total; i++) {
      dots += '<span class="' + (i < order.done ? 'done-dot' : 'pending-dot') + '">●</span>';
    }
    row.innerHTML =
      '<div class="order-name">#' + order.id + ' ' + order.name + '</div>' +
      '<div class="dots">' + dots + '</div>' +
      '<div class="order-status">' + statusText(ORDER_STATUS, order.status) + '</div>' +
      '<div class="order-price">' + money(order.priceCents) + '</div>';
    box.appendChild(row);
  }
}

function renderHistory() {
  const box = document.getElementById('historyList');
  box.innerHTML = '';
  if (state.history.length === 0) {
    box.innerHTML = '<p class="empty-note">' + tr('emptyHistory') + '</p>';
    return;
  }
  for (const customer of state.history) box.appendChild(customerCard(customer));
}

// ------------------------------------------------------------------
// Action bar
// ------------------------------------------------------------------

function pill(label, onClick, disabled) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pill-btn';
  button.textContent = label;
  button.disabled = !!disabled;
  button.addEventListener('click', onClick);
  return button;
}

function actionRow(label, buttons, assigned) {
  const row = document.createElement('div');
  row.className = 'action-row' + (assigned ? ' assigned' : '');
  const caption = document.createElement('span');
  caption.className = 'action-label';
  caption.textContent = (assigned ? '✓ ' : '') + label;
  row.appendChild(caption);
  for (const button of buttons) row.appendChild(button);
  return row;
}

function renderActions() {
  const startPanel = document.getElementById('startPanel');
  const actionRows = document.getElementById('actionRows');
  const endTurn = document.getElementById('endTurnBtn');
  actionRows.innerHTML = '';
  endTurn.style.display = 'none';

  if (state.phase === 'FINISHED') {
    startPanel.hidden = false;
    startPanel.innerHTML = '';
    startPanel.appendChild(pill(tr('resetGame'), () => act({ type: 'reset' })));
    return;
  }

  if (state.phase === 'NOT_STARTED' || state.phase === 'BETWEEN_TURNS') {
    startPanel.hidden = false;
    renderStartPanel(startPanel);
    return;
  }

  startPanel.hidden = true;
  endTurn.style.display = '';
  const assigned = state.assignments;
  endTurn.disabled = !(assigned.host && assigned.waiter && assigned.chef);
  endTurn.classList.toggle('ready', !endTurn.disabled);

  actionRows.appendChild(actionRow(tr('host'), hostButtons(), assigned.host));
  actionRows.appendChild(actionRow(tr('waiter'), waiterButtons(), assigned.waiter));
  actionRows.appendChild(actionRow(tr('chef'), chefButtons(), assigned.chef));
}

function renderStartPanel(panel) {
  const title = document.createElement('div');
  title.className = 'start-title';
  title.textContent = tr('startDay', { n: state.turn + 1 });
  panel.appendChild(title);

  if (state.phase === 'BETWEEN_TURNS' && state.events && state.events.length > 0) {
    const box = document.createElement('div');
    box.className = 'events';
    for (const event of state.events) {
      const row = document.createElement('div');
      row.className = 'event-row';
      row.textContent = '· ' + event;
      box.appendChild(row);
    }
    panel.appendChild(box);
  }

  const buttons = document.createElement('div');
  buttons.className = 'start-buttons';
  buttons.appendChild(pill(state.happyHour.used ? tr('activateHappyHourUsed') : tr('activateHappyHour'),
    () => act({ type: 'start', on: true }), state.happyHour.used));
  buttons.appendChild(pill(tr('startDay', { n: state.turn + 1 }), () => act({ type: 'start', on: false })));
  panel.appendChild(buttons);
}

function hostButtons() {
  const buttons = state.waiting.map((customer) =>
    pill(tr('seat') + ' C' + customer.id, () => act({ type: 'host', task: 'seat', id: customer.id })));
  buttons.push(pill(tr('wait'), () => act({ type: 'host', task: 'wait' })));
  return buttons;
}

function waiterButtons() {
  const buttons = [];
  for (const customer of state.waiting) {
    buttons.push(pill(tr('seat') + ' C' + customer.id,
      () => act({ type: 'waiter', task: 'seat', id: customer.id })));
  }
  for (const table of state.tables) {
    if (!table.customer) continue;
    const customer = table.customer;
    buttons.push(pill(tr('order') + ' C' + customer.id,
      () => act({ type: 'waiter', task: 'order', id: customer.id })));
    buttons.push(pill(tr('serve') + ' C' + customer.id,
      () => act({ type: 'waiter', task: 'serve', id: customer.id })));
  }
  buttons.push(pill(tr('wait'), () => act({ type: 'waiter', task: 'wait' })));
  return buttons;
}

function chefButtons() {
  const buttons = state.kitchen.map((order) =>
    pill(tr('cook') + ' #' + order.id, () => act({ type: 'chef', task: 'cook', id: order.id })));
  buttons.push(pill(tr('wait'), () => act({ type: 'chef', task: 'wait' })));
  return buttons;
}

// ------------------------------------------------------------------
// Boot
// ------------------------------------------------------------------

document.getElementById('endTurnBtn').addEventListener('click', () => act({ type: 'finish' }));

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    lang = btn.dataset.lang;
    localStorage.setItem('rr-lang', lang);
    applyStaticTexts();
    render();
  });
});

document.addEventListener('DOMContentLoaded', () => {
  applyStaticTexts();
  load();
});

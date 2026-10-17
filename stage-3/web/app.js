"use strict";

/*
 * P1 scope: state rendering + bilingual skeleton.
 *
 * This file contains NO game rules. It draws whatever GET /api/state returns,
 * and every decision will be sent back to the server as an action request (P2).
 * Nothing here decides whether a move is legal.
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
    phaseNotStarted: '游戏还没开始',
    phaseBetweenTurns: '第 {n} 天已结束',
    phaseFinished: '游戏结束',
    endTurn: '结束本回合',
    p1Hint: 'P1 预览：下面这些按钮会在下一步（P2）接入真实操作。',
    happyHourAction: '欢乐时光',
    host: '迎宾',
    waiter: '服务员',
    chef: '厨师'
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
    phaseNotStarted: 'The game has not started yet',
    phaseBetweenTurns: 'Day {n} has ended',
    phaseFinished: 'Game over',
    endTurn: 'End turn',
    p1Hint: 'P1 preview: these buttons will be wired to real actions in P2.',
    happyHourAction: 'Happy Hour',
    host: 'Host',
    waiter: 'Waiter',
    chef: 'Chef'
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
    const toast = document.getElementById('toast');
    toast.textContent = 'Cannot reach the game server: ' + error;
    toast.classList.add('error');
  }
}

function render() {
  if (!state) return;
  renderTop();
  renderPhaseBanner();
  renderQueue();
  renderTables();
  renderKitchen();
  renderHistory();
  renderPreviewActions();
  renderToast();
}

function renderTop() {
  document.getElementById('chipTurn').textContent = tr('turn', { n: state.turn, m: state.maxTurns });
  document.getElementById('chipRevenue').textContent = tr('revenue', { v: money(state.revenueCents) });
  document.getElementById('chipPaid').textContent = tr('paid', { n: state.paidCount });
  document.getElementById('chipSat').textContent = tr('satisfaction', { v: state.averageSatisfaction });
  const hh = state.happyHour;
  const hhText = hh.remaining > 0 ? tr('happyHourRemaining', { n: hh.remaining }) : tr('happyHourOff');
  document.getElementById('chipHappyHour').textContent = tr('happyHour') + '：' + hhText;
}

function renderPhaseBanner() {
  const banner = document.getElementById('phaseBanner');
  if (state.phase === 'FINISHED') {
    banner.textContent = state.result || tr('phaseFinished');
    banner.classList.add('done');
  } else if (state.phase === 'NOT_STARTED') {
    banner.textContent = tr('phaseNotStarted');
    banner.classList.remove('done');
  } else if (state.phase === 'BETWEEN_TURNS') {
    banner.textContent = tr('phaseBetweenTurns', { n: state.turn });
    banner.classList.remove('done');
  } else {
    banner.textContent = '';
    banner.classList.remove('done');
  }
}

function customerCard(customer) {
  const wrap = document.createElement('div');
  wrap.className = 'customer-card';
  const avatar = AVATARS[customer.type] || AVATARS.Regular;
  wrap.innerHTML =
    '<div class="avatar ' + avatar.cls + '">' + avatar.emoji + '</div>' +
    '<div class="customer-info">' +
      '<div class="customer-name">C' + customer.id + ' · ' + customer.type + '</div>' +
      '<div class="customer-status">' + statusText(CUSTOMER_STATUS, customer.status) + '</div>' +
      '<div class="sat-row">' +
        '<div class="sat-bar"><div class="sat-fill" style="width:' + customer.satisfaction + '%"></div></div>' +
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

/* P1 preview only: static, disabled buttons that show the intended layout.
   They are replaced by real, state-driven buttons in P2. */
function renderPreviewActions() {
  const rows = document.getElementById('actionRows');
  rows.innerHTML = '';
  const groups = [
    { label: tr('happyHourAction'), buttons: ['activate', 'continue'] },
    { label: tr('host'), buttons: ['seat', 'wait'] },
    { label: tr('waiter'), buttons: ['seat', 'order', 'serve', 'wait'] },
    { label: tr('chef'), buttons: ['cook', 'wait'] }
  ];
  for (const group of groups) {
    const row = document.createElement('div');
    row.className = 'action-row';
    row.innerHTML = '<span class="action-label">' + group.label + '</span>';
    for (const label of group.buttons) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'pill-btn';
      button.disabled = true;
      button.textContent = label;
      row.appendChild(button);
    }
    rows.appendChild(row);
  }
}

function renderToast() {
  const toast = document.getElementById('toast');
  if (state && state.message) {
    toast.textContent = state.message;
    toast.classList.remove('error');
  }
}

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

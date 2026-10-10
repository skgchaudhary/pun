// app.js: the browser half of dashboard.pun.
//
// 1. Fetch frontend.pun and put it inside #frontend (Pun has no server-side
//    include yet, so the include happens here).
// 2. GET backend.pun?action=menu to fill the menu and the dish picker.
// 3. GET backend.pun?action=stats&tick=N every 3 seconds (AJAX polling).
// 4. POST orders to backend.pun as ordinary form data, which Pun reads with
//    mang.POST.
// 5. List, add, update and delete members through members.pun (MySQL).
//
// Values from the server go in with textContent, never innerHTML. The only
// innerHTML is frontend.pun itself, which is this site's own markup.

(function () {
  'use strict';

  var POLL_MS = 3000;
  var MAX_TICK = 999;    // backend.pun accepts ticks 0..999
  var QUEUE_MAX = 12;    // queue_at() in backend.pun returns 0..12
  var FEED_SIZE = 6;

  var host = document.getElementById('frontend');
  var tick = 0;
  var timer = null;
  var billTotal = 0;
  var rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

  function $(id) { return document.getElementById(id); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function now() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // Call backend.pun, show the raw reply in the "Replies" panel, return the JSON.
  async function call(action, method, url, body) {
    var res = await fetch(url, body ? { method: method, body: body } : { method: method });
    var text = await res.text();
    var data = null;
    try { data = JSON.parse(text); } catch (e) { /* not JSON: shown raw below */ }
    showReply(action, method, url, body, res.status, data ? JSON.stringify(data, null, 2) : text);
    return { status: res.status, data: data };
  }

  function showReply(action, method, url, body, status, text) {
    var box = host.querySelector('.reply[data-action="' + action + '"]');
    if (!box) return;
    var badge = box.querySelector('.badge');
    badge.textContent = action + ' ' + status;
    badge.className = 'badge ' + (status === 200 ? 'ok' : 'err');
    box.querySelector('code').textContent = method + ' ' + url + (body ? '  body: ' + body.toString() : '');
    box.querySelector('pre').textContent = text;
  }

  function showErrors(list, errors) {
    list.textContent = '';
    (errors || []).forEach(function (message) { list.appendChild(el('li', '', message)); });
  }

  // ---- 1. include frontend.pun
  async function loadFrontend() {
    var res = await fetch(host.dataset.src);
    if (!res.ok) throw new Error('frontend.pun replied ' + res.status);
    host.innerHTML = await res.text();
  }

  // ---- 2. menu
  async function loadMenu() {
    var reply = await call('menu', 'GET', 'backend.pun?action=menu');
    if (reply.status !== 200) return;
    var rows = $('menu-rows');
    var select = $('dish-select');
    rows.textContent = '';
    select.textContent = '';
    select.appendChild(el('option', '', 'Choose a dish'));
    select.firstChild.value = '';
    reply.data.dishes.forEach(function (dish) {
      var tr = el('tr');
      var name = el('td');
      name.appendChild(el('span', dish.veg ? 'veg' : 'nonveg'));
      name.lastChild.title = dish.veg ? 'Vegetarian' : 'Non-vegetarian';
      name.appendChild(document.createTextNode(dish.naam));
      tr.appendChild(name);
      tr.appendChild(el('td', 'num', rupees.format(dish.price)));
      rows.appendChild(tr);

      var option = el('option', '', dish.naam + ' (' + rupees.format(dish.price) + ')');
      option.value = dish.id;
      select.appendChild(option);
    });
    $('gst-note').textContent = 'Prices before ' + reply.data.gst_percent + '% GST';
  }

  // ---- 3. live stats
  async function poll() {
    try {
      var reply = await call('stats', 'GET', 'backend.pun?action=stats&tick=' + tick);
      if (reply.status !== 200 || !reply.data) throw new Error('HTTP ' + reply.status);
      renderStats(reply.data);
      tick = (tick + 1) % (MAX_TICK + 1);
    } catch (err) {
      var badge = $('status-badge');
      badge.textContent = 'offline';
      badge.className = 'badge offline';
      $('updated').textContent = 'Could not reach backend.pun (' + err.message + ')';
    }
  }

  function setCard(stat, text) {
    var value = host.querySelector('[data-stat="' + stat + '"] .value');
    if (value.textContent === text) return;
    value.textContent = text;
    value.classList.add('flash');
    setTimeout(function () { value.classList.remove('flash'); }, 600);
  }

  function renderStats(s) {
    setCard('orders', String(s.orders));
    setCard('revenue', rupees.format(s.revenue));
    setCard('queue', String(s.queue));
    setCard('wait_min', s.wait_min + ' min');

    var badge = $('status-badge');
    badge.textContent = s.status;
    badge.className = 'badge ' + s.status;

    var spark = $('spark');
    spark.textContent = '';
    s.queue_history.forEach(function (q) {
      var bar = el('span');
      bar.style.height = Math.max(4, (q / QUEUE_MAX) * 100) + '%';
      bar.title = q + ' waiting';
      spark.appendChild(bar);
    });

    $('top-dish').textContent = s.top_dish;

    var item = el('li');
    item.appendChild(el('span', '', 'Table ' + s.latest.table + ': ' + s.latest.qty + ' × ' + s.latest.dish));
    item.appendChild(el('time', '', now()));
    var feed = $('feed');
    feed.insertBefore(item, feed.firstChild);
    while (feed.children.length > FEED_SIZE) feed.removeChild(feed.lastChild);

    $('updated').textContent = 'Updated ' + now() + ' · tick ' + s.tick;
  }

  function togglePause() {
    var button = $('pause');
    if (timer) {
      clearInterval(timer);
      timer = null;
      button.textContent = 'Resume updates';
    } else {
      poll();
      timer = setInterval(poll, POLL_MS);
      button.textContent = 'Pause updates';
    }
  }

  // ---- 4. posting forms
  async function sendOrder(body) {
    var reply = await call('order', 'POST', 'backend.pun', body);
    if (reply.status !== 200) {
      showErrors($('order-errors'), reply.data && reply.data.errors);
      return;
    }
    showErrors($('order-errors'), []);
    var o = reply.data;
    var tr = el('tr');
    tr.appendChild(el('td', '', o.dish));
    tr.appendChild(el('td', 'num', String(o.qty)));
    tr.appendChild(el('td', 'num', String(o.table)));
    tr.appendChild(el('td', 'num', rupees.format(o.total)));
    tr.title = rupees.format(o.subtotal) + ' + ' + rupees.format(o.gst) + ' GST';
    $('bill-rows').appendChild(tr);
    billTotal += o.total;
    $('bill-total').textContent = rupees.format(billTotal);
  }

  // ---- 5. members (MySQL through members.pun)
  function setDbState(state, badgeText, message) {
    var badge = $('db-badge');
    badge.textContent = badgeText;
    badge.className = 'badge ' + state;
    $('db-status').textContent = message;
  }

  function renderMembers(members) {
    var list = $('members');
    list.textContent = '';
    members.forEach(function (m) {
      var item = el('li');
      item.appendChild(el('span', '', m.naam + ' <' + m.email + '>'));
      var remove = el('button', '', 'Delete');
      remove.type = 'button';
      remove.addEventListener('click', function () {
        sendMember(new URLSearchParams({ action: 'delete', email: m.email }));
      });
      item.appendChild(remove);
      list.appendChild(item);
    });
    setDbState('ok', 'connected', members.length + (members.length === 1 ? ' member' : ' members') + ' in pun_members');
  }

  // Every members.pun reply carries the full list, so one handler fits all.
  function handleMembersReply(reply) {
    if (reply.status === 404 && !reply.data) {
      setDbState('err', 'not set up', 'members.pun is missing. Copy members.example.pun to members.pun and fill in your MySQL details (see .env.example).');
      return false;
    }
    if (!reply.data) {
      setDbState('err', 'no database', 'members.pun could not reach MySQL. The Replies panel shows the error page it sent.');
      return false;
    }
    if (reply.data.members) renderMembers(reply.data.members);
    showErrors($('member-errors'), reply.status === 200 ? [] : reply.data.errors);
    return reply.status === 200;
  }

  async function loadMembers() {
    handleMembersReply(await call('members', 'GET', 'members.pun'));
  }

  async function sendMember(body) {
    return handleMembersReply(await call('members', 'POST', 'members.pun', body));
  }

  function wire() {
    $('order-form').addEventListener('submit', function (event) {
      event.preventDefault();
      sendOrder(new URLSearchParams(new FormData(event.target)));
    });
    $('bad-order').addEventListener('click', function () {
      sendOrder(new URLSearchParams({ action: 'order', dish: 'pizza', qty: '0', table: '99' }));
    });
    $('member-form').addEventListener('submit', async function (event) {
      event.preventDefault();
      var body = new URLSearchParams(new FormData(event.target));
      body.set('action', event.submitter ? event.submitter.value : 'add');
      if (await sendMember(body)) event.target.reset();
    });
    $('pause').addEventListener('click', togglePause);
  }

  async function start() {
    try {
      await loadFrontend();
    } catch (err) {
      host.textContent = '';
      host.appendChild(el('p', 'error-box', 'Could not load frontend.pun: ' + err.message));
      return;
    }
    wire();
    loadMenu();
    loadMembers();
    poll();
    timer = setInterval(poll, POLL_MS);
  }

  start();
})();

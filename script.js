/* ===== Brain Trust Beer Tracker — App Logic =====
 * Single-page app: hash routing, persistent state, charts, tracker.
 * iOS-friendly: tap to add, long-press to remove (no right-click required).
 */

const STORAGE_KEY = "brainTrust.v1";
const LONG_PRESS_MS = 550;

/* ---------- State ---------- */
const State = {
  data: null,
  charts: {},

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
        if (!this.data.sessions) this.data.sessions = [];
      } catch {
        this.data = null;
      }
    }
    if (!this.data) {
      this.data = {
        sessions: [...SEED_SESSIONS],
        currentSessionId: null
      };
      this.save();
    }
    return this.data;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessions: this.data.sessions,
      currentSessionId: this.data.currentSessionId
    }));
  },

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = null;
    this.load();
  },

  currentSession() {
    if (!this.data.currentSessionId) return null;
    return this.data.sessions.find((s) => s.id === this.data.currentSessionId) || null;
  },

  startSession(name) {
    const sess = {
      id: "s-" + Date.now(),
      name: name || `Session ${new Date().toLocaleDateString()}`,
      date: new Date().toISOString(),
      startedAt: Date.now(),
      endedAt: null,
      entries: [],
      seed: false
    };
    this.data.sessions.push(sess);
    this.data.currentSessionId = sess.id;
    this.save();
    return sess;
  },

  endSession() {
    const s = this.currentSession();
    if (s) s.endedAt = Date.now();
    this.data.currentSessionId = null;
    this.save();
  },

  addBeer(memberId, style) {
    let s = this.currentSession();
    if (!s) s = this.startSession();
    const member = BRAIN_TRUST.find((m) => m.id === memberId);
    s.entries.push({
      memberId,
      time: Date.now(),
      style: style || member.favoriteStyle || "Lager"
    });
    this.save();
  },

  removeLastBeer(memberId) {
    const s = this.currentSession();
    if (!s) return false;
    for (let i = s.entries.length - 1; i >= 0; i--) {
      if (s.entries[i].memberId === memberId) {
        s.entries.splice(i, 1);
        this.save();
        return true;
      }
    }
    return false;
  },

  clearTonight() {
    const s = this.currentSession();
    if (s) s.entries = [];
    this.save();
  }
};

/* ---------- Stats helpers ---------- */
const Stats = {
  allEntries() {
    return State.data.sessions.flatMap((s) =>
      s.entries.map((e) => ({ ...e, sessionId: s.id, sessionName: s.name, sessionDate: s.date }))
    );
  },

  totalsByMember(sessions) {
    const totals = {};
    BRAIN_TRUST.forEach((m) => (totals[m.id] = 0));
    (sessions || State.data.sessions).forEach((s) => {
      s.entries.forEach((e) => {
        totals[e.memberId] = (totals[e.memberId] || 0) + 1;
      });
    });
    return totals;
  },

  memberStats(memberId) {
    const sessions = State.data.sessions;
    const all = sessions
      .map((s) => ({ session: s, entries: s.entries.filter((e) => e.memberId === memberId) }))
      .filter((x) => x.entries.length > 0);
    const total = all.reduce((sum, x) => sum + x.entries.length, 0);
    const sessionCount = all.length;
    const avg = sessionCount ? +(total / sessionCount).toFixed(1) : 0;
    const best = all.reduce((max, x) => Math.max(max, x.entries.length), 0);

    let wins = 0;
    sessions.forEach((s) => {
      // For "wins" exclude non-drinkers from the contest
      const tally = {};
      s.entries.forEach((e) => {
        const m = BRAIN_TRUST.find((x) => x.id === e.memberId);
        if (m?.nonDrinker) return;
        tally[e.memberId] = (tally[e.memberId] || 0) + 1;
      });
      const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
      if (sorted.length && sorted[0][0] === memberId) wins++;
    });

    const styleMix = {};
    all.forEach((x) =>
      x.entries.forEach((e) => {
        styleMix[e.style] = (styleMix[e.style] || 0) + 1;
      })
    );
    const topStyle = Object.entries(styleMix).sort((a, b) => b[1] - a[1])[0];

    const last8 = sessions.slice(-8).map((s) => ({
      name: s.name,
      date: s.date,
      count: s.entries.filter((e) => e.memberId === memberId).length
    }));

    const hourBuckets = [0, 0, 0, 0, 0, 0];
    sessions.forEach((s) => {
      const start = s.startedAt || new Date(s.date).getTime();
      s.entries
        .filter((e) => e.memberId === memberId)
        .forEach((e) => {
          const h = Math.min(5, Math.floor((e.time - start) / (60 * 60 * 1000)));
          if (h >= 0) hourBuckets[h]++;
        });
    });

    let fastestGapMin = Infinity;
    all.forEach((x) => {
      const sorted = [...x.entries].sort((a, b) => a.time - b.time);
      for (let i = 1; i < sorted.length; i++) {
        const gap = (sorted[i].time - sorted[i - 1].time) / 60000;
        if (gap > 0 && gap < fastestGapMin) fastestGapMin = gap;
      }
    });
    if (!isFinite(fastestGapMin)) fastestGapMin = 0;

    return { total, sessionCount, avg, best, wins, styleMix, topStyle, last8, hourBuckets, fastestGapMin };
  },

  records() {
    const sessions = State.data.sessions;
    const drinkers = BRAIN_TRUST.filter((m) => !m.nonDrinker);

    let mostOne = { count: 0, member: null, sessionName: "" };
    sessions.forEach((s) => {
      const tally = {};
      s.entries.forEach((e) => {
        const m = BRAIN_TRUST.find((x) => x.id === e.memberId);
        if (m?.nonDrinker) return;
        tally[e.memberId] = (tally[e.memberId] || 0) + 1;
      });
      Object.entries(tally).forEach(([mid, c]) => {
        if (c > mostOne.count) mostOne = { count: c, member: mid, sessionName: s.name };
      });
    });

    let highestAvg = { val: 0, member: null };
    drinkers.forEach((m) => {
      const stat = this.memberStats(m.id);
      if (stat.avg > highestAvg.val) highestAvg = { val: stat.avg, member: m.id };
    });

    let fastest = { val: Infinity, member: null };
    drinkers.forEach((m) => {
      const stat = this.memberStats(m.id);
      if (stat.fastestGapMin > 0 && stat.fastestGapMin < fastest.val)
        fastest = { val: stat.fastestGapMin, member: m.id };
    });
    if (!isFinite(fastest.val)) fastest = { val: 0, member: null };

    let longest = { val: 0, name: "" };
    sessions.forEach((s) => {
      const dur = ((s.endedAt || (s.startedAt + 4 * 3600 * 1000)) - s.startedAt) / 3600000;
      if (dur > longest.val) longest = { val: dur, name: s.name };
    });

    const wins = {};
    drinkers.forEach((m) => (wins[m.id] = 0));
    sessions.forEach((s) => {
      const tally = {};
      s.entries.forEach((e) => {
        const m = BRAIN_TRUST.find((x) => x.id === e.memberId);
        if (m?.nonDrinker) return;
        tally[e.memberId] = (tally[e.memberId] || 0) + 1;
      });
      const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
      if (top) wins[top[0]] = (wins[top[0]] || 0) + 1;
    });
    const winsTop = Object.entries(wins).sort((a, b) => b[1] - a[1])[0] || [null, 0];

    const stylesPerMember = {};
    BRAIN_TRUST.forEach((m) => (stylesPerMember[m.id] = new Set()));
    sessions.forEach((s) =>
      s.entries.forEach((e) => stylesPerMember[e.memberId]?.add(e.style))
    );
    const styleTop = Object.entries(stylesPerMember)
      .map(([mid, set]) => [mid, set.size])
      .sort((a, b) => b[1] - a[1])[0];

    // Mike-specific record: most NAs / waters tracked
    const mikeStat = this.memberStats("mike");

    return [
      {
        title: "Most Beers, One Session",
        holder: memberName(mostOne.member),
        detail: `${mostOne.count} beers @ ${mostOne.sessionName}`
      },
      {
        title: "Highest Average Pace",
        holder: memberName(highestAvg.member),
        detail: `${highestAvg.val} beers / session`
      },
      {
        title: "Fastest Beer-to-Beer",
        holder: memberName(fastest.member),
        detail: fastest.val ? `${fastest.val.toFixed(1)} minutes between beers` : "Pending..."
      },
      {
        title: "Longest Session Survived",
        holder: longest.name || "—",
        detail: `${longest.val.toFixed(1)} hours`
      },
      {
        title: "Most Top-Drinker Finishes",
        holder: memberName(winsTop[0]),
        detail: `${winsTop[1]} sessions atop the leaderboard`
      },
      {
        title: "Most Beer Styles Tried",
        holder: memberName(styleTop[0]),
        detail: `${styleTop[1]} distinct styles`
      },
      {
        title: "Most Sober Hours Logged",
        holder: "Mike Kelly",
        detail: `${mikeStat.total} NAs &amp; waters tracked &middot; designated driver, every time`
      }
    ];
  }
};

function memberName(id) {
  return BRAIN_TRUST.find((m) => m.id === id)?.name || "—";
}
function getMember(id) {
  return BRAIN_TRUST.find((m) => m.id === id);
}

/* ---------- Router ---------- */
const Router = {
  routes: [
    { match: /^\/?$/, view: "home" },
    { match: /^\/leaderboard\/?$/, view: "leaderboard" },
    { match: /^\/roster\/?$/, view: "roster" },
    { match: /^\/member\/([\w-]+)\/?$/, view: "member" },
    { match: /^\/log\/?$/, view: "log" },
    { match: /^\/lore\/?$/, view: "lore" }
  ],

  parse() {
    const hash = location.hash.replace(/^#/, "") || "/";
    for (const r of this.routes) {
      const m = hash.match(r.match);
      if (m) return { view: r.view, params: m.slice(1) };
    }
    return { view: "404", params: [] };
  },

  go(path) {
    location.hash = "#" + path;
  },

  render() {
    const { view, params } = this.parse();
    const app = document.getElementById("app");
    Object.values(State.charts).forEach((c) => c?.destroy?.());
    State.charts = {};

    const tplId = "tpl-" + view;
    const tpl = document.getElementById(tplId);
    if (!tpl) {
      app.innerHTML = "<p>Page not found.</p>";
      return;
    }
    app.innerHTML = "";
    app.appendChild(tpl.content.cloneNode(true));

    document.querySelectorAll(".nav-links a").forEach((a) => {
      const r = a.getAttribute("data-route");
      a.classList.toggle("active", view === "home" ? r === "/" : "/" + view === r);
    });

    Views[view]?.(params);
    updateSessionBadge();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
};

function updateSessionBadge() {
  const dot = document.getElementById("sessionDot");
  const label = document.getElementById("sessionLabel");
  if (!dot || !label) return;
  const s = State.currentSession();
  if (s) {
    dot.classList.add("live");
    label.textContent = `Live: ${s.name}`;
  } else {
    dot.classList.remove("live");
    label.textContent = "No session";
  }
}

/* ---------- Views ---------- */
const Views = {
  home() {
    const startBtn = document.getElementById("startSessionBtn");
    const endBtn = document.getElementById("endSessionBtn");
    const nameInput = document.getElementById("sessionName");
    const heroNight = document.getElementById("heroNightTotal");
    const heroAll = document.getElementById("heroAllTimeTotal");
    const heroSessions = document.getElementById("heroSessions");

    function refreshHero() {
      const sess = State.currentSession();
      const nightTotal = sess ? sess.entries.length : 0;
      const allTotal = State.data.sessions.reduce((sum, s) => sum + s.entries.length, 0);
      heroNight.textContent = nightTotal;
      heroAll.textContent = allTotal;
      heroSessions.textContent = State.data.sessions.length;
      if (sess) {
        startBtn.hidden = true;
        nameInput.hidden = true;
        endBtn.hidden = false;
      } else {
        startBtn.hidden = false;
        nameInput.hidden = false;
        endBtn.hidden = true;
      }
    }

    startBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      State.startSession(name);
      refreshHero();
      updateSessionBadge();
      Tracker.render();
      LiveBoard.render();
      nameInput.value = "";
    });

    endBtn.addEventListener("click", () => {
      if (!confirm("End the current session?")) return;
      State.endSession();
      refreshHero();
      updateSessionBadge();
      Tracker.render();
      LiveBoard.render();
    });

    refreshHero();
    Tracker.mount(refreshHero);
    LiveBoard.mount();
  },

  leaderboard() {
    const totals = Stats.totalsByMember();
    const sorted = BRAIN_TRUST
      .filter((m) => !m.nonDrinker)
      .map((m) => ({ ...m, total: totals[m.id] || 0 }))
      .sort((a, b) => b.total - a.total);

    const podium = document.getElementById("podium");
    const order = [1, 0, 2];
    const ranks = ["gold", "silver", "bronze"];
    podium.innerHTML = order
      .map((idx) => {
        const m = sorted[idx];
        if (!m) return "";
        const rankCls = ranks[idx];
        return `
          <div class="podium-spot ${rankCls}" style="--accent:${m.color}">
            <span class="rank-badge">#${idx + 1}</span>
            <div class="av" style="background:${m.color}">${m.initials}</div>
            <h3>${m.name}</h3>
            <p class="pn">${m.handle}</p>
            <div class="pcount">${m.total}</div>
            <div class="plabel">All-time beers</div>
          </div>`;
      })
      .join("");

    Charts.allTime("chartAllTime", sorted);
    Charts.avg("chartAvg");
    Charts.trend("chartTrend");
    Charts.styleMix("chartStyle");

    const recordsEl = document.getElementById("records");
    recordsEl.innerHTML = Stats.records()
      .map(
        (r) => `
        <div class="record">
          <p class="record-title">${r.title}</p>
          <p class="record-holder">${r.holder}</p>
          <p class="record-detail">${r.detail}</p>
        </div>`
      )
      .join("");
  },

  roster() {
    const grid = document.getElementById("rosterGrid");
    grid.innerHTML = BRAIN_TRUST.map((m) => {
      const stat = Stats.memberStats(m.id);
      const totalLabel = m.nonDrinker ? "NAs" : "Total";
      return `
        <a class="roster-card" href="#/member/${m.id}" style="--accent:${m.color}">
          <div class="rc-head">
            <div class="rc-av" style="background:${m.color}">${m.initials}</div>
            <div>
              <h3>${m.name}</h3>
              <p class="archetype">${m.archetype}${m.nonDrinker ? " &middot; NA" : ""}</p>
            </div>
          </div>
          <p class="bio">${m.bio}</p>
          <div class="rc-stats">
            <div class="rc-stat">
              <span class="rc-stat-num">${stat.total}</span>
              <span class="rc-stat-lbl">${totalLabel}</span>
            </div>
            <div class="rc-stat">
              <span class="rc-stat-num">${stat.avg}</span>
              <span class="rc-stat-lbl">Per sess.</span>
            </div>
            <div class="rc-stat">
              <span class="rc-stat-num">${stat.best}</span>
              <span class="rc-stat-lbl">Best</span>
            </div>
          </div>
        </a>`;
    }).join("");
  },

  member(params) {
    const id = params[0];
    const m = getMember(id);
    const page = document.getElementById("memberPage");
    if (!m) {
      page.innerHTML = "<p>Member not found. <a href='#/roster'>Back to roster</a>.</p>";
      return;
    }
    const stat = Stats.memberStats(id);
    page.style.setProperty("--accent", m.color);
    const totalLabel = m.nonDrinker ? "NAs &amp; Waters Tracked" : "All-Time Beers";
    const styleLabel = m.nonDrinker ? "Top NA Choice" : "Top Style";
    page.innerHTML = `
      <div class="member-hero" style="--accent:${m.color}">
        <div class="mh-av" style="background:${m.color}">${m.initials}</div>
        <div class="mh-info">
          <p class="mh-archetype">${m.archetype}${m.nonDrinker ? " &middot; Non-drinker" : ""}</p>
          <h1>${m.name}</h1>
          <p class="mh-bio">${m.bio}</p>
          <span class="tagline">"${m.tagline}"</span>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-tile">
          <span class="label">${totalLabel}</span>
          <span class="num">${stat.total}</span>
          <span class="sub">across ${stat.sessionCount} sessions</span>
        </div>
        <div class="stat-tile">
          <span class="label">Avg / Session</span>
          <span class="num">${stat.avg}</span>
          <span class="sub">${m.archetype} pace</span>
        </div>
        <div class="stat-tile">
          <span class="label">Best Night</span>
          <span class="num">${stat.best}</span>
          <span class="sub">single-session record</span>
        </div>
        <div class="stat-tile">
          <span class="label">${m.nonDrinker ? "DDs Logged" : "Sessions Won"}</span>
          <span class="num">${m.nonDrinker ? stat.sessionCount : stat.wins}</span>
          <span class="sub">${m.nonDrinker ? "drives home, every time" : "top of the leaderboard"}</span>
        </div>
        <div class="stat-tile">
          <span class="label">${styleLabel}</span>
          <span class="num" style="font-size:24px">${stat.topStyle ? stat.topStyle[0] : "—"}</span>
          <span class="sub">${stat.topStyle ? stat.topStyle[1] + " logged" : ""}</span>
        </div>
        <div class="stat-tile">
          <span class="label">Fastest Pace</span>
          <span class="num">${stat.fastestGapMin ? stat.fastestGapMin.toFixed(0) : "—"}<span style="font-size:18px"> min</span></span>
          <span class="sub">drink-to-drink record</span>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <h3>Last 8 Sessions</h3>
            <span class="card-tag">Trend</span>
          </div>
          <div class="chart-wrap"><canvas id="memberTrend"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head">
            <h3>${m.nonDrinker ? "NA &amp; Drink Distribution" : "Style Distribution"}</h3>
            <span class="card-tag">Palate</span>
          </div>
          <div class="chart-wrap"><canvas id="memberStyle"></canvas></div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-head">
            <h3>Hour-by-Hour Pace</h3>
            <span class="card-tag">Tempo</span>
          </div>
          <div class="chart-wrap"><canvas id="memberHours"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head">
            <h3>vs. The Brain Trust</h3>
            <span class="card-tag">Head-to-head</span>
          </div>
          <div class="chart-wrap"><canvas id="memberCompare"></canvas></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <h3>Power Moves</h3>
          <span class="card-tag">Signature</span>
        </div>
        <div class="power-moves">
          ${m.powerMoves
            .map(
              (p) => `
            <div class="power-move">
              <h4>${p.title}</h4>
              <p>${p.text}</p>
            </div>`
            )
            .join("")}
        </div>
      </div>
    `;

    Charts.memberTrend("memberTrend", id, stat);
    Charts.memberStyle("memberStyle", id, stat, m);
    Charts.memberHours("memberHours", id, stat, m);
    Charts.memberCompare("memberCompare", id, m);
  },

  log() {
    const filter = document.getElementById("logFilter");
    const list = document.getElementById("logList");

    filter.innerHTML =
      `<option value="all">All members</option>` +
      BRAIN_TRUST.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");

    function paint() {
      const memberId = filter.value;
      const all = Stats.allEntries()
        .filter((e) => memberId === "all" || e.memberId === memberId)
        .sort((a, b) => b.time - a.time);
      if (!all.length) {
        list.innerHTML = `<p style="color:var(--text-mute)">No drinks logged yet. Start a session and tap a card to begin.</p>`;
        return;
      }
      const byDay = {};
      all.forEach((e) => {
        const d = new Date(e.time);
        const k = d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
        (byDay[k] ||= []).push(e);
      });
      list.innerHTML = Object.entries(byDay)
        .map(([day, rows]) => {
          return `
            <div class="log-day">${day} &middot; ${rows.length} drinks</div>
            ${rows
              .map((e) => {
                const m = getMember(e.memberId);
                const t = new Date(e.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
                return `
                <div class="log-row">
                  <span class="log-time">${t}</span>
                  <span class="log-av" style="background:${m.color}">${m.initials}</span>
                  <span class="log-name">${m.name}</span>
                  <span class="log-style">${e.style} &middot; ${e.sessionName}</span>
                </div>`;
              })
              .join("")}
          `;
        })
        .join("");
    }

    filter.addEventListener("change", paint);
    document.getElementById("clearTonightBtn").addEventListener("click", () => {
      if (confirm("Clear all drinks for the current session?")) {
        State.clearTonight();
        paint();
      }
    });
    document.getElementById("resetAllBtn").addEventListener("click", () => {
      if (confirm("This wipes ALL data and reloads seed history. Continue?")) {
        State.reset();
        paint();
      }
    });

    paint();
  },

  lore() {
    const el = document.getElementById("loreContent");
    el.innerHTML = LORE.map(
      (l) => `
      <div class="lore-card">
        <span class="lc-tag">${l.tag}</span>
        <h3>${l.title}</h3>
        <p>${l.text}</p>
      </div>`
    ).join("");
  },

  "404"() {}
};

/* ---------- Tracker (iOS-friendly) ---------- */
const Tracker = {
  refreshHero: null,

  mount(refreshHero) {
    this.refreshHero = refreshHero;
    this.render();
  },

  render() {
    const grid = document.getElementById("trackerGrid");
    if (!grid) return;
    const sess = State.currentSession();
    grid.innerHTML = BRAIN_TRUST.map((m) => {
      const count = sess ? sess.entries.filter((e) => e.memberId === m.id).length : 0;
      const sessStart = sess?.startedAt || Date.now();
      const minutes = sess ? Math.max(1, (Date.now() - sessStart) / 60000) : 0;
      const pace = sess && count > 0 ? (minutes / count).toFixed(0) : "—";
      const mug = m.nonDrinker ? "&#128167;" : "&#127866;"; // droplet vs. mug
      const mugs = mug.repeat(Math.min(count, 12));
      const styles = Object.keys(m.styleMix);
      const countLabel = m.nonDrinker ? "NAs tonight" : "tonight";
      return `
        <div class="tracker-card" data-member="${m.id}" style="--accent:${m.color}">
          <div class="tc-head">
            <div class="tc-avatar" style="background:${m.color}">${m.initials}</div>
            <div class="tc-id">
              <p class="tc-name">${m.name}</p>
              <p class="tc-handle">${m.handle}${m.nonDrinker ? " &middot; DD" : ""}</p>
            </div>
          </div>
          <div class="tc-count">
            <span class="tc-count-num">${count}</span>
            <span class="tc-count-label">${countLabel}</span>
          </div>
          <div class="tc-mugs">${mugs}</div>
          <div class="tc-pace">
            <span>${m.archetype}</span>
            <span>${pace !== "—" ? "1 every " + pace + " min" : "ready when you are"}</span>
          </div>
          <div class="tc-actions">
            <button class="tc-btn add" data-act="add" type="button">+ ${m.nonDrinker ? "Drink" : "Beer"}</button>
            <button class="tc-btn" data-act="undo" type="button" aria-label="Remove last">&minus;</button>
            <button class="tc-btn" data-act="style" type="button">Style</button>
          </div>
          <div class="tc-style-picker">
            ${styles.map((s) => `<span class="tc-style" data-style="${s}">${s}</span>`).join("")}
          </div>
        </div>`;
    }).join("");

    grid.querySelectorAll(".tracker-card").forEach((card) => this.attachHandlers(card));
  },

  attachHandlers(card) {
    const memberId = card.dataset.member;

    const addBeer = (style) => {
      State.addBeer(memberId, style);
      card.classList.add("popped");
      setTimeout(() => card.classList.remove("popped"), 400);
      this.render();
      LiveBoard.render();
      this.refreshHero?.();
      updateSessionBadge();
      if (navigator.vibrate) navigator.vibrate(15);
    };

    const undo = () => {
      const removed = State.removeLastBeer(memberId);
      if (removed) {
        this.render();
        LiveBoard.render();
        this.refreshHero?.();
        if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
      }
    };

    // Long-press detection (iOS-friendly)
    let pressTimer = null;
    let longPressed = false;
    let startX = 0;
    let startY = 0;

    const cancelPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    };

    card.addEventListener("touchstart", (e) => {
      // Only start long-press if pressing on the card body, not buttons inside style picker
      const onActionBtn = e.target.closest("[data-act]");
      const onStyle = e.target.closest("[data-style]");
      if (onActionBtn || onStyle) return;
      longPressed = false;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      pressTimer = setTimeout(() => {
        longPressed = true;
        undo();
      }, LONG_PRESS_MS);
    }, { passive: true });

    card.addEventListener("touchmove", (e) => {
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 10 || dy > 10) cancelPress();
    }, { passive: true });

    card.addEventListener("touchend", () => cancelPress());
    card.addEventListener("touchcancel", () => cancelPress());

    // Click handler — handles taps on iOS too
    card.addEventListener("click", (e) => {
      if (longPressed) {
        longPressed = false;
        e.preventDefault();
        return;
      }
      const actEl = e.target.closest("[data-act]");
      const styleEl = e.target.closest("[data-style]");
      if (styleEl) {
        addBeer(styleEl.dataset.style);
        card.classList.remove("expanded");
        return;
      }
      if (actEl) {
        const act = actEl.dataset.act;
        if (act === "add") return addBeer();
        if (act === "undo") return undo();
        if (act === "style") {
          card.classList.toggle("expanded");
          return;
        }
      }
      // tap on card body itself = add a beer
      addBeer();
    });

    // Right-click on desktop also removes (parity with long-press)
    card.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      undo();
    });
  }
};

/* ---------- Live leaderboard ---------- */
const LiveBoard = {
  mount() { this.render(); },
  render() {
    const el = document.getElementById("liveBoard");
    if (!el) return;
    const sess = State.currentSession();
    const counts = BRAIN_TRUST.map((m) => ({
      m,
      count: sess ? sess.entries.filter((e) => e.memberId === m.id).length : 0
    })).sort((a, b) => b.count - a.count);
    const max = Math.max(1, counts[0]?.count || 0);
    el.innerHTML = counts
      .map(
        (row, i) => `
        <div class="live-row ${i === 0 && row.count > 0 ? "lead" : ""}" style="--accent:${row.m.color}">
          <div class="live-rank">#${i + 1}</div>
          <div class="tc-avatar" style="background:${row.m.color};width:38px;height:38px;font-size:16px;box-shadow:none">${row.m.initials}</div>
          <div>
            <div class="live-name">${row.m.name}${row.m.nonDrinker ? ' <span style="color:var(--text-mute);font-size:11px;font-weight:500">&middot; DD</span>' : ""}</div>
            <div class="live-bar-wrap"><div class="live-bar" style="width:${(row.count / max) * 100}%;background:${row.m.color}"></div></div>
          </div>
          <div class="live-count">${row.count}</div>
        </div>`
      )
      .join("");
  }
};

/* ---------- Charts ---------- */
const Charts = {
  baseOpts() {
    Chart.defaults.color = "#b3a78f";
    Chart.defaults.borderColor = "rgba(255,255,255,0.06)";
    Chart.defaults.font.family = "Inter, system-ui, sans-serif";
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: "#f5ecd9" } } }
    };
  },

  allTime(canvasId, sorted) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    State.charts[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map((m) => m.name.split(" ")[0]),
        datasets: [{
          label: "All-time beers",
          data: sorted.map((m) => m.total),
          backgroundColor: sorted.map((m) => m.color),
          borderRadius: 8
        }]
      },
      options: {
        ...this.baseOpts(),
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.04)" } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  avg(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const data = BRAIN_TRUST.filter((m) => !m.nonDrinker).map((m) => {
      const stat = Stats.memberStats(m.id);
      return { ...m, avg: stat.avg };
    }).sort((a, b) => b.avg - a.avg);
    State.charts[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map((m) => m.name.split(" ")[0]),
        datasets: [{
          label: "Avg per session",
          data: data.map((m) => m.avg),
          backgroundColor: data.map((m) => m.color + "cc"),
          borderColor: data.map((m) => m.color),
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        ...this.baseOpts(),
        indexAxis: "y",
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.04)" } },
          y: { grid: { display: false } }
        }
      }
    });
  },

  trend(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const sessions = State.data.sessions.slice(-8);
    const labels = sessions.map((s, i) => `S${i + 1}`);
    const datasets = BRAIN_TRUST.map((m) => ({
      label: m.name.split(" ")[0],
      data: sessions.map((s) => s.entries.filter((e) => e.memberId === m.id).length),
      borderColor: m.color,
      backgroundColor: m.color + "33",
      borderDash: m.nonDrinker ? [5, 5] : [],
      tension: 0.35,
      borderWidth: 2.5,
      pointRadius: 3,
      pointBackgroundColor: m.color
    }));
    State.charts[canvasId] = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        ...this.baseOpts(),
        scales: {
          y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.04)" } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  styleMix(canvasId) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const counts = {};
    State.data.sessions.forEach((s) =>
      s.entries.forEach((e) => {
        const m = BRAIN_TRUST.find((x) => x.id === e.memberId);
        if (m?.nonDrinker) return; // group palate excludes Mike's NAs
        counts[e.style] = (counts[e.style] || 0) + 1;
      })
    );
    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const palette = ["#f5b13b", "#e2543a", "#a16ad9", "#5fb6ff", "#6fbf73", "#ffd061", "#c2811f", "#ff8a72", "#7adcff", "#b6f0a3", "#d2a4ff", "#fff4d6"];
    State.charts[canvasId] = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: entries.map((x) => x[0]),
        datasets: [{
          data: entries.map((x) => x[1]),
          backgroundColor: entries.map((_, i) => palette[i % palette.length]),
          borderColor: "#0b0a08",
          borderWidth: 3
        }]
      },
      options: {
        ...this.baseOpts(),
        cutout: "55%",
        plugins: { legend: { position: "right", labels: { color: "#f5ecd9", boxWidth: 14 } } }
      }
    });
  },

  memberTrend(canvasId, id, stat) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const m = getMember(id);
    State.charts[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: stat.last8.map((s, i) => `S${i + 1}`),
        datasets: [{
          label: m.nonDrinker ? "NAs" : "Beers",
          data: stat.last8.map((s) => s.count),
          backgroundColor: m.color,
          borderRadius: 8
        }]
      },
      options: {
        ...this.baseOpts(),
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { title: (items) => stat.last8[items[0].dataIndex].name }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.04)" } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  memberStyle(canvasId, id, stat, m) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const entries = Object.entries(stat.styleMix).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      ctx.parentElement.innerHTML = '<p style="color:var(--text-mute);text-align:center;padding:60px 0">No data yet — log some drinks!</p>';
      return;
    }
    const palette = ["#f5b13b", "#e2543a", "#a16ad9", "#5fb6ff", "#6fbf73", "#ffd061", "#c2811f", "#ff8a72"];
    State.charts[canvasId] = new Chart(ctx, {
      type: "polarArea",
      data: {
        labels: entries.map((x) => x[0]),
        datasets: [{
          data: entries.map((x) => x[1]),
          backgroundColor: entries.map((_, i) => palette[i % palette.length] + "cc"),
          borderColor: "#0b0a08",
          borderWidth: 2
        }]
      },
      options: {
        ...this.baseOpts(),
        scales: {
          r: {
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: { color: "#7a6f5b", backdropColor: "transparent" },
            angleLines: { color: "rgba(255,255,255,0.06)" }
          }
        }
      }
    });
  },

  memberHours(canvasId, id, stat, m) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    State.charts[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Hr 1", "Hr 2", "Hr 3", "Hr 4", "Hr 5", "Hr 6+"],
        datasets: [{
          label: "Drinks",
          data: stat.hourBuckets,
          backgroundColor: m.color + "cc",
          borderColor: m.color,
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        ...this.baseOpts(),
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.04)" } },
          x: { grid: { display: false } }
        }
      }
    });
  },

  memberCompare(canvasId, id, m) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const stat = Stats.memberStats(id);
    const peers = BRAIN_TRUST.filter((x) => !x.nonDrinker || m.nonDrinker);
    const peerStats = peers.map((p) => Stats.memberStats(p.id));
    const avgKey = (k) => peerStats.reduce((s, x) => s + x[k], 0) / peerStats.length;

    const stylesTried = Object.keys(stat.styleMix).length;
    const groupStyles =
      peers.reduce((s, mm) => s + Object.keys(Stats.memberStats(mm.id).styleMix).length, 0) / peers.length;

    const labels = ["Total", "Avg/sess", "Best night", "Wins", "Styles tried"];
    const member = [stat.total, stat.avg, stat.best, stat.wins, stylesTried];
    const group = [avgKey("total"), avgKey("avg"), avgKey("best"), avgKey("wins"), groupStyles];

    const max = labels.map((_, i) => Math.max(member[i], group[i], 1));
    const memberN = member.map((v, i) => +(v / max[i] * 100).toFixed(1));
    const groupN = group.map((v, i) => +(v / max[i] * 100).toFixed(1));

    State.charts[canvasId] = new Chart(ctx, {
      type: "radar",
      data: {
        labels,
        datasets: [
          {
            label: m.name.split(" ")[0],
            data: memberN,
            backgroundColor: m.color + "55",
            borderColor: m.color,
            borderWidth: 2,
            pointBackgroundColor: m.color
          },
          {
            label: "Brain Trust avg",
            data: groupN,
            backgroundColor: "rgba(255,255,255,0.05)",
            borderColor: "#b3a78f",
            borderWidth: 2,
            borderDash: [4, 4],
            pointBackgroundColor: "#b3a78f"
          }
        ]
      },
      options: {
        ...this.baseOpts(),
        scales: {
          r: {
            beginAtZero: true,
            min: 0,
            max: 100,
            ticks: { display: false },
            grid: { color: "rgba(255,255,255,0.06)" },
            angleLines: { color: "rgba(255,255,255,0.06)" },
            pointLabels: { color: "#f5ecd9", font: { size: 12 } }
          }
        }
      }
    });
  }
};

/* ---------- Boot ---------- */
window.addEventListener("hashchange", () => Router.render());
document.addEventListener("DOMContentLoaded", () => {
  State.load();
  if (!location.hash) location.hash = "#/";
  Router.render();
});

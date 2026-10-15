/* QuakeC Studio — coming soon page behaviour. No dependencies. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- storage (may be unavailable) ---------- */
  function load(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function save(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  /* ---------- "compiling" progress plaque ---------- */
  var TARGET = 42;
  var STAGES = [
    "Parsing defs.qc...",
    "Resolving entity fields...",
    "Precaching progs/player.mdl...",
    "Linking builtins...",
    "Coming soon. Stay frosty."
  ];

  var fill = document.getElementById("loader-fill");
  var bar = document.getElementById("loader-bar");
  var pct = document.getElementById("loader-pct");
  var status = document.getElementById("loader-status");

  function setProgress(value) {
    fill.style.width = value + "%";
    pct.textContent = value + "%";
    bar.setAttribute("aria-valuenow", String(value));
  }

  if (fill && bar && pct && status) {
    if (reduceMotion) {
      setProgress(TARGET);
      status.textContent = STAGES[STAGES.length - 1];
    } else {
      var current = 0;
      var stage = 0;
      var step = Math.ceil(TARGET / STAGES.length);
      var timer = window.setInterval(function () {
        current = Math.min(TARGET, current + step);
        setProgress(current);
        status.textContent = STAGES[Math.min(stage, STAGES.length - 1)];
        stage++;
        if (current >= TARGET && stage >= STAGES.length) window.clearInterval(timer);
      }, 650);
    }
  }

  /* ---------- site-wide visitor counter ---------- */
  // Each browser is counted once (POST); later visits just read the total (GET).
  // POSTs through CloudFront to a Lambda function URL must carry the body's
  // SHA-256; this is the hash of the empty body.
  var EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  var counter = document.getElementById("counter");
  var counterLabel = document.getElementById("counter-label");
  if (counter && window.fetch) {
    var isNew = load("qcs.counted") !== "1";
    window.fetch("/api/visit", {
      method: isNew ? "POST" : "GET",
      headers: isNew ? { "x-amz-content-sha256": EMPTY_SHA256 } : {},
      cache: "no-store"
    })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (typeof data.count !== "number") throw new Error("bad response");
        if (isNew) {
          save("qcs.counted", "1");
          if (counterLabel) counterLabel.textContent = "You are visitor no.";
        }
        counter.textContent = String(data.count).padStart(7, "0");
      })
      .catch(function () {
        counter.textContent = "???????";
      });
  }

  /* ---------- drop-down console ---------- */
  var consoleEl = document.getElementById("console");
  var log = document.getElementById("console-log");
  var form = document.getElementById("console-form");
  var input = document.getElementById("console-cmd");
  var toggleBtn = document.getElementById("console-toggle");
  if (!consoleEl || !log || !form || !input) return;

  var history = [];
  var historyPos = 0;
  var god = false;
  var noclip = false;

  function print(text, cls) {
    var line = document.createElement("div");
    if (cls) line.className = cls;
    line.textContent = text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }

  function isOpen() { return consoleEl.classList.contains("is-open"); }

  function openConsole() {
    consoleEl.hidden = false;
    // next frame so the slide transition runs
    window.requestAnimationFrame(function () {
      consoleEl.classList.add("is-open");
      input.focus();
    });
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
  }

  function closeConsole() {
    consoleEl.classList.remove("is-open");
    input.blur();
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
    window.setTimeout(function () {
      if (!isOpen()) consoleEl.hidden = true;
    }, reduceMotion ? 0 : 200);
  }

  function toggleConsole() { if (isOpen()) closeConsole(); else openConsole(); }

  var COMMANDS = {
    help: function () {
      print("Available commands:", "dim");
      print("  help       this text");
      print("  version    show build info");
      print("  about      what is QuakeC Studio?");
      print("  map <name> load a map");
      print("  god        toggle god mode");
      print("  noclip     toggle noclip");
      print("  impulse 9  you know what this does");
      print("  clear      clear the console");
      print("  quit       close the console");
    },
    version: function () {
      print("QuakeC Studio 0.0.1-prealpha (" + new Date().getFullYear() + ")");
      print("progs.dat CRC: pending", "dim");
    },
    about: function () {
      print("QuakeC Studio is a modern editor for QuakeC, the");
      print("language that drives the game logic of Quake (1996).");
      print("Highlighting, navigation, builds and launching, in one window.");
    },
    map: function (args) {
      var name = (args[0] || "").toLowerCase();
      if (!name) { print("map <levelname> : start a new game on a level", "dim"); return; }
      if (!/^[a-z0-9_]+$/.test(name)) { print("Invalid map name.", "err"); return; }
      print("Couldn't spawn server maps/" + name + ".bsp", "err");
      print("(the editor isn't finished yet)", "dim");
    },
    god: function () {
      god = !god;
      print(god ? "godmode ON" : "godmode OFF", god ? "ok" : null);
    },
    noclip: function () {
      noclip = !noclip;
      print(noclip ? "noclip ON" : "noclip OFF", noclip ? "ok" : null);
    },
    impulse: function (args) {
      if (args[0] === "9") print("You got all weapons! (none of them compile yet)", "ok");
      else if (args[0] === "255") print("Quad damage applied to the dev team. ETA unchanged.", "ok");
      else print("Nothing happens.", "dim");
    },
    clear: function () { log.textContent = ""; },
    quit: function () { closeConsole(); },
    exit: function () { closeConsole(); }
  };

  function run(raw) {
    var line = raw.trim();
    if (!line) return;
    print("]" + line, "dim");
    var parts = line.split(/\s+/);
    var cmd = parts.shift().toLowerCase();
    var fn = Object.prototype.hasOwnProperty.call(COMMANDS, cmd) ? COMMANDS[cmd] : null;
    if (fn) fn(parts);
    else print("Unknown command \"" + cmd + "\"", "err");
  }

  print("QuakeC Studio console initialized.", "ok");
  print("Type \"help\" for a list of commands.", "dim");

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = input.value;
    if (value.trim()) {
      history.push(value);
      historyPos = history.length;
    }
    input.value = "";
    run(value);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowUp" && history.length) {
      historyPos = Math.max(0, historyPos - 1);
      input.value = history[historyPos];
      e.preventDefault();
    } else if (e.key === "ArrowDown" && history.length) {
      historyPos = Math.min(history.length, historyPos + 1);
      input.value = history[historyPos] || "";
      e.preventDefault();
    } else if (e.key === "Tab") {
      var partial = input.value.trim().toLowerCase();
      var match = Object.keys(COMMANDS).filter(function (c) { return partial && c.indexOf(partial) === 0; });
      if (match.length === 1) input.value = match[0] + " ";
      else if (match.length > 1) print(match.join("  "), "dim");
      e.preventDefault();
    }
  });

  document.addEventListener("keydown", function (e) {
    var isTilde = e.key === "`" || e.key === "~" || e.code === "Backquote";
    if (isTilde && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      toggleConsole();
    } else if (e.key === "Escape" && isOpen()) {
      closeConsole();
    }
  });

  if (toggleBtn) toggleBtn.addEventListener("click", toggleConsole);
})();

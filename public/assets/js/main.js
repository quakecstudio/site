/* QuakeC Studio — site behaviour. No dependencies. */
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

  /* ---------- looping clips ---------- */
  // Clips play only while on screen, and never start by themselves under
  // reduced motion. Without this script each clip keeps its native controls.
  var clips = Array.prototype.slice.call(document.querySelectorAll("video.clip__video"));
  clips.forEach(function (video) {
    var frame = document.createElement("div");
    frame.className = "clip__frame";
    video.parentNode.insertBefore(frame, video);
    frame.appendChild(video);
    video.controls = false;

    var button = document.createElement("button");
    button.type = "button";
    button.className = "clip__toggle";
    frame.appendChild(button);

    video.dataset.wanted = reduceMotion ? "0" : "1";
    function label() {
      var playing = !video.paused;
      button.textContent = playing ? "❚❚ pause" : "► play";
      button.setAttribute("aria-label", (playing ? "Pause" : "Play") + " clip");
    }
    button.addEventListener("click", function () {
      if (video.paused) { video.dataset.wanted = "1"; video.play().catch(function () {}); }
      else { video.dataset.wanted = "0"; video.pause(); }
    });
    video.addEventListener("play", label);
    video.addEventListener("pause", label);
    label();
  });

  if (clips.length && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target;
        if (entry.isIntersecting && video.dataset.wanted === "1") video.play().catch(function () {});
        else if (!entry.isIntersecting) video.pause();
      });
    }, { threshold: 0.4 });
    clips.forEach(function (video) { observer.observe(video); });
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
      print("  download   where to get it");
      print("  god        toggle god mode");
      print("  noclip     toggle noclip");
      print("  impulse 9  you know what this does");
      print("  clear      clear the console");
      print("  quit       close the console");
    },
    version: function () {
      print("QuakeC Studio 2026.11.2");
      print("progs.dat compiled: 0 errors, 0 warnings", "dim");
    },
    about: function () {
      print("QuakeC Studio is a modern editor for QuakeC, the");
      print("language that drives the game logic of Quake (1996).");
      print("Write code, press Play, see it change in the running game.");
      print("Compiler, debugger, agent and map editor built in.");
    },
    map: function (args) {
      var name = (args[0] || "").toLowerCase();
      if (!name) { print("map <levelname> : start a new game on a level", "dim"); return; }
      if (!/^[a-z0-9_]+$/.test(name)) { print("Invalid map name.", "err"); return; }
      print("Couldn't spawn server maps/" + name + ".bsp", "err");
      print("(this is a web page; the real thing is a download away)", "dim");
      print("Type \"download\".", "dim");
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
      if (args[0] === "9") print("You got all weapons! (they all compile)", "ok");
      else if (args[0] === "255") print("Quad damage! Hot reload in 81 ms.", "ok");
      else print("Nothing happens.", "dim");
    },
    download: function () {
      print("Opening /download/...", "ok");
      window.location.href = "/download/";
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

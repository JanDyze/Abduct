/*
 * Abduct player bridge: lets Abduct put its own controls over this player (components/cinema.tsx,
 * lib/titles/player-bridge.ts). It isn't part of the Abduct app: it goes on the player's page,
 * after JW Player is set up, e.g. <script src="/static/abduct-bridge.js"></script>.
 *
 * Abduct sends { abduct: 1, cmd } messages: hello, play, pause, seek (value: seconds),
 * mute (value: true/false) and controls (value: true/false, the player's own controls). The
 * bridge answers hello with "ready" and then reports every change as "state":
 * { abduct: 1, type, playing, buffering, ended, time, duration, muted }.
 *
 * Only pages listed in ABDUCT can drive the player, and only when they embed it.
 */
(function () {
  // Where Abduct runs: put the production address here (the same as its SITE_URL).
  var ABDUCT = ["https://abduct.example.com", "http://localhost:3000"];

  var abduct = null; // the Abduct address that said hello
  var hooked = null;
  var lastTime = 0;

  function player() {
    var p = window.jwplayer && window.jwplayer();
    return p && typeof p.getState === "function" ? p : null;
  }

  function tell(type) {
    var p = player();
    if (!p || !abduct) return;
    var state = p.getState();
    window.parent.postMessage(
      {
        abduct: 1,
        type: type,
        playing: state === "playing",
        buffering: state === "buffering",
        ended: state === "complete",
        time: p.getPosition() || 0,
        duration: p.getDuration() || 0,
        muted: !!p.getMute(),
      },
      abduct
    );
  }

  function hook(p) {
    if (hooked === p) return;
    hooked = p;
    ["play", "pause", "buffer", "idle", "complete", "seeked", "mute", "meta", "firstFrame"].forEach(function (event) {
      p.on(event, function () {
        tell("state");
      });
    });
    // Four times a second is plenty for a scrubber.
    p.on("time", function () {
      var now = Date.now();
      if (now - lastTime < 250) return;
      lastTime = now;
      tell("state");
    });
  }

  window.addEventListener("message", function (e) {
    var m = e.data;
    if (e.source !== window.parent || ABDUCT.indexOf(e.origin) < 0 || !m || m.abduct !== 1) return;
    var p = player();
    if (!p) return; // not set up yet; Abduct keeps saying hello until it is
    abduct = e.origin;
    hook(p);
    if (m.cmd === "hello") tell("ready");
    else if (m.cmd === "play") p.play();
    else if (m.cmd === "pause") p.pause();
    else if (m.cmd === "seek" && typeof m.value === "number") p.seek(m.value);
    else if (m.cmd === "mute") p.setMute(!!m.value);
    else if (m.cmd === "controls") p.setControls(!!m.value);
  });
})();

(function () {
  var APPLE = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/";
  var unpatch = null;
  var told = false;

  function say(t) {
    try { vendetta.ui.toasts.showToast(t); } catch (e) {}
  }

  function code(s) {
    var out = [];
    var chars = Array.from(s);
    for (var i = 0; i < chars.length; i++) {
      out.push(chars[i].codePointAt(0).toString(16).padStart(4, "0"));
    }
    return out.join("-");
  }

  function fix(nodes) {
    if (!Array.isArray(nodes)) return;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (!n || typeof n !== "object") continue;
      if (n.type === "emoji" && n.surrogate && typeof n.surrogate === "string") {
        var url = APPLE + code(n.surrogate) + ".png";
        var jumbo = typeof n.jumboable === "boolean" ? n.jumboable : false;
        nodes[i] = {
          type: "customEmoji",
          id: "0",
          alt: n.content || n.surrogate,
          src: url,
          frozenSrc: url,
          jumboable: jumbo,
        };
        if (!told) {
          told = true;
          say("Apple Emoji: emoji badle gaye");
        }
        continue;
      }
      if (Array.isArray(n.content)) fix(n.content);
    }
  }

  function patchRows(args) {
    try {
      if (typeof args[1] !== "string") return;
      var rows = JSON.parse(args[1]);
      for (var i = 0; i < rows.length; i++) {
        var m = rows[i] && rows[i].message;
        if (!m) continue;
        fix(m.content);
        if (m.referencedMessage && m.referencedMessage.message) {
          fix(m.referencedMessage.message.content);
        }
      }
      args[1] = JSON.stringify(rows);
    } catch (e) {}
  }

  return {
    onLoad: function () {
      try {
        var RN = vendetta.metro.common.ReactNative;
        var CM = RN.NativeModules.DCDChatManager || RN.NativeModules.NativeChatModule;
        if (CM && typeof CM.updateRows === "function") {
          unpatch = vendetta.patcher.before("updateRows", CM, patchRows);
        } else {
          say("Apple Emoji: updateRows NAHI mila");
        }
      } catch (e) {
        say("Apple Emoji: error - " + String(e).slice(0, 80));
      }
    },
    onUnload: function () {
      if (unpatch) unpatch();
      unpatch = null;
    },
  };
})()
      

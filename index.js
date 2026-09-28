(function () {
  var APPLE = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/64/";
  var unpatch = null;
  var shown = false;

  function say(t) {
    try { vendetta.ui.toasts.showToast(t); } catch (e) {}
  }

  function dump(t) {
    try {
      setTimeout(function () {
        vendetta.ui.alerts.showConfirmationAlert({
          title: "Apple Emoji debug",
          content: t,
          confirmText: "OK",
          onConfirm: function () {},
        });
      }, 600);
    } catch (e) {}
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
      var t = String(n.type || "").toLowerCase();
      if (t.indexOf("emoji") !== -1 && !shown) {
        shown = true;
        dump(JSON.stringify(n).slice(0, 600));
      }
      if (n.type === "emoji" && !n.id) {
        var uni = n.surrogate || n.alt;
        if (uni && typeof uni === "string") {
          var url = APPLE + code(uni) + ".png";
          n.src = url;
          if ("frozenSrc" in n) n.frozenSrc = url;
        }
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
      say("Apple Emoji: plugin chalu hua");
      try {
        var RN = vendetta.metro.common.ReactNative;
        var CM = RN.NativeModules.DCDChatManager || RN.NativeModules.NativeChatModule;
        if (CM && typeof CM.updateRows === "function") {
          unpatch = vendetta.patcher.before("updateRows", CM, patchRows);
          say("Apple Emoji: updateRows mila");
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
      

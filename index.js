// language: JavaScript, file: index.js
const { React } = require("@vendetta/metro/common");
const { findByName, findByProps } = require("@vendetta/metro");
const { after } = require("@vendetta/patcher");
const { storage } = require("@vendetta/plugin");
const { Image } = require("react-native");

storage.enabled ??= true;
storage.size ??= 20;
storage.cdn ??= "https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-160";

const EMOJI_RE =
  /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*)/gu;

function toCodePoints(emoji) {
  const out = [];
  for (const ch of emoji) {
    const cp = ch.codePointAt(0);
    if (cp === undefined || cp === 0xfe0f) continue;
    out.push(cp.toString(16));
  }
  return out.join("-");
}

function emojiUri(emoji) {
  return `${storage.cdn}/${toCodePoints(emoji)}.png`;
}

function transformNode(node, size, keyBase = "ae") {
  if (typeof node === "string") {
    const parts = [];
    let last = 0;
    for (const m of node.matchAll(EMOJI_RE)) {
      const idx = m.index ?? 0;
      if (idx > last) parts.push(node.slice(last, idx));
      parts.push({ __emoji: m[0] });
      last = idx + m[0].length;
    }
    if (last < node.length) parts.push(node.slice(last));
    if (parts.length === 1 && typeof parts[0] === "string") return node;

    return parts.map((p, i) =>
      typeof p === "string"
        ? p
        : React.createElement(Image, {
            key: `${keyBase}-${i}`,
            source: { uri: emojiUri(p.__emoji) },
            style: { width: size, height: size },
          }),
    );
  }

  if (Array.isArray(node))
    return node.map((n, i) => transformNode(n, size, `${keyBase}-${i}`));

  if (React.isValidElement(node) && node.props?.children)
    return React.cloneElement(
      node,
      { ...node.props },
      transformNode(node.props.children, size, `${keyBase}-c`),
    );

  return node;
}

const MessageContentModule =
  findByName("MessageContent") ??
  findByProps("MessageContent") ??
  findByProps("MessageContentInner");

const patches = [];

function onLoad() {
  if (!MessageContentModule) return;
  patches.push(
    after("default", MessageContentModule, (_args, ret) => {
      if (!storage.enabled) return ret;
      try {
        return transformNode(ret, storage.size);
      } catch {
        return ret;
      }
    }),
  );
}

function onUnload() {
  for (const unpatch of patches.splice(0)) unpatch();
}

const { Forms } = require("@vendetta/ui/components");
const { FormSection, FormRow, FormSwitch, FormInput } = Forms;

function settings() {
  const [, forceUpdate] = React.useReducer((x) => ~x, 0);
  const rerender = () => forceUpdate();

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      FormSection,
      { title: "Apple Emoji" },
      React.createElement(FormRow, {
        label: "Enabled",
        subLabel: "Swap unicode emoji to Apple images",
        trailing: React.createElement(FormSwitch, {
          value: storage.enabled,
          onValueChange: (v) => { storage.enabled = v; rerender(); },
        }),
      }),
      React.createElement(FormRow, {
        label: "Size (px)",
        subLabel: `current: ${storage.size}`,
        trailing: React.createElement(FormInput, {
          value: String(storage.size),
          keyboardType: "numeric",
          onChange: (v) => {
            const n = parseInt(v, 10);
            if (!Number.isNaN(n) && n > 0 && n < 128) storage.size = n;
            rerender();
          },
        }),
      }),
      React.createElement(FormRow, {
        label: "CDN base",
        subLabel: storage.cdn,
        trailing: React.createElement(FormInput, {
          value: storage.cdn,
          onChange: (v) => { storage.cdn = v.trim(); rerender(); },
        }),
      }),
    ),
  );
}

module.exports = { onLoad, onUnload, settings };
const { React } = require("@revenge-mod/revenge");
const { findByName, findByProps } = require("@revenge-mod/metro");
const { after } = require("@revenge-mod/patcher");
const { storage } = require("@revenge-mod/storage");

const { Image } = require("react-native");

storage.enabled ??= true;
storage.size ??= 20;
storage.cdn ??=
  "https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-160";

const EMOJI_RE =
  /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|\p{Emoji_Modifier})*)/gu;

function toCodePoints(emoji) {
  return [...emoji]
    .map(ch => ch.codePointAt(0))
    .filter(cp => cp !== 0xfe0f)
    .map(cp => cp.toString(16))
    .join("-");
}

function emojiUri(emoji) {
  return `${storage.cdn}/${toCodePoints(emoji)}.png`;
}

function transform(node, size, key = "apple-emoji") {
  if (typeof node === "string") {
    const parts = [];
    let last = 0;

    for (const match of node.matchAll(EMOJI_RE)) {
      const index = match.index ?? 0;

      if (index > last) {
        parts.push(node.slice(last, index));
      }

      parts.push({
        emoji: match[0]
      });

      last = index + match[0].length;
    }

    if (last < node.length) {
      parts.push(node.slice(last));
    }

    if (
      parts.length === 1 &&
      typeof parts[0] === "string"
    ) {
      return node;
    }

    return parts.map((part, i) => {
      if (typeof part === "string") {
        return part;
      }

      return React.createElement(Image, {
        key: `${key}-${i}`,
        source: {
          uri: emojiUri(part.emoji)
        },
        style: {
          width: size,
          height: size
        },
        resizeMode: "contain"
      });
    });
  }

  if (Array.isArray(node)) {
    return node.map((child, i) =>
      transform(
        child,
        size,
        `${key}-${i}`
      )
    );
  }

  if (
    React.isValidElement(node) &&
    node.props?.children
  ) {
    return React.cloneElement(
      node,
      node.props,
      transform(
        node.props.children,
        size,
        `${key}-child`
      )
    );
  }

  return node;
}

let unpatch = null;

function onLoad() {
  const MessageContent =
    findByName("MessageContent") ??
    findByProps("MessageContent") ??
    findByProps("MessageContentInner");

  if (!MessageContent) {
    console.log(
      "[Apple Emoji] MessageContent not found"
    );
    return;
  }

  unpatch = after(
    "default",
    MessageContent,
    (_args, result) => {
      if (!storage.enabled) {
        return result;
      }

      try {
        return transform(
          result,
          Number(storage.size) || 20
        );
      } catch (error) {
        console.error(
          "[Apple Emoji] Transform error:",
          error
        );

        return result;
      }
    }
  );
}

function onUnload() {
  if (unpatch) {
    unpatch();
    unpatch = null;
  }
}

module.exports = {
  onLoad,
  onUnload
};
const path = require("path");
const exclusionList = require("metro-config/src/defaults/exclusionList");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
  new RegExp(`${path.resolve(__dirname, ".build-tools").replace(/[/\\]/g, "[/\\\\]")}.*`),
  new RegExp(`${path.resolve(__dirname, "android", "app", "build").replace(/[/\\]/g, "[/\\\\]")}.*`)
]);

module.exports = config;

const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../shared");

const config = getDefaultConfig(projectRoot);

// The design tokens, API client and domain rules live outside this app.
config.watchFolders = [...(config.watchFolders || []), sharedRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  ...(config.resolver.nodeModulesPaths || []),
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@vision/shared": path.resolve(sharedRoot, "src"),
};

module.exports = config;

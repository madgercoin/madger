const { withDangerousMod } = require('expo/config-plugins');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
module.exports = function withOfflineExpedition(config) {
  return withDangerousMod(config, ['android', async config => {
    const root = config.modRequest.projectRoot;
    execFileSync(process.execPath, [path.join(root, 'scripts/prepare-offline-game.mjs'), '--destination', path.join(config.modRequest.platformProjectRoot, 'app/src/main/assets/expedition')], { cwd: root, stdio: 'inherit' });
    return config;
  }]);
};

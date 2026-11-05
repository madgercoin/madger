// CI previews install beside the official app without replacing its local record.
// Explicit test profiles have separate identities; production keeps app.json identifiers.
module.exports = ({ config }) => {
  config = { ...config, extra: { ...config.extra, buildRevision: process.env.MADGER_BUILD_REVISION || 'local-development' } };
  if (process.env.MADGER_EXPEDITION_PREVIEW === '1') {
    return {
      ...config,
      name: 'MADGER Expedition',
      scheme: 'madger-expedition',
      android: { ...config.android, package: 'com.madgercoin.expedition.preview' },
    };
  }
  if (process.env.MADGER_ANDROID_PREVIEW !== '1') return config;
  return {
    ...config,
    name: 'MADGER Preview',
    scheme: 'madger-preview',
    android: { ...config.android, package: 'com.madgercoin.preview' },
  };
};

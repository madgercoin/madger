// CI previews install beside the official app without replacing its local record.
// Production and EAS builds keep the verified app.json identifiers unchanged.
module.exports = ({ config }) => {
  if (process.env.MADGER_ANDROID_PREVIEW !== '1') return config;
  return {
    ...config,
    name: 'MADGER Preview',
    scheme: 'madger-preview',
    android: { ...config.android, package: 'com.madgercoin.preview' },
  };
};

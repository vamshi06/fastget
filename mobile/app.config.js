module.exports = ({ config }) => {
  const isDev = process.env.APP_VARIANT === 'dev';
  return {
    ...config,
    name: isDev ? 'FastGet Dev' : config.name,
    android: {
      ...config.android,
      package: isDev ? 'in.fastget.app.dev' : config.android.package,
    },
  };
};
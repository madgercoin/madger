/** Serve the production site exclusively from the verified static asset bundle. */
export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  }
};

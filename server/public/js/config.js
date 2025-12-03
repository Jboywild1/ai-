window.Config = {
  apiBase: (typeof location !== 'undefined' && location.hostname === 'localhost')
    ? 'http://localhost:3000/api'
    : '/api',
  marketPollMs: 5000
};

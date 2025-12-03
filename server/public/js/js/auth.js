window.Auth = {
  async signup(payload) {
    try {
      const res = await window.API.signup(payload);
      localStorage.setItem('token', res.token);
      return true;
    } catch (e) {
      alert(e.message);
      return false;
    }
  },

  async login(email, password) {
    try {
      const res = await window.API.login(email, password);
      localStorage.setItem('token', res.token);
      return true;
    } catch (e) {
      alert(e.message);
      return false;
    }
  },

  logout() {
    localStorage.removeItem('token');
    location.href = '/index.html';
  },

  requireAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      location.href = '/index.html';
    }
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) logoutBtn.onclick = () => this.logout();
  }
};

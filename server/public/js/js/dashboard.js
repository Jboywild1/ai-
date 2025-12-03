(async function() {
  window.Auth.requireAuth();

  try {
    const portfolio = await window.API.portfolio();
    document.getElementById('portfolio-value').textContent = window.UI.fmtMoney(portfolio.totalValue);
    document.getElementById('cash').textContent = window.UI.fmtMoney(portfolio.cash);

    const holdingsTable = document.querySelector('#holdings-table tbody');
    window.UI.renderHoldings(holdingsTable, portfolio.holdings);

    // Render performance chart
    const canvas = document.getElementById('perfChart');
    window.Charts.renderPerformance(canvas, portfolio.history || []);
  } catch (e) {
    alert(e.message);
  }
})();

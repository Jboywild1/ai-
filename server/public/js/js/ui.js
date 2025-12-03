window.UI = {
  fmtMoney(n) {
    return `$${n.toFixed(2)}`;
  },

  fmtPct(n) {
    return `${n.toFixed(2)}%`;
  },

  renderHoldings(tableBody, holdings) {
    tableBody.innerHTML = '';
    for (const h of holdings) {
      const tr = document.createElement('tr');
      const pl = h.value - h.cost;
      tr.innerHTML = `
        <td>${h.assetId}</td>
        <td>${h.quantity}</td>
        <td>${this.fmtMoney(h.avgCost)}</td>
        <td>${this.fmtMoney(h.price)}</td>
        <td>${this.fmtMoney(h.value)}</td>
        <td class="${pl >= 0 ? 'positive' : 'negative'}">${this.fmtMoney(pl)}</td>
      `;
      tableBody.appendChild(tr);
    }
  },

  renderAssets(tableBody, assets) {
    tableBody.innerHTML = '';
    for (const a of assets) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.symbol}</td>
        <td>${a.name}</td>
        <td>${this.fmtMoney(a.price)}</td>
        <td class="${a.changePct >= 0 ? 'positive' : 'negative'}">${this.fmtPct(a.changePct)}</td>
        <td><button class="btn primary quick-buy" data-id="${a.id}">Buy</button></td>
      `;
      tableBody.appendChild(tr);
    }
  },

  renderTransactions(tableBody, txs) {
    tableBody.innerHTML = '';
    for (const t of txs) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${new Date(t.time).toLocaleString()}</td>
        <td>${t.assetId}</td>
        <td>${t.side}</td>
        <td>${t.quantity}</td>
        <td>${this.fmtMoney(t.price)}</td>

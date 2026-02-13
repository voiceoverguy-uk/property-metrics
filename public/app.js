const form = document.getElementById('dealForm');
const resultsPanel = document.getElementById('resultsPanel');
const costItemsList = document.getElementById('costItemsList');
const addCostItemBtn = document.getElementById('addCostItem');
const costItemsTotalEl = document.getElementById('costItemsTotal');

let costItems = [{ label: 'Refurb / Repairs', amount: 0 }];

function fmt(n) {
  if (n == null || isNaN(n)) return '\u00a30';
  return '\u00a3' + Math.round(n).toLocaleString('en-GB');
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '0.00%';
  return n.toFixed(2) + '%';
}

function yieldClass(y) {
  if (y >= 7) return 'good';
  if (y >= 4) return 'moderate';
  return 'low';
}

function getCostItemsTotal() {
  return costItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
}

function renderCostItems() {
  costItemsList.innerHTML = '';
  costItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'cost-item-row';
    row.innerHTML = `
      <input type="text" class="cost-item-label" value="${item.label}" placeholder="e.g. Decorating" data-index="${index}">
      <input type="number" class="cost-item-amount" value="${item.amount}" min="0" step="100" placeholder="0" data-index="${index}">
      ${costItems.length > 1 ? `<button type="button" class="btn-remove-item" data-index="${index}" title="Remove">&times;</button>` : '<span class="btn-remove-placeholder"></span>'}
    `;
    costItemsList.appendChild(row);
  });

  costItemsList.querySelectorAll('.cost-item-label').forEach(input => {
    input.addEventListener('input', (e) => {
      costItems[parseInt(e.target.dataset.index)].label = e.target.value;
    });
  });

  costItemsList.querySelectorAll('.cost-item-amount').forEach(input => {
    input.addEventListener('input', (e) => {
      costItems[parseInt(e.target.dataset.index)].amount = parseFloat(e.target.value) || 0;
      updateCostTotal();
    });
  });

  costItemsList.querySelectorAll('.btn-remove-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      costItems.splice(parseInt(e.target.dataset.index), 1);
      renderCostItems();
    });
  });

  updateCostTotal();
}

function updateCostTotal() {
  costItemsTotalEl.textContent = fmt(getCostItemsTotal());
}

addCostItemBtn.addEventListener('click', () => {
  costItems.push({ label: '', amount: 0 });
  renderCostItems();
  const labels = costItemsList.querySelectorAll('.cost-item-label');
  if (labels.length > 0) labels[labels.length - 1].focus();
});

renderCostItems();

function renderSDLTTable(breakdown) {
  if (!breakdown || !breakdown.bands || breakdown.bands.length === 0) {
    return '<p style="font-size:0.85rem;color:#777;">No SDLT due</p>';
  }
  let html = '<table class="sdlt-band-table"><thead><tr><th>Band</th><th class="rate-col">Rate</th><th class="amount-col">Tax</th></tr></thead><tbody>';
  for (const b of breakdown.bands) {
    html += `<tr>
      <td>${fmt(b.from)} \u2013 ${fmt(b.to)}</td>
      <td class="rate-col">${(b.rate * 100).toFixed(0)}%</td>
      <td class="amount-col">${fmt(b.tax)}</td>
    </tr>`;
  }
  html += '</tbody></table>';
  return html;
}

function renderCostBreakdownRows(data) {
  let html = '';
  html += `<div class="result-row"><span class="label">Purchase Price</span><span class="value">${fmt(data.breakdown.price)}</span></div>`;
  html += `<div class="result-row"><span class="label">SDLT</span><span class="value">${fmt(data.breakdown.sdlt)}</span></div>`;
  html += `<div class="result-row"><span class="label">Solicitor Fees</span><span class="value">${fmt(data.breakdown.solicitorFees)}</span></div>`;

  if (data.breakdown.costItems && data.breakdown.costItems.length > 0) {
    for (const item of data.breakdown.costItems) {
      if (item.amount > 0) {
        html += `<div class="result-row"><span class="label">${item.label || 'Cost item'}</span><span class="value">${fmt(item.amount)}</span></div>`;
      }
    }
  }

  html += `<div class="result-row total"><span class="label">Total Acquisition Cost</span><span class="value">${fmt(data.totalCost)}</span></div>`;
  return html;
}

function renderScenario(data, label, targetYield) {
  const offer = data.targetOffer;

  let offerHtml;
  if (offer && offer.achievable) {
    offerHtml = `
      <div class="offer-box">
        <div class="offer-label">Target Offer Price for ${fmtPct(targetYield)} Yield</div>
        <div class="offer-price">${fmt(offer.offerPrice)}</div>
        <div class="offer-note">To hit ${fmtPct(targetYield)} yield you'd need to pay around ${fmt(offer.offerPrice)}</div>
      </div>`;
  } else {
    offerHtml = `
      <div class="offer-box not-achievable">
        <div class="offer-label">Target Offer Price for ${fmtPct(targetYield)} Yield</div>
        <div class="offer-price">Not achievable with current inputs</div>
        <div class="offer-note">Try adjusting rent, costs, or target yield</div>
      </div>`;
  }

  return `
    <div class="result-section">
      <h3>SDLT \u2014 ${label}</h3>
      ${renderSDLTTable(data.sdltBreakdown)}
      <div class="result-row total">
        <span class="label">Total SDLT</span>
        <span class="value">${fmt(data.sdlt)}</span>
      </div>
    </div>

    <div class="result-section">
      <h3>Cost Breakdown</h3>
      ${renderCostBreakdownRows(data)}
    </div>

    <div class="result-section">
      <h3>Yield Analysis</h3>
      <div class="yield-cards">
        <div class="yield-card">
          <div class="yield-label">Gross Yield</div>
          <div class="yield-value ${yieldClass(data.grossYield)}">${fmtPct(data.grossYield)}</div>
        </div>
        <div class="yield-card">
          <div class="yield-label">Net Yield</div>
          <div class="yield-value ${yieldClass(data.netYield)}">${fmtPct(data.netYield)}</div>
        </div>
      </div>
      <div class="result-row"><span class="label">Annual Rent</span><span class="value">${fmt(data.annualRent)}</span></div>
      <div class="result-row"><span class="label">Net Annual Rent</span><span class="value">${fmt(data.netAnnualRent)}</span></div>
    </div>

    <div class="result-section">
      <h3>Target Offer Price</h3>
      ${offerHtml}
    </div>
  `;
}

function renderResults(result) {
  const address = document.getElementById('address').value || 'Property';
  const targetYield = result.targetYield;

  const html = `
    <div class="results-content">
      <h2>Deal Analysis</h2>
      <p class="address-line">${address}</p>

      <div class="scenario-tabs">
        <div class="scenario-tab active" data-view="comparison">Both Scenarios</div>
        <div class="scenario-tab" data-view="investor">Investor Only</div>
        <div class="scenario-tab" data-view="ftb">First-time Buyer Only</div>
      </div>

      <div id="view-comparison" class="view-content">
        <div class="comparison-grid">
          <div class="comparison-col">
            <h4>Investor / Additional Property</h4>
            ${renderScenario(result.investor, 'Investor', targetYield)}
          </div>
          <div class="comparison-col">
            <h4>First-time Buyer</h4>
            ${renderScenario(result.ftb, 'First-time Buyer', targetYield)}
          </div>
        </div>
      </div>

      <div id="view-investor" class="view-content" style="display:none;">
        ${renderScenario(result.investor, 'Investor / Additional Property', targetYield)}
      </div>

      <div id="view-ftb" class="view-content" style="display:none;">
        ${renderScenario(result.ftb, 'First-time Buyer', targetYield)}
      </div>
    </div>
  `;

  resultsPanel.innerHTML = html;

  const tabs = resultsPanel.querySelectorAll('.scenario-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.getAttribute('data-view');
      document.getElementById('view-comparison').style.display = view === 'comparison' ? '' : 'none';
      document.getElementById('view-investor').style.display = view === 'investor' ? '' : 'none';
      document.getElementById('view-ftb').style.display = view === 'ftb' ? '' : 'none';
    });
  });
}

async function runCalculation() {
  const price = parseFloat(document.getElementById('price').value);
  const monthlyRent = parseFloat(document.getElementById('monthlyRent').value);

  if (!price || price <= 0) {
    alert('Please enter a valid asking price.');
    return;
  }
  if (!monthlyRent || monthlyRent <= 0) {
    alert('Please enter a valid monthly rent.');
    return;
  }

  const totalAdditionalCosts = getCostItemsTotal();

  const body = {
    price,
    monthlyRent,
    solicitorFees: parseFloat(document.getElementById('solicitorFees').value) || 1500,
    refurbCosts: totalAdditionalCosts,
    otherCosts: 0,
    costItems: costItems.map(item => ({ label: item.label, amount: parseFloat(item.amount) || 0 })),
    voidMonths: parseFloat(document.getElementById('voidMonths').value) || 0,
    runningCosts: parseFloat(document.getElementById('runningCosts').value) || 0,
    targetYield: parseFloat(document.getElementById('targetYield').value) || 7.0,
  };

  resultsPanel.innerHTML = '<div class="results-placeholder"><p>Calculating...</p></div>';

  try {
    const res = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Calculation failed');
    }

    const result = await res.json();
    renderResults(result);
  } catch (err) {
    resultsPanel.innerHTML = `<div class="results-placeholder"><p style="color:#e74c3c;">Error: ${err.message}</p></div>`;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  runCalculation();
});

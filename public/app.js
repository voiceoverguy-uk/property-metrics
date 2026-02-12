const form = document.getElementById('dealForm');
const resultsPanel = document.getElementById('resultsPanel');

function fmt(n) {
  if (n == null || isNaN(n)) return '£0';
  return '£' + Math.round(n).toLocaleString('en-GB');
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

function renderSDLTTable(breakdown) {
  if (!breakdown || !breakdown.bands || breakdown.bands.length === 0) {
    return '<p style="font-size:0.85rem;color:#777;">No SDLT due</p>';
  }
  let html = '<table class="sdlt-band-table"><thead><tr><th>Band</th><th class="rate-col">Rate</th><th class="amount-col">Tax</th></tr></thead><tbody>';
  for (const b of breakdown.bands) {
    html += `<tr>
      <td>${fmt(b.from)} – ${fmt(b.to)}</td>
      <td class="rate-col">${(b.rate * 100).toFixed(0)}%</td>
      <td class="amount-col">${fmt(b.tax)}</td>
    </tr>`;
  }
  html += `</tbody></table>`;
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
      <h3>SDLT — ${label}</h3>
      ${renderSDLTTable(data.sdltBreakdown)}
      <div class="result-row total">
        <span class="label">Total SDLT</span>
        <span class="value">${fmt(data.sdlt)}</span>
      </div>
    </div>

    <div class="result-section">
      <h3>Cost Breakdown</h3>
      <div class="result-row"><span class="label">Purchase Price</span><span class="value">${fmt(data.breakdown.price)}</span></div>
      <div class="result-row"><span class="label">SDLT</span><span class="value">${fmt(data.breakdown.sdlt)}</span></div>
      <div class="result-row"><span class="label">Solicitor Fees</span><span class="value">${fmt(data.breakdown.solicitorFees)}</span></div>
      <div class="result-row"><span class="label">Refurb / Repairs</span><span class="value">${fmt(data.breakdown.refurbCosts)}</span></div>
      <div class="result-row"><span class="label">Other Costs</span><span class="value">${fmt(data.breakdown.otherCosts)}</span></div>
      <div class="result-row total"><span class="label">Total Acquisition Cost</span><span class="value">${fmt(data.totalCost)}</span></div>
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

  let html = `
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

form.addEventListener('submit', async (e) => {
  e.preventDefault();

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

  const body = {
    price,
    monthlyRent,
    solicitorFees: parseFloat(document.getElementById('solicitorFees').value) || 1500,
    refurbCosts: parseFloat(document.getElementById('refurbCosts').value) || 0,
    otherCosts: parseFloat(document.getElementById('otherCosts').value) || 0,
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
});

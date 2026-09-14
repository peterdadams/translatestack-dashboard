/* app.js — theme toggle, chart rendering, tier cards, calculator logic */

(function () {
  'use strict';

  /* ------------------------------------------------------------
     THEME TOGGLE
     ------------------------------------------------------------ */
  const root = document.documentElement;
  const toggleBtn = document.querySelector('[data-theme-toggle]');
  const sunPath =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moonPath =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function currentTheme() {
    return root.getAttribute('data-theme') || 'light';
  }

  function setToggleIcon() {
    if (!toggleBtn) return;
    const isDark = currentTheme() === 'dark';
    toggleBtn.innerHTML = isDark ? sunPath : moonPath;
    toggleBtn.setAttribute('aria-label', 'Switch to ' + (isDark ? 'light' : 'dark') + ' mode');
  }
  setToggleIcon();

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      setToggleIcon();
      renderAllCharts();
    });
  }

  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  function chartTextColor() {
    return cssVar('--color-text-muted');
  }
  function chartGridColor() {
    return currentTheme() === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  }
  function fontStack() {
    return getComputedStyle(document.body).fontFamily;
  }

  const TOOL_COLOR_VARS = [
    '--chart-libretranslate',
    '--chart-lingva',
    '--chart-ollama',
    '--chart-google',
    '--chart-deepl',
    '--chart-azure',
  ];
  function toolColors() {
    return TOOL_COLOR_VARS.map(cssVar);
  }

  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
  Chart.defaults.color = '#8d99a3';

  /* ------------------------------------------------------------
     FORMATTERS
     ------------------------------------------------------------ */
  function formatChars(n) {
    if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1) + 'B chars';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M chars';
    if (n >= 1_000) return Math.round(n / 1_000) + 'K chars';
    return Math.round(n) + ' chars';
  }
  function formatUSD(n) {
    if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    return '$' + n.toFixed(2).replace(/\.00$/, '');
  }

  /* ------------------------------------------------------------
     CHART REGISTRY (so we can destroy + recreate on theme switch)
     ------------------------------------------------------------ */
  const chartInstances = {};
  function makeChart(id, config) {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    if (chartInstances[id]) chartInstances[id].destroy();
    chartInstances[id] = new Chart(canvas.getContext('2d'), config);
    return chartInstances[id];
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ' ' + ctx.formattedValue,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: chartTextColor(), font: { size: 11 } },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: chartTextColor(), font: { size: 11 } },
        grid: { color: chartGridColor() },
      },
    },
  };

  function renderLatencyCharts() {
    const colors = toolColors();
    makeChart('chart-latency-100', {
      type: 'bar',
      data: {
        labels: LATENCY_MS.labels,
        datasets: [
          {
            label: 'ms',
            data: LATENCY_MS.short100,
            backgroundColor: colors,
            borderRadius: 5,
            maxBarThickness: 42,
          },
        ],
      },
      options: {
        ...barOptions,
        scales: {
          x: { ...barOptions.scales.x, ticks: { ...barOptions.scales.x.ticks, autoSkip: false, maxRotation: 32, minRotation: 0 } },
          y: { ...barOptions.scales.y, title: { display: true, text: 'milliseconds', color: chartTextColor(), font: { size: 11 } } },
        },
      },
    });

    makeChart('chart-latency-10k', {
      type: 'bar',
      data: {
        labels: LATENCY_MS.labels,
        datasets: [
          {
            label: 'ms',
            data: LATENCY_MS.batch10k,
            backgroundColor: colors,
            borderRadius: 5,
            maxBarThickness: 42,
          },
        ],
      },
      options: {
        ...barOptions,
        scales: {
          x: { ...barOptions.scales.x, ticks: { ...barOptions.scales.x.ticks, autoSkip: false, maxRotation: 32, minRotation: 0 } },
          y: { ...barOptions.scales.y, title: { display: true, text: 'milliseconds', color: chartTextColor(), font: { size: 11 } } },
        },
      },
    });
  }

  function renderAccuracyCharts() {
    const colors = toolColors();
    makeChart('chart-bleu', {
      type: 'bar',
      data: {
        labels: ACCURACY_GENERAL.labels,
        datasets: [
          {
            data: ACCURACY_GENERAL.bleu,
            backgroundColor: [colors[0], colors[3], colors[4]],
            borderRadius: 5,
            maxBarThickness: 56,
          },
        ],
      },
      options: {
        ...barOptions,
        indexAxis: 'y',
        scales: {
          x: { beginAtZero: true, max: 40, ticks: { color: chartTextColor() }, grid: { color: chartGridColor() }, title: { display: true, text: 'BLEU score', color: chartTextColor(), font: { size: 11 } } },
          y: { ticks: { color: chartTextColor() }, grid: { display: false } },
        },
      },
    });

    makeChart('chart-comet', {
      type: 'bar',
      data: {
        labels: ACCURACY_DOMAIN.labels,
        datasets: [
          {
            data: ACCURACY_DOMAIN.cometQe,
            backgroundColor: [colors[3], colors[4], colors[2]],
            borderRadius: 5,
            maxBarThickness: 56,
          },
        ],
      },
      options: {
        ...barOptions,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const i = ctx.dataIndex;
                return [
                  ' COMET-QE: ' + ctx.formattedValue,
                  ' latency: ' + ACCURACY_DOMAIN.avgLatencyMs[i] + ' ms',
                  ' throughput: ' + ACCURACY_DOMAIN.throughputCharsSec[i] + ' chars/s',
                ];
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() }, title: { display: true, text: 'COMET-QE (less negative = better)', color: chartTextColor(), font: { size: 11 } } },
          y: { ticks: { color: chartTextColor() }, grid: { display: false } },
        },
      },
    });
  }

  /* ------------------------------------------------------------
     HOSTING TIER CARDS
     ------------------------------------------------------------ */
  function renderTierCards() {
    const libreGrid = document.getElementById('libre-tier-grid');
    if (libreGrid) {
      libreGrid.innerHTML = LIBRETRANSLATE_TIERS.map(
        (t) => `
        <div class="tier-card">
          <div class="tier-card-head">
            <span class="tier-name">${t.name}</span>
            <span class="tier-cost">${formatUSD(t.cost)}<span>/mo</span></span>
          </div>
          <div class="tier-specs">
            <div class="row"><span>Hardware</span><span>${t.specs}</span></div>
            <div class="row"><span>Capacity</span><span>${t.reqPerSec} req/s</span></div>
          </div>
        </div>`
      ).join('');
    }
    const ollamaGrid = document.getElementById('ollama-tier-grid');
    if (ollamaGrid) {
      ollamaGrid.innerHTML = OLLAMA_GPU_WORKERS.map(
        (w) => `
        <div class="tier-card">
          <div class="tier-card-head">
            <span class="tier-name">${w.name}</span>
            <span class="tier-cost">${formatUSD(w.hourly * 730)}<span>/mo</span></span>
          </div>
          <div class="tier-specs">
            <div class="row"><span>Hardware</span><span>${w.specs}</span></div>
            <div class="row"><span>Throughput</span><span>${w.charsPerSec} chars/s</span></div>
            <div class="row"><span>On-demand rate</span><span>$${w.hourly.toFixed(2)}/hr</span></div>
          </div>
        </div>`
      ).join('');
    }
  }

  /* ------------------------------------------------------------
     SOURCES LIST
     ------------------------------------------------------------ */
  const SOURCE_LABELS = {
    googlePricing: 'Google Cloud Translation — pricing',
    googleFree: 'Google Cloud Translation — overview & free tier',
    deeplPlans: 'DeepL — API plans',
    deeplBilling: 'DeepL — character count & billing',
    deeplPricingGuide: 'DeepL API pricing breakdown (Langbly)',
    azurePricing: 'Azure AI Translator — official pricing',
    azureBenchmarks: 'Azure AI Translator review & pricing (APIbenchmarks)',
    azurePlaybook: 'Azure AI Translator — per-feature cost breakdown',
    libreHostingTiers: 'LibreTranslate hosting tiers & cost (Langbly)',
    libreModelSize: 'LibreTranslate Docker deployment notes (Railway)',
    libreApiSpec: 'LibreTranslate API reference (text/html only)',
    lingvaRepo: 'Lingva Translate — GitHub repository',
    lingvaReview: 'Lingva Translate review (CanIReplaceIt)',
    ollamaVram: 'Llama 3.1 8B — VRAM & hardware requirements',
    ollamaHardware: 'Ollama hardware requirements guide',
    runpodPricing: 'RunPod — GPU cloud pricing',
    lambdaPricing: 'Lambda — GPU cloud pricing',
    hetznerLlmCost: 'Self-hosted LLM vs. API break-even analysis',
    bleuComparison: 'LibreTranslate BLEU comparison vs. Google/DeepL',
    latencyBenchmark: 'Translation API latency benchmark (wxrks.com)',
    latencyBenchmark2: 'DeepL vs. Google Cloud vs. Azure comparison',
    llmDomainBenchmark: 'Translation model benchmark — video transcripts (COMET-QE)',
    clinicalDomainStudy: 'LLMs vs. traditional MT — clinical domain study (PMC)',
    wmtLongText: 'Benchmarking long-text translation with LLMs (ACL Findings 2024)',
    i18nFormats: 'i18n file formats — JSON vs. XLIFF vs. PO vs. YAML',
    azureDocFormats: 'Azure Document Translation — supported formats',
    deeplDocFormats: 'DeepL Document API — upload & translate reference',
    googleDocFormats: 'Google Cloud Translation — supported formats',
    llmBreakEvenFraming: 'LLM break-even framing (NavyaAI)',
    selfHostedToolsSurvey: 'Self-hosted AI tools vs. SaaS cost survey',
  };

  function renderSources() {
    const list = document.getElementById('sources-list');
    if (!list) return;
    list.innerHTML = Object.keys(SOURCES)
      .map((key) => {
        const url = SOURCES[key];
        const label = SOURCE_LABELS[key] || key;
        const host = (() => {
          try {
            return new URL(url).hostname.replace('www.', '');
          } catch (e) {
            return '';
          }
        })();
        return `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a> — ${host}</li>`;
      })
      .join('');
  }

  /* ------------------------------------------------------------
     BREAK-EVEN CALCULATOR
     ------------------------------------------------------------ */
  const VOL_MIN = 100_000;
  const VOL_MAX = 1_000_000_000;
  const SECONDS_PER_MONTH = 30 * 24 * 3600;

  function sliderToVolume(sliderVal) {
    const t = sliderVal / 100;
    return Math.round(VOL_MIN * Math.pow(VOL_MAX / VOL_MIN, t));
  }

  function requiredThroughput(vol, spike, reqSize) {
    const avgCharsPerSec = vol / SECONDS_PER_MONTH;
    const peakCharsPerSec = avgCharsPerSec * spike;
    const peakReqPerSec = peakCharsPerSec / reqSize;
    return { peakCharsPerSec, peakReqPerSec };
  }

  function selfHostCost(engineKey, vol, spike, reqSize) {
    const { peakCharsPerSec, peakReqPerSec } = requiredThroughput(vol, spike, reqSize);
    if (engineKey === 'libre') {
      const r = libreTierForThroughput(peakReqPerSec);
      return {
        cost: r.cost,
        tierName: r.tier.name + (r.replicas > 1 ? ` × ${r.replicas}` : ''),
        tierSpecs: r.tier.specs + (r.replicas > 1 ? ` (×${r.replicas} instances)` : ''),
        peakReqPerSec,
        peakCharsPerSec,
      };
    }
    const r = ollamaCostForThroughput(peakCharsPerSec);
    return {
      cost: r.cost,
      tierName: r.worker.name.replace(' (single worker)', '') + (r.workersNeeded > 1 ? ` × ${r.workersNeeded}` : ''),
      tierSpecs: r.worker.specs + (r.workersNeeded > 1 ? ` (×${r.workersNeeded} GPUs)` : ''),
      peakReqPerSec,
      peakCharsPerSec,
    };
  }

  function findBreakEven(cloudKey, engineKey, spike, reqSize) {
    const steps = 90;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      points.push(VOL_MIN * Math.pow(VOL_MAX / VOL_MIN, t));
    }
    let breakEvenVol = null;
    for (let i = points.length - 1; i >= 0; i--) {
      const vol = points[i];
      const cloud = cloudMonthlyCost(cloudKey, vol);
      const self = selfHostCost(engineKey, vol, spike, reqSize).cost;
      if (self <= cloud) {
        breakEvenVol = vol;
      } else {
        break;
      }
    }
    return breakEvenVol;
  }

  function buildCurveData(cloudKey, engineKey, spike, reqSize) {
    const steps = 48;
    const cloudPoints = [];
    const selfPoints = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const vol = VOL_MIN * Math.pow(VOL_MAX / VOL_MIN, t);
      cloudPoints.push({ x: vol, y: cloudMonthlyCost(cloudKey, vol) });
      selfPoints.push({ x: vol, y: selfHostCost(engineKey, vol, spike, reqSize).cost });
    }
    return { cloudPoints, selfPoints };
  }

  let selectedEngine = 'libre';

  function updateCalculator() {
    const volumeSlider = document.getElementById('input-volume');
    const spikeSlider = document.getElementById('input-spike');
    const reqSizeSlider = document.getElementById('input-reqsize');
    const cloudSelect = document.getElementById('input-cloud');
    if (!volumeSlider || !spikeSlider || !reqSizeSlider || !cloudSelect) return;

    const vol = sliderToVolume(Number(volumeSlider.value));
    const spike = Number(spikeSlider.value);
    const reqSize = Number(reqSizeSlider.value);
    const cloudKey = cloudSelect.value;

    document.getElementById('volume-display').textContent = formatChars(vol);
    document.getElementById('spike-display').textContent = spike + '×';
    document.getElementById('reqsize-display').textContent = reqSize.toLocaleString('en-US') + ' chars';

    const cloudCost = cloudMonthlyCost(cloudKey, vol);
    const self = selfHostCost(selectedEngine, vol, spike, reqSize);
    const diff = cloudCost - self.cost;

    document.getElementById('result-cloud-cost').textContent = formatUSD(cloudCost) + '/mo';
    document.getElementById('result-self-cost').textContent = formatUSD(self.cost) + '/mo';

    const savingsEl = document.getElementById('result-savings');
    const deltaEl = document.getElementById('result-savings-delta');
    if (diff >= 0) {
      savingsEl.textContent = formatUSD(diff) + '/mo';
      deltaEl.textContent = 'self-hosting saves this much';
      deltaEl.className = 'rk-delta up';
    } else {
      savingsEl.textContent = formatUSD(-diff) + '/mo';
      deltaEl.textContent = 'cloud API is cheaper here';
      deltaEl.className = 'rk-delta down';
    }

    const breakEven = findBreakEven(cloudKey, selectedEngine, spike, reqSize);
    const breakEvenEl = document.getElementById('result-breakeven');
    if (breakEven === null) {
      breakEvenEl.textContent = 'Not below 1B/mo';
    } else if (breakEven <= VOL_MIN) {
      breakEvenEl.textContent = '< ' + formatChars(VOL_MIN);
    } else {
      breakEvenEl.textContent = formatChars(breakEven);
    }

    document.getElementById('tier-name').textContent = self.tierName;
    document.getElementById('tier-specs').textContent = self.tierSpecs;

    renderBreakEvenChart(cloudKey, selectedEngine, spike, reqSize, vol);
  }

  function renderBreakEvenChart(cloudKey, engineKey, spike, reqSize, currentVol) {
    const { cloudPoints, selfPoints } = buildCurveData(cloudKey, engineKey, spike, reqSize);
    const maxY = Math.max(...cloudPoints.map((p) => p.y), ...selfPoints.map((p) => p.y)) * 1.08;
    const currentCloudCost = cloudMonthlyCost(cloudKey, currentVol);
    const currentSelfCost = selfHostCost(engineKey, currentVol, spike, reqSize).cost;

    makeChart('chart-breakeven', {
      type: 'line',
      data: {
        datasets: [
          {
            label: CLOUD_PROVIDERS[cloudKey].name,
            data: cloudPoints,
            borderColor: cssVar('--color-amber'),
            backgroundColor: cssVar('--color-amber'),
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0,
            stepped: false,
          },
          {
            label: engineKey === 'libre' ? 'LibreTranslate (self-hosted)' : 'Ollama + Llama 3 (self-hosted)',
            data: selfPoints,
            borderColor: cssVar('--color-primary'),
            backgroundColor: cssVar('--color-primary'),
            borderWidth: 2.5,
            pointRadius: 0,
            stepped: 'before',
          },
          {
            label: 'Your volume',
            data: [
              { x: currentVol, y: 0 },
              { x: currentVol, y: maxY },
            ],
            borderColor: cssVar('--color-text-faint'),
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: { color: chartTextColor(), boxWidth: 12, font: { size: 12 }, filter: (item) => item.text !== 'Your volume' },
          },
          tooltip: {
            callbacks: {
              title: (items) => (items.length ? formatChars(items[0].parsed.x) : ''),
              label: (ctx) => ' ' + ctx.dataset.label + ': ' + formatUSD(ctx.parsed.y) + '/mo',
            },
          },
        },
        scales: {
          x: {
            type: 'logarithmic',
            min: VOL_MIN,
            max: VOL_MAX,
            ticks: {
              color: chartTextColor(),
              font: { size: 11 },
              callback: (val) => {
                const allowed = [100000, 1000000, 10000000, 100000000, 1000000000];
                if (allowed.includes(val)) return formatChars(val);
                return null;
              },
            },
            grid: { color: chartGridColor() },
            title: { display: true, text: 'Monthly volume (characters, log scale)', color: chartTextColor(), font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            max: maxY,
            ticks: { color: chartTextColor(), font: { size: 11 }, callback: (v) => formatUSD(v) },
            grid: { color: chartGridColor() },
            title: { display: true, text: 'Monthly cost (USD)', color: chartTextColor(), font: { size: 11 } },
          },
        },
      },
    });
  }

  function wireCalculator() {
    const volumeSlider = document.getElementById('input-volume');
    const spikeSlider = document.getElementById('input-spike');
    const reqSizeSlider = document.getElementById('input-reqsize');
    const cloudSelect = document.getElementById('input-cloud');
    const toggleLibre = document.getElementById('toggle-libre');
    const toggleOllama = document.getElementById('toggle-ollama');

    [volumeSlider, spikeSlider, reqSizeSlider, cloudSelect].forEach((el) => {
      if (el) el.addEventListener('input', updateCalculator);
    });

    function setEngine(engine) {
      selectedEngine = engine;
      toggleLibre.setAttribute('aria-pressed', String(engine === 'libre'));
      toggleOllama.setAttribute('aria-pressed', String(engine === 'ollama'));
      updateCalculator();
    }
    if (toggleLibre) toggleLibre.addEventListener('click', () => setEngine('libre'));
    if (toggleOllama) toggleOllama.addEventListener('click', () => setEngine('ollama'));

    updateCalculator();
  }

  /* ------------------------------------------------------------
     INIT
     ------------------------------------------------------------ */
  function renderAllCharts() {
    renderLatencyCharts();
    renderAccuracyCharts();
    updateCalculator();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderTierCards();
    renderSources();
    renderLatencyCharts();
    renderAccuracyCharts();
    wireCalculator();
  });
})();

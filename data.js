/* data.js — researched figures used across the dashboard.
   Every numeric claim traces to a source URL in SOURCES (see #sources section). */

const SOURCES = {
  googlePricing: 'https://cloud.google.com/products/translate/pricing',
  googleFree: 'https://cloud.google.com/translate',
  deeplPlans: 'https://support.deepl.com/hc/en-us/articles/360021200939-DeepL-API-plans',
  deeplBilling: 'https://support.deepl.com/hc/en-us/articles/360020685720-Character-count-and-billing-in-DeepL-API',
  deeplPricingGuide: 'https://www.langbly.com/blog/deepl-api-pricing-guide/',
  azurePricing: 'https://azure.microsoft.com/en-us/pricing/details/translator/',
  azureBenchmarks: 'https://apibenchmarks.com/translation/azure-ai-translator',
  azurePlaybook: 'https://azure-cost-management-playbook.turbo360.com/docs/ai-translator',
  libreHostingTiers: 'https://langbly.com/blog/libretranslate-comparison/',
  libreModelSize: 'https://railway.com/deploy/libretranslate-1',
  libreApiSpec: 'https://docs.libretranslate.com/api/operations/translate/',
  lingvaRepo: 'https://github.com/thedaviddelta/lingva-translate',
  lingvaReview: 'https://canireplaceit.com/en/tools/lingva-translate',
  ollamaVram: 'https://localaimaster.com/models/llama-3-1-8b',
  ollamaHardware: 'https://lumadock.com/tutorials/ollama-hardware-requirements',
  runpodPricing: 'https://www.runpod.io/product/cloud-gpus',
  lambdaPricing: 'https://lambda.ai/pricing',
  hetznerLlmCost: 'https://renezander.com/guides/self-hosted-llm-vs-api/',
  bleuComparison: 'https://dibi8.com/resources/ai-tools/libretranslate/',
  latencyBenchmark: 'https://wxrks.com/blog/best-machine-translation-api',
  latencyBenchmark2: 'https://chatscontrol.com/blog/deepl-api-vs-google-cloud-vs-azure-translator-comparison',
  llmDomainBenchmark: 'https://bakalis.io/work/translation-model-benchmark-video-transcripts/',
  clinicalDomainStudy: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC13075536/',
  wmtLongText: 'https://aclanthology.org/2024.findings-acl.428.pdf',
  i18nFormats: 'https://intlpull.com/blog/i18n-file-formats-comparison-json-xliff-po-yaml-2026',
  azureDocFormats: 'https://learn.microsoft.com/en-us/azure/ai-services/translator/document-translation/overview',
  deeplDocFormats: 'https://developers.deepl.com/api-reference/document/upload-and-translate-a-document',
  googleDocFormats: 'https://docs.cloud.google.com/translate/docs/supported-formats',
  llmBreakEvenFraming: 'https://www.navyaai.com/guides/llm-break-even-point',
  selfHostedToolsSurvey: 'https://www.kunalganglani.com/blog/self-hosted-ai-tools-replace-saas',
};

/* -----------------------------------------------------------
   Commercial API pricing (source text characters)
   ----------------------------------------------------------- */
const CLOUD_PROVIDERS = {
  google: {
    name: 'Google Cloud Translation',
    freeChars: 500_000,
    perMillion: 20,
    baseFee: 0,
    source: SOURCES.googlePricing,
  },
  deepl: {
    name: 'DeepL API Pro',
    freeChars: 0,
    perMillion: 25,
    baseFee: 5.49,
    source: SOURCES.deeplPricingGuide,
  },
  azure: {
    name: 'Azure AI Translator',
    freeChars: 2_000_000,
    perMillion: 10,
    baseFee: 0,
    source: SOURCES.azurePlaybook,
  },
};

function cloudMonthlyCost(providerKey, monthlyChars) {
  const p = CLOUD_PROVIDERS[providerKey];
  const billable = Math.max(0, monthlyChars - p.freeChars);
  return p.baseFee + (billable / 1_000_000) * p.perMillion;
}

/* -----------------------------------------------------------
   Self-hosted infra tiers
   LibreTranslate: CPU tiers, req/s capacity -> flat monthly cost
   Ollama+Llama3: GPU workers, chars/s sustained throughput per worker
   ----------------------------------------------------------- */
const LIBRETRANSLATE_TIERS = [
  { name: 'Minimum viable', specs: '4 GB RAM · 2 vCPU', reqPerSec: 5, cost: 25 },
  { name: 'Production', specs: '8–16 GB RAM · 4 vCPU', reqPerSec: 17.5, cost: 75 },
  { name: 'High-throughput', specs: '32 GB RAM · 8 vCPU / GPU-assisted', reqPerSec: 50, cost: 350 },
];
// Source: langbly.com/blog/libretranslate-comparison

const OLLAMA_GPU_WORKERS = [
  { name: 'L4 24GB (single worker)', specs: '24 GB VRAM · RunPod/Lambda', charsPerSec: 200, hourly: 0.38 },
  { name: 'A10 24GB (single worker)', specs: '24 GB VRAM · Lambda on-demand', charsPerSec: 300, hourly: 0.75 },
  { name: 'A100 80GB (single worker)', specs: '80 GB VRAM · RunPod/Lambda', charsPerSec: 800, hourly: 2.2 },
];
// Throughput baseline from bakalis.io benchmark (~201 chars/s on a single mid-tier GPU worker);
// higher tiers scaled proportionally to published GPU pricing (runpod.io, lambda.ai).

function libreTierForThroughput(reqPerSec) {
  for (const t of LIBRETRANSLATE_TIERS) {
    if (reqPerSec <= t.reqPerSec) return { tier: t, replicas: 1, cost: t.cost };
  }
  const top = LIBRETRANSLATE_TIERS[LIBRETRANSLATE_TIERS.length - 1];
  const replicas = Math.ceil(reqPerSec / top.reqPerSec);
  return { tier: top, replicas, cost: top.cost * replicas };
}

function ollamaCostForThroughput(charsPerSec, workerKey = 'L4 24GB (single worker)') {
  const worker = OLLAMA_GPU_WORKERS.find((w) => w.name === workerKey) || OLLAMA_GPU_WORKERS[0];
  const workersNeeded = Math.max(1, Math.ceil(charsPerSec / worker.charsPerSec));
  const monthlyPerWorker = worker.hourly * 730;
  return { worker, workersNeeded, cost: workersNeeded * monthlyPerWorker };
}

/* -----------------------------------------------------------
   Latency (illustrative, aggregated from published benchmarks)
   ----------------------------------------------------------- */
const LATENCY_MS = {
  labels: ['LibreTranslate', 'Lingva', 'Ollama + Llama 3 8B', 'Google', 'DeepL', 'Azure'],
  short100: [130, 350, 2200, 190, 320, 90], // ms, single ~100-char request
  batch10k: [3400, 9800, 51000, 2600, 3100, 2100], // ms, ~10k-char batch (100 segments), single-worker/instance
  colors: [
    getComputedColor('--chart-libretranslate'),
    getComputedColor('--chart-lingva'),
    getComputedColor('--chart-ollama'),
    getComputedColor('--chart-google'),
    getComputedColor('--chart-deepl'),
    getComputedColor('--chart-azure'),
  ],
};
// Sources: wxrks.com/blog/best-machine-translation-api (Azure ~0.09s/segment median, DeepL ~1s/segment),
// bakalis.io benchmark (Google 1299ms avg / 477 chars/s, DeepL 851ms avg / 1341 chars/s, Llama 6088ms avg / 201 chars/s),
// LibreTranslate/Argos local inference ~120ms (dibi8.com). 10k-char batch figures are derived from per-engine
// throughput (chars/s) assuming serial single-worker processing — parallelizing requests reduces wall-clock time
// for cloud APIs and multi-worker self-hosted deployments.

function getComputedColor(varName) {
  if (typeof document === 'undefined') return '#888';
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#888';
}

/* -----------------------------------------------------------
   Accuracy / BLEU-ish quality snapshot (WMT14 En-De, Argos engine)
   ----------------------------------------------------------- */
const ACCURACY_GENERAL = {
  labels: ['LibreTranslate (Argos)', 'Google Translate', 'DeepL'],
  bleu: [22.4, 26.8, 28.1],
  source: SOURCES.bleuComparison,
};

const ACCURACY_DOMAIN = {
  // COMET-QE score, video-transcript domain benchmark (higher/less-negative = better)
  labels: ['Google', 'DeepL', 'Llama 3 (Ollama)'],
  cometQe: [-0.4813, -0.4863, -0.4481],
  avgLatencyMs: [1299, 851, 6088],
  throughputCharsSec: [477, 1341, 201],
  source: SOURCES.llmDomainBenchmark,
};

/* -----------------------------------------------------------
   i18n file-format support matrix
   Levels: native | pipeline | llm | none
   ----------------------------------------------------------- */
const FORMAT_SUPPORT = {
  columns: ['LibreTranslate', 'Lingva', 'Ollama + Llama 3', 'Google', 'DeepL', 'Azure'],
  rows: [
    {
      format: 'JSON',
      support: ['none', 'none', 'llm', 'none', 'native', 'none'],
      note: 'DeepL Document API accepts .json directly. Everyone else needs a key-extraction pipeline; an LLM can also work on JSON in place via careful prompting.',
    },
    {
      format: 'YAML',
      support: ['none', 'none', 'llm', 'none', 'none', 'none'],
      note: 'No engine here has native YAML support — extract strings with a library (e.g. i18next-parser) or prompt an LLM to preserve YAML structure.',
    },
    {
      format: 'PO / gettext',
      support: ['none', 'none', 'llm', 'none', 'none', 'none'],
      note: 'Requires a gettext-aware extraction step for all raw MT APIs; LLMs can be prompted to respect msgid/msgstr and comments.',
    },
    {
      format: 'XLIFF',
      support: ['none', 'none', 'llm', 'none', 'native', 'native'],
      note: 'Azure and DeepL both accept .xlf/.xliff directly through their document-translation endpoints (Azure: v1.0–1.2, DeepL: v1.2/2.0/2.1).',
    },
  ],
  sources: [SOURCES.i18nFormats, SOURCES.azureDocFormats, SOURCES.deeplDocFormats, SOURCES.googleDocFormats, SOURCES.libreApiSpec],
};

import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'dapurkasir-pos' });
});

interface InsightRequestBody {
  periodLabel?: string;
  totalRevenue?: number;
  previousRevenue?: number;
  orderCount?: number;
  avgOrderValue?: number;
  topProducts?: Array<{ name: string; qty: number; revenue: number }>;
  peakHourLabel?: string;
}

app.post('/api/insights', async (req, res) => {
  const body = (req.body || {}) as InsightRequestBody;
  const totalRevenue = Number(body.totalRevenue || 0);
  const previousRevenue = Number(body.previousRevenue || 0);
  const orderCount = Number(body.orderCount || 0);
  const avgOrderValue = Number(body.avgOrderValue || 0);
  const topProducts = Array.isArray(body.topProducts) ? body.topProducts.slice(0, 5) : [];
  const periodLabel = body.periodLabel || 'Periode ini';
  const peakHourLabel = body.peakHourLabel || '-';

  const deltaPct =
    previousRevenue > 0
      ? Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100)
      : null;

  const deterministicSummary = (() => {
    const topName = topProducts[0]?.name || 'menu unggulan';
    const trendText =
      deltaPct === null
        ? `Tercatat ${orderCount} transaksi dengan rata-rata Rp ${Math.round(avgOrderValue).toLocaleString('id-ID')}.`
        : deltaPct >= 0
          ? `Omzet naik ${deltaPct}% dibanding periode sebelumnya.`
          : `Omzet turun ${Math.abs(deltaPct)}% dibanding periode sebelumnya.`;
    return `${periodLabel}: ${trendText} Kontributor utama adalah ${topName} dengan jam tersibuk sekitar pukul ${peakHourLabel}.`;
  })();

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.json({
      insight: deterministicSummary,
      source: 'analytical',
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = [
      'Anda adalah analis bisnis kuliner untuk aplikasi kasir POS di Indonesia.',
      'Buat ringkasan insight bisnis dalam Bahasa Indonesia yang singkat, padat, dan actionable (maksimal 2 kalimat, tanpa markdown bold/bullet).',
      `Data ringkasan (${periodLabel}):`,
      `- Total omzet: Rp ${totalRevenue.toLocaleString('id-ID')}`,
      `- Omzet periode sebelumnya: Rp ${previousRevenue.toLocaleString('id-ID')}`,
      `- Jumlah transaksi: ${orderCount}`,
      `- Rata-rata nilai pesanan: Rp ${Math.round(avgOrderValue).toLocaleString('id-ID')}`,
      `- Jam ramai puncak: ${peakHourLabel}`,
      `- Menu terlaris: ${topProducts.map((p) => `${p.name} (${p.qty} porsi)`).join(', ') || 'Belum ada'}`,
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
    });

    const text = response.text?.trim();
    return res.json({
      insight: text || deterministicSummary,
      source: 'gemini',
    });
  } catch {
    return res.json({
      insight: deterministicSummary,
      source: 'analytical',
    });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist', 'index.html'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DapurKasir POS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

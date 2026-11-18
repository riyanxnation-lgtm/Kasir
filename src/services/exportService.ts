import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import type { Category, Order, OutletProfile, Product, Shift } from '../types/pos';
import {
  formatDateTimeWIB,
  formatRupiah,
  type AnalyticsSummary,
} from '../utils/posCalculations';

const ORDER_TYPE_LABEL: Record<Order['orderType'], string> = {
  dine_in: 'Makan di Tempat',
  takeaway: 'Bawa Pulang',
  delivery: 'Delivery',
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  ewallet: 'E-Wallet',
};

export function buildWhatsAppReceiptText(order: Order, outlet: OutletProfile): string {
  const lines: string[] = [
    `*${outlet.name}*`,
    outlet.address,
    `Telp: ${outlet.phone}`,
    '--------------------------------',
    `No Struk: ${order.orderNumber}`,
    `Antrean: #${order.queueNumber}`,
    `Waktu: ${formatDateTimeWIB(order.createdAt)}`,
    `Kasir: ${order.userName}`,
    `Tipe: ${ORDER_TYPE_LABEL[order.orderType]}${order.tableOrCustomerName ? ` (${order.tableOrCustomerName})` : ''}`,
    '--------------------------------',
  ];

  for (const item of order.items) {
    lines.push(`${item.qty}x ${item.productNameSnapshot} — ${formatRupiah(item.lineTotal)}`);
    if (item.modifiers.length > 0) {
      lines.push(`   + ${item.modifiers.map((m) => m.nameSnapshot).join(', ')}`);
    }
    if (item.note) {
      lines.push(`   Catatan: ${item.note}`);
    }
  }

  lines.push('--------------------------------');
  lines.push(`Subtotal: ${formatRupiah(order.subtotal)}`);
  if (order.discountAmount > 0) {
    lines.push(`Diskon (${order.discountName || 'Promo'}): -${formatRupiah(order.discountAmount)}`);
  }
  if (order.serviceAmount > 0) {
    lines.push(`Biaya Layanan (${outlet.serviceChargePercent}%): ${formatRupiah(order.serviceAmount)}`);
  }
  if (order.taxAmount > 0) {
    lines.push(`Pajak (${outlet.taxPercent}%): ${formatRupiah(order.taxAmount)}`);
  }
  lines.push(`*TOTAL: ${formatRupiah(order.total)}*`);
  for (const p of order.payments) {
    lines.push(`Bayar (${PAYMENT_LABEL[p.method] || p.method}): ${formatRupiah(p.amount)}`);
  }
  if (order.changeAmount > 0) {
    lines.push(`Kembalian: ${formatRupiah(order.changeAmount)}`);
  }
  lines.push('--------------------------------');
  lines.push(outlet.receiptFooter || 'Terima kasih!');
  return lines.join('\n');
}

export function downloadReceiptPDF(order: Order, outlet: OutletProfile): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 190],
  });

  let y = 10;
  const lineHeight = 4.6;
  const left = 6;
  const right = 74;

  const writeCenter = (text: string, size = 9, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.text(text, 40, y, { align: 'center' });
    y += lineHeight;
  };

  const writeRow = (l: string, r: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.text(l, left, y);
    doc.text(r, right, y, { align: 'right' });
    y += lineHeight;
  };

  writeCenter(outlet.name, 11, true);
  writeCenter(outlet.address.slice(0, 42), 7.5);
  writeCenter(`Telp: ${outlet.phone}`, 7.5);
  y += 1;
  doc.line(left, y, right, y);
  y += 4;

  writeRow('No Struk', order.orderNumber);
  writeRow('Antrean', `#${order.queueNumber}`);
  writeRow('Tanggal', formatDateTimeWIB(order.createdAt));
  writeRow('Kasir', order.userName.slice(0, 22));
  writeRow('Tipe', ORDER_TYPE_LABEL[order.orderType]);
  if (order.tableOrCustomerName) {
    writeRow('Pelanggan/Meja', order.tableOrCustomerName.slice(0, 22));
  }
  doc.line(left, y, right, y);
  y += 4;

  for (const item of order.items) {
    writeRow(`${item.qty}x ${item.productNameSnapshot.slice(0, 24)}`, formatRupiah(item.lineTotal));
    if (item.modifiers.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.text(`  + ${item.modifiers.map((m) => m.nameSnapshot).join(', ').slice(0, 38)}`, left, y);
      y += 3.8;
    }
  }

  doc.line(left, y, right, y);
  y += 4;
  writeRow('Subtotal', formatRupiah(order.subtotal));
  if (order.discountAmount > 0) {
    writeRow('Diskon', `-${formatRupiah(order.discountAmount)}`);
  }
  if (order.serviceAmount > 0) {
    writeRow(`Layanan (${outlet.serviceChargePercent}%)`, formatRupiah(order.serviceAmount));
  }
  if (order.taxAmount > 0) {
    writeRow(`Pajak (${outlet.taxPercent}%)`, formatRupiah(order.taxAmount));
  }
  writeRow('TOTAL', formatRupiah(order.total), true);
  for (const p of order.payments) {
    writeRow(PAYMENT_LABEL[p.method] || p.method, formatRupiah(p.amount));
  }
  if (order.changeAmount > 0) {
    writeRow('Kembalian', formatRupiah(order.changeAmount));
  }

  y += 3;
  writeCenter(outlet.receiptFooter.slice(0, 44) || 'Terima kasih!', 7.5);
  doc.save(`Struk-${order.orderNumber}.pdf`);
}

export function exportSalesReportExcel(
  orders: Order[],
  shifts: Shift[],
  summary: AnalyticsSummary,
  periodLabel: string
): void {
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    { Metrik: 'Periode', Nilai: periodLabel },
    { Metrik: 'Total Omzet', Nilai: summary.totalRevenue },
    { Metrik: 'Jumlah Transaksi', Nilai: summary.orderCount },
    { Metrik: 'Rata-rata Nilai Pesanan', Nilai: summary.avgOrderValue },
    { Metrik: 'Estimasi Laba Kotor', Nilai: summary.grossProfit },
    { Metrik: 'Transaksi Void', Nilai: summary.voidCount },
    { Metrik: 'Jam Tersibuk', Nilai: summary.peakHourLabel },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Ringkasan');

  const txRows = orders.map((o) => ({
    'No Struk': o.orderNumber,
    'Tanggal': formatDateTimeWIB(o.createdAt),
    'Kasir': o.userName,
    'Tipe Pesanan': ORDER_TYPE_LABEL[o.orderType],
    'Meja/Pelanggan': o.tableOrCustomerName || '-',
    'Status': o.status.toUpperCase(),
    'Subtotal': o.subtotal,
    'Diskon': o.discountAmount,
    'Layanan': o.serviceAmount,
    'Pajak': o.taxAmount,
    'Total': o.total,
    'Metode Bayar': o.payments.map((p) => PAYMENT_LABEL[p.method] || p.method).join(' + ') || '-',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), 'Transaksi');

  const menuRows = summary.topProducts.map((p, idx) => ({
    Peringkat: idx + 1,
    Menu: p.name,
    Kategori: p.categoryName,
    'Porsi Terjual': p.qty,
    Omzet: p.revenue,
    'Estimasi Laba': p.estimatedProfit,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(menuRows), 'Menu Terlaris');

  const shiftRows = shifts.map((s) => ({
    Kasir: s.userName,
    Buka: formatDateTimeWIB(s.openedAt),
    Tutup: s.closedAt ? formatDateTimeWIB(s.closedAt) : 'Masih Buka',
    'Modal Awal': s.openingCash,
    'Kas Seharusnya': s.expectedCash ?? '-',
    'Kas Aktual': s.actualCash ?? '-',
    Selisih: s.cashDifference ?? '-',
    Status: s.status === 'open' ? 'Aktif' : 'Ditutup',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(shiftRows), 'Laporan Shift');

  XLSX.writeFile(wb, `Laporan-DapurKasir-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportSalesReportCSV(orders: Order[]): void {
  const rows = orders.map((o) => ({
    NoStruk: o.orderNumber,
    Waktu: formatDateTimeWIB(o.createdAt),
    Kasir: o.userName,
    Tipe: ORDER_TYPE_LABEL[o.orderType],
    Status: o.status,
    Subtotal: o.subtotal,
    Diskon: o.discountAmount,
    Pajak: o.taxAmount,
    Layanan: o.serviceAmount,
    Total: o.total,
    MetodeBayar: o.payments.map((p) => p.method).join('+'),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Transaksi-DapurKasir-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportSalesReportPDF(
  outlet: OutletProfile,
  summary: AnalyticsSummary,
  periodLabel: string
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Laporan Penjualan — ${outlet.name}`, 16, y);
  y += 7;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Periode: ${periodLabel}   |   Dicetak: ${formatDateTimeWIB(new Date().toISOString())}`, 16, y);
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Ringkasan Kinerja', 16, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const kpis = [
    ['Total Omzet', formatRupiah(summary.totalRevenue)],
    ['Jumlah Transaksi', `${summary.orderCount} pesanan`],
    ['Rata-rata Nilai Pesanan', formatRupiah(summary.avgOrderValue)],
    ['Estimasi Laba Kotor', formatRupiah(summary.grossProfit)],
    ['Jam Tersibuk', summary.peakHourLabel],
  ];
  for (const [k, v] of kpis) {
    doc.text(k, 18, y);
    doc.text(v, 110, y);
    y += 6;
  }

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Top 10 Menu Terlaris', 16, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  for (const p of summary.topProducts.slice(0, 10)) {
    doc.text(`${p.name} (${p.categoryName})`, 18, y);
    doc.text(`${p.qty} porsi`, 125, y, { align: 'right' });
    doc.text(formatRupiah(p.revenue), 190, y, { align: 'right' });
    y += 5.5;
    if (y > 270) {
      doc.addPage();
      y = 18;
    }
  }

  doc.save(`Laporan-Penjualan-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function downloadMenuImportTemplate(): void {
  const sample = [
    { Nama: 'Nasi Uduk Komplit', Kategori: 'Nasi & Lauk', Harga: 29000, HargaPokok: 13000, SKU: 'NS-010', Tersedia: 'Ya' },
    { Nama: 'Es Kelapa Muda', Kategori: 'Minuman Segar', Harga: 16000, HargaPokok: 6000, SKU: 'MN-010', Tersedia: 'Ya' },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sample), 'Template Menu');
  XLSX.writeFile(wb, 'Template-Impor-Menu-DapurKasir.xlsx');
}

export async function parseMenuImportFile(
  file: File,
  existingCategories: Category[]
): Promise<{
  newCategories: Category[];
  newProducts: Product[];
}> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const catByName = new Map(existingCategories.map((c) => [c.name.trim().toLowerCase(), c]));
  const newCategories: Category[] = [];
  const newProducts: Product[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const name = String(r.Nama || r.nama || r.Name || '').trim();
    if (!name) continue;

    const catName = String(r.Kategori || r.kategori || r.Category || 'Umum').trim();
    const catKey = catName.toLowerCase();
    let cat = catByName.get(catKey);
    if (!cat) {
      cat = {
        id: `cat_imp_${Date.now()}_${i}`,
        outletId: 'main',
        name: catName,
        sortOrder: existingCategories.length + newCategories.length + 1,
        isActive: true,
      };
      catByName.set(catKey, cat);
      newCategories.push(cat);
    }

    const price = Math.max(0, Number(r.Harga || r.harga || r.Price || 0));
    const costPrice = Math.max(0, Number(r.HargaPokok || r.harga_pokok || r.Cost || 0));
    const sku = String(r.SKU || r.sku || `IMP-${i + 1}`).trim().slice(0, 40);
    const availRaw = String(r.Tersedia || r.tersedia || 'Ya').toLowerCase();
    const isAvailable = availRaw !== 'tidak' && availRaw !== 'habis' && availRaw !== 'false' && availRaw !== '0';

    newProducts.push({
      id: `prod_imp_${Date.now()}_${i}`,
      outletId: 'main',
      categoryId: cat.id,
      name: name.slice(0, 120),
      sku,
      price,
      costPrice,
      iconType: 'rice',
      modifierGroupIds: [],
      isAvailable,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  return { newCategories, newProducts };
}

export async function printThermalEscPos(
  order: Order,
  outlet: OutletProfile
): Promise<{ ok: boolean; message: string }> {
  const nav = navigator as unknown as {
    bluetooth?: {
      requestDevice: (opts: unknown) => Promise<{
        gatt?: {
          connect: () => Promise<{
            getPrimaryServices: () => Promise<Array<{
              getCharacteristics: () => Promise<Array<{
                properties: { write?: boolean; writeWithoutResponse?: boolean };
                writeValue: (data: BufferSource) => Promise<void>;
              }>>;
            }>>;
          }>;
        };
      }>;
    };
  };

  if (!nav.bluetooth) {
    return {
      ok: false,
      message: 'Web Bluetooth tidak didukung di browser ini. Gunakan Cetak Browser atau Simpan PDF.',
    };
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
    });
    const server = await device.gatt?.connect();
    if (!server) {
      return { ok: false, message: 'Gagal terhubung ke printer Bluetooth.' };
    }
    const services = await server.getPrimaryServices();
    let writableChar: { writeValue: (data: BufferSource) => Promise<void> } | null = null;
    for (const svc of services) {
      const chars = await svc.getCharacteristics();
      const found = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse);
      if (found) {
        writableChar = found;
        break;
      }
    }
    if (!writableChar) {
      return { ok: false, message: 'Karakteristik cetak ESC/POS tidak ditemukan pada printer.' };
    }

    const escInit = new Uint8Array([0x1b, 0x40]); // ESC @
    const text = buildWhatsAppReceiptText(order, outlet).replace(/\*/g, '') + '\n\n\n\x1d\x56\x00';
    const encoded = new TextEncoder().encode(text);
    await writableChar.writeValue(escInit);

    // Send in 100-byte BLE chunks
    for (let i = 0; i < encoded.length; i += 100) {
      await writableChar.writeValue(encoded.slice(i, i + 100));
    }
    return { ok: true, message: 'Struk berhasil dikirim ke printer thermal Bluetooth.' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Koneksi printer dibatalkan.';
    return { ok: false, message: `Printer tidak terhubung: ${msg}` };
  }
}

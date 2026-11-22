/* Gülpınar Derneği - bağımsız aidat sorgulama arayüzü
 * Apps Script URL'si tanımlanmıştır. Tam TCKN sorgu tablosuna yazılmaz.
 */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx1mNJ2FOlPgpdNIqfxhZoOl2jbRfkz9f621rnYTXmlncexmm7GGD2eu6ESLxmKlISGAQ/exec';

const $ = (id) => document.getElementById(id);
const form = $('queryForm');
const button = $('submitBtn');
const message = $('message');
const result = $('result');
const frame = $('apiFrame');

let activeRequest = '';

function validTCKN(value) {
  const s = String(value || '').replace(/\D/g, '');
  if (!/^[1-9]\d{10}$/.test(s)) return false;
  const d = s.split('').map(Number);
  const c10 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 -
    (d[1] + d[3] + d[5] + d[7])) % 10;
  const c11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return c10 === d[9] && c11 === d[10];
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function money(v) {
  return Number(v || 0).toLocaleString('tr-TR', {
    style: 'currency', currency: 'TRY'
  });
}

function dateTR(v) {
  if (!v) return '—';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(v))) return String(v);
  const d = new Date(v);
  return isNaN(d.getTime()) ? esc(v) : d.toLocaleDateString('tr-TR');
}

function setMessage(text, type = '') {
  message.textContent = text || '';
  message.className = 'message' + (type ? ' ' + type : '');
}

function sendRequest(tc) {
  return new Promise((resolve, reject) => {
    if (!APPS_SCRIPT_URL || !APPS_SCRIPT_URL.startsWith('https://script.google.com/macros/s/')) {
      reject(new Error('Kurulum eksik: app.js dosyasındaki Apps Script Web App URL bilgisini kontrol edin.'));
      return;
    }

    const cb = 'aidatQuery' + Date.now() + Math.random().toString(36).slice(2, 8);
    activeRequest = cb;
    const payload = JSON.stringify({ action: 'publicAidatSorgula', payload: { tc } });
    const f = document.createElement('form');
    f.method = 'POST';
    f.action = APPS_SCRIPT_URL + '?cb=' + encodeURIComponent(cb);
    f.target = 'apiFrame';
    f.style.display = 'none';
    const data = document.createElement('textarea');
    data.name = 'data';
    data.value = payload;
    f.appendChild(data);
    document.body.appendChild(f);

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Sunucudan yanıt alınamadı. Biraz sonra tekrar deneyin.'));
    }, 25000);

    function cleanup() {
      clearTimeout(timeout);
      window.removeEventListener('message', handler);
      f.remove();
    }

    function handler(event) {
      // Mesaj yalnızca bu isteğin hedef iframe'inden ve beklenen Google Apps Script
      // alan adlarından gelmeli. Rastgele callback kimliği de eşleştirilir.
      const trustedOrigin = event.origin === 'https://script.google.com' ||
        event.origin === 'https://script.googleusercontent.com' ||
        event.origin.endsWith('.googleusercontent.com');
      if (event.source !== frame.contentWindow || !trustedOrigin) return;
      const d = event.data;
      if (!d || d.gdpPost !== cb || cb !== activeRequest) return;
      cleanup();
      if (d.result && d.result.ok) resolve(d.result);
      else reject(new Error((d.result && d.result.message) || 'Sorgulama başarısız.'));
    }

    window.addEventListener('message', handler);
    f.submit();
  });
}

function renderResult(data) {
  const u = data.uye || {};
  // API'nin mevcut sözleşmesi: ozet yıllık satırları, toplam ise genel toplamları taşır.
  const rows = data.yillar || data.ozet || [];
  const totals = data.toplam || {};
  const totalDue = totals.TAHAKKUK != null
    ? totals.TAHAKKUK
    : rows.reduce((sum, x) => sum + Number(x.YILLIK_TUTAR || x.TAHAKKUK || 0), 0);
  const totalPaid = totals.ODENEN != null
    ? totals.ODENEN
    : (totals.TAHSILAT != null ? totals.TAHSILAT : rows.reduce((sum, x) => sum + Number(x.TAHSILAT || x.ODENEN || 0), 0));
  const totalBalance = totals.KALAN != null
    ? totals.KALAN
    : rows.reduce((sum, x) => sum + Number(x.KALAN || 0), 0);

  result.innerHTML = `
    <div class="member-head">
      <div>
        <h2>${esc(u.AD_SOYAD || u.AD || 'Üyemiz')}</h2>
        <p>Üyelik tarihi: ${dateTR(u.KAYIT_TARIHI)}${u.TELEFON_MASKELI ? ' · Telefon: ' + esc(u.TELEFON_MASKELI) : ''}</p>
      </div>
      <span class="status">ÜYE KAYDI BULUNDU</span>
    </div>
    <div class="summary">
      <div class="metric"><span>Toplam Tahakkuk</span><strong>${money(totalDue)}</strong></div>
      <div class="metric"><span>Toplam Ödenen</span><strong>${money(totalPaid)}</strong></div>
      <div class="metric"><span>Kalan Borç</span><strong>${money(totalBalance)}</strong></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>Yıl</th><th>Tahakkuk</th><th>Ödenen</th><th>Mahsup / Kapatılan</th><th>Kalan</th></tr></thead>
        <tbody>${rows.map(x => `
          <tr>
            <td>${esc(x.YIL)}</td>
            <td>${money(x.YILLIK_TUTAR != null ? x.YILLIK_TUTAR : x.TAHAKKUK)}</td>
            <td>${money(x.TAHSILAT != null ? x.TAHSILAT : x.ODENEN)}</td>
            <td>${money(x.KAPATILAN)}</td>
            <td class="${Number(x.KALAN) > 0 ? 'balance' : ''}">${money(x.KALAN)}</td>
          </tr>`).join('') || '<tr><td colspan="5">Aidat dönemi kaydı bulunamadı.</td></tr>'}
        </tbody>
      </table>
    </div>
    <div class="result-actions">
      <button type="button" onclick="window.print()">Yazdır</button>
      <button type="button" class="secondary" id="newQuery">Yeni Sorgulama</button>
    </div>`;

  result.hidden = false;
  $('newQuery').addEventListener('click', () => {
    result.hidden = true;
    $('tc').value = '';
    setMessage('');
    $('tc').focus();
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const tc = $('tc').value.replace(/\D/g, '');
  result.hidden = true;
  if (!validTCKN(tc)) {
    setMessage('Geçerli bir 11 haneli T.C. Kimlik Numarası girin.');
    $('tc').focus();
    return;
  }
  button.disabled = true;
  button.innerHTML = '<span>Sorgulanıyor…</span>';
  setMessage('Üyelik ve aidat bilgileriniz kontrol ediliyor…');
  try {
    const response = await sendRequest(tc);
    setMessage('Sorgulama tamamlandı.', 'success');
    renderResult(response);
  } catch (error) {
    setMessage(error.message || 'Sorgulama sırasında hata oluştu.');
  } finally {
    button.disabled = false;
    button.innerHTML = '<span>Sorgula</span><span aria-hidden="true">→</span>';
  }
});

$('tc').addEventListener('input', e => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
});

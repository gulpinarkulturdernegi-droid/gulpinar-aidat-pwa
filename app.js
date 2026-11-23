/* Gülpınar Derneği - Aidat Sorgulama PWA
 * API adresi ve sorgu sözleşmesi korunmuştur. Tam TCKN loglanmaz.
 */

// Banka bilgilerini dernek tarafından onaylanan bilgilerle doldurun.
// Boş bırakılırsa üyelere yanlış/uydurma IBAN gösterilmez.
const PAYMENT_INFO = {
  bankName: 'Ziraat Bankası',
  accountName: 'GÜLPINAR KÜLTÜR DAYANIŞMA VE YARDIMLAŞMA DERNEĞİ',
  iban: 'TR790001002310976690835001'
};

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyQSMEa5aoGgNdJhh3Qt9j9vfgWcysBkH3pbOL31ptb0XFtGuBG7tdmPqHpNXtHEzlNuw/exec';
const $ = (id) => document.getElementById(id);
const form = $('queryForm'), button = $('submitBtn'), message = $('message'), result = $('result');
const loadingScreen = $('loadingScreen');
let loadingTimer = null, loadingIndex = 0;
const loadingMessages = [
  'Gülpınar Derneği sistemine bağlanılıyor…',
  'Üyelik bilgileriniz güvenli şekilde kontrol ediliyor…',
  'Aidat kayıtları hazırlanıyor…',
  'Dayanışma bilgileriniz yükleniyor…'
];

function hideIntro() {
  window.setTimeout(() => loadingScreen.classList.add('done'), 900);
}
function showLoading() {
  loadingIndex = 0;
  $('loadingText').textContent = loadingMessages[0];
  loadingScreen.classList.remove('done');
  loadingTimer = window.setInterval(() => {
    loadingIndex = (loadingIndex + 1) % loadingMessages.length;
    $('loadingText').textContent = loadingMessages[loadingIndex];
  }, 1900);
}
function hideLoading() {
  if (loadingTimer) window.clearInterval(loadingTimer);
  loadingTimer = null;
  loadingScreen.classList.add('done');
}
window.addEventListener('load', hideIntro);
window.setTimeout(hideIntro, 2600);

function validTCKN(value) {
  const s = String(value || '').replace(/\D/g, '');
  if (!/^[1-9]\d{10}$/.test(s)) return false;
  const d = s.split('').map(Number);
  const c10 = ((d[0] + d[2] + d[4] + d[6] + d[8]) * 7 - (d[1] + d[3] + d[5] + d[7])) % 10;
  const c11 = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return c10 === d[9] && c11 === d[10];
}
function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function money(v) {
  return Number(v || 0).toLocaleString('tr-TR', {style:'currency',currency:'TRY'});
}
function dateTR(v) {
  if (!v) return '—';
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(String(v))) return String(v);
  const d = new Date(v);
  return isNaN(d.getTime()) ? esc(v) : d.toLocaleDateString('tr-TR');
}
function setMessage(text, type='') {
  message.textContent = text || '';
  message.className = 'message' + (type ? ' ' + type : '');
}
async function sendRequest(tc) {
  if (!APPS_SCRIPT_URL || !APPS_SCRIPT_URL.startsWith('https://script.google.com/macros/s/')) {
    throw new Error('Kurulum eksik: Apps Script Web App adresini kontrol edin.');
  }
  const payload = JSON.stringify({action:'publicAidatSorgula',payload:{tc}});
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(APPS_SCRIPT_URL,{method:'POST',body:payload,redirect:'follow',signal:ctrl.signal});
    const raw = await res.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (_) { throw new Error('Sunucudan geçersiz yanıt alındı. Lütfen daha sonra tekrar deneyin.'); }
    if (data && data.ok) return data;
    throw new Error((data && data.message) || 'Sorgulama başarısız.');
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Sunucudan zamanında yanıt alınamadı. Biraz sonra tekrar deneyin.');
    if (e instanceof TypeError) throw new Error('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
    throw e;
  } finally { clearTimeout(timer); }
}
function metric(label,value,kind='') {
  return `<div class="metric ${kind}"><span>${label}</span><strong>${money(value)}</strong></div>`;
}
function yearCard(x) {
  const year = x.YIL || '—';
  const due = x.YILLIK_TUTAR != null ? x.YILLIK_TUTAR : x.TAHAKKUK;
  const paid = x.TAHSILAT != null ? x.TAHSILAT : x.ODENEN;
  const balance = Number(x.KALAN || 0);
  const isPaid = balance <= 0;
  return `<article class="year-card">
    <div class="year-top"><span class="year">${esc(year)}</span><span class="year-state ${isPaid?'paid':'unpaid'}">${isPaid?'✓ ÖDENDİ':'! ÖDEME BEKLİYOR'}</span></div>
    <div class="year-line"><span>Yıllık aidat</span><strong>${money(due)}</strong></div>
    <div class="year-line"><span>Ödenen</span><strong>${money(paid)}</strong></div>
    <div class="year-line"><span>Mahsup / kapatılan</span><strong>${money(x.KAPATILAN)}</strong></div>
    <div class="year-line balance"><span>Kalan borç</span><strong>${money(balance)}</strong></div>
  </article>`;
}
function paymentBlock() {
  const iban = String(PAYMENT_INFO.iban || '').replace(/\s/g,'');
  if (!iban) {
    return `<div class="iban-card"><h3>Ödeme ve banka bilgileri</h3><p>Aidat ödemenizi dernek yönetiminden teyit edeceğiniz resmî banka hesabına yapabilirsiniz. Yanlış hesaba ödeme yapmamanız için IBAN bilgisi burada henüz yayımlanmamıştır.</p><div class="iban-holder">Hesap sahibi: ${esc(PAYMENT_INFO.accountName)}</div></div>`;
  }
  return `<div class="iban-card"><h3>Aidat ödemenizi kolayca yapın</h3><p>Havale/EFT açıklamasına adınızı soyadınızı ve “Aidat” bilgisini yazmanızı rica ederiz.</p>
    ${PAYMENT_INFO.bankName ? `<div class="iban-holder">${esc(PAYMENT_INFO.bankName)}</div>`:''}
    <div class="iban-value" id="ibanValue">${esc(PAYMENT_INFO.iban)}</div>
    <div class="iban-holder">Hesap sahibi: ${esc(PAYMENT_INFO.accountName)}</div>
    <button type="button" class="copy-iban" id="copyIban">IBAN'I KOPYALA</button></div>`;
}
function renderResult(data) {
  const u = data.uye || {}, rows = data.yillar || data.ozet || [], totals = data.toplam || {};
  const totalDue = totals.TAHAKKUK != null ? totals.TAHAKKUK : rows.reduce((s,x)=>s+Number(x.YILLIK_TUTAR||x.TAHAKKUK||0),0);
  const totalPaid = totals.ODENEN != null ? totals.ODENEN : (totals.TAHSILAT != null ? totals.TAHSILAT : rows.reduce((s,x)=>s+Number(x.TAHSILAT||x.ODENEN||0),0));
  const totalBalance = totals.KALAN != null ? totals.KALAN : rows.reduce((s,x)=>s+Number(x.KALAN||0),0);
  const hasDebt = Number(totalBalance) > 0;
  const years = rows.map(yearCard).join('') || '<div class="year-card">Aidat dönemi kaydı bulunamadı.</div>';
  result.innerHTML = `
    <div class="result-intro">
      <div class="member-head"><div><h2>${esc(u.AD_SOYAD||u.AD||'Değerli Üyemiz')}</h2><p>Üyelik tarihi: ${dateTR(u.KAYIT_TARIHI)}${u.TELEFON_MASKELI?' · Telefon: '+esc(u.TELEFON_MASKELI):''}</p></div><span class="status">ÜYE KAYDI BULUNDU</span></div>
      <div class="summary">
        ${metric('Toplam tahakkuk',totalDue)}
        ${metric('Toplam ödenen',totalPaid,'good')}
        ${metric('Kalan borç',totalBalance,hasDebt?'danger':'good')}
      </div>
    </div>
    ${hasDebt
      ? `<div class="warning"><span class="notice-icon">!</span><div><strong>Aidat ödemeniz bekleniyor.</strong><p>Görüntülenen kalan tutar için ödemenizi yapmanızı rica ederiz. Ödeme yaptıysanız kayıtların güncellenmesi için dekontunuzla dernek yönetimine ulaşabilirsiniz.</p></div></div>`
      : `<div class="thanks"><span class="notice-icon">✓</span><div><strong>Katkınız ve dayanışmanız için teşekkür ederiz.</strong><p>Aidat yükümlülüğünüz kapatılmış görünüyor. Gülpınar Derneği'ne verdiğiniz destek için teşekkür ederiz.</p></div></div>`}
    <div class="year-heading">Yıllara göre aidat dökümü</div>
    <div class="year-grid">${years}</div>
    ${hasDebt ? paymentBlock() : ''}
    <div class="result-actions"><button type="button" id="newQuery">Yeni sorgulama</button><button type="button" class="secondary" id="printResult">Yazdır / PDF</button></div>`;
  result.hidden = false;
  $('newQuery').addEventListener('click',()=>{result.hidden=true;$('tc').value='';setMessage('');$('tc').focus();window.scrollTo({top:0,behavior:'smooth'});});
  $('printResult').addEventListener('click',()=>window.print());
  const copy = $('copyIban');
  if (copy) copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(PAYMENT_INFO.iban);copy.textContent='KOPYALANDI ✓';}catch(_){copy.textContent='IBAN KOPYALANAMADI';}});
  result.scrollIntoView({behavior:'smooth',block:'start'});
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const tc = $('tc').value.replace(/\D/g,'');
  result.hidden = true;
  if (!validTCKN(tc)) {setMessage('Geçerli bir 11 haneli T.C. Kimlik Numarası girin.');$('tc').focus();return;}
  button.disabled=true;button.innerHTML='<span>Bilgiler getiriliyor…</span>';
  setMessage('Gülpınar Derneği kayıtlarına güvenli bağlantı kuruluyor…');
  showLoading();
  try {
    const response=await sendRequest(tc);
    setMessage('Sorgulama tamamlandı.','success');
    renderResult(response);
  } catch(error) {
    setMessage(error.message||'Sorgulama sırasında hata oluştu.');
  } finally {
    hideLoading();button.disabled=false;button.innerHTML='<span>Sorgula</span><span aria-hidden="true">→</span>';
  }
});
$('tc').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'').slice(0,11);});

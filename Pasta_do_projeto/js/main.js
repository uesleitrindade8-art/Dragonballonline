// js/main.js
import { PERSONAGENS } from './data.js';
import { mostrarTela, renderizarPersonagens } from './ui.js';
import { resolverTurno, resolverClash } from './engine.js';
import { firebaseConfig } from './firebase-config.js';

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Estado local do jogo
let meuPersonagem = null;
let oponentePersonagem = null;
let estado = {
    meuHP: 100, meuKi: 100, meuStun: 0,
    oponenteHP: 100, oponenteKi: 100, oponStun: 0,
    meuEstado: "Neutro",
    oponenteEstado: "Neutro"
};

// Flags de Especial e Transformação
let meuPreparando = false;
let oponentePreparando = false;
let turnoAtual = 0;
let meuTransformado = false;
let oponenteTransformado = false;
let jaTransformou = false;
let meuFreezaSurvived = false;
let oponenteFreezaSurvived = false;

// Flags Genki Dama (3 turnos)
let meuGenkiTurno = 0;
let oponenteGenkiTurno = 0;

// GDD 9: Timer e Histórico de Combos
let timerTurno = null;
let tempoRestante = 20;

// Arrays para rastrear os últimos movimentos bem-sucedidos
let comboJogador = []; // Rastreia o ID do movimento (Nerf)
let comboBot = [];
let comboFisicoJogador = []; // Rastreia golpes físicos diferentes (Buff)
let comboFisicoBot = [];
let comboFinalizarAtivoJogador = false;
let comboFinalizarAtivoBot = false;

// Stats Finais
let statTurnos = 0;
let statMaiorDano = 0;

// Variáveis Online e Modo Bot
let meuUid = null;
let codigoSalaAtual = null;
let unsubscribeSala = null;
let jaFuiParaSelecao = false;
let jaInicieiBatalha = false;
let jaResolviTurno = false;
let isModoBot = false;
let isBotPassivo = false;

// Controle de Hesitação e Tensão Máxima
let hesitouVezesJogador = 0;
let tensaoMaximaAtiva = false;
const HESITAR = { nome: "Hesitação", familia: "Neutro", subTipo: "Neutro", dano: 0, ki: 0, efeito: "Hesitar", id: "hesitar" };

// Controle de Colisão de Auras
let carregarKiContagemJogador = 0;
let carregarKiContagemBot = 0;

// Controle de Quebra de Guarda e Rivalidade
let guardaQuebradaJogador = 0;
let guardaQuebradaBot = 0;
let rivalidadeContagem = 0;

// Movimentos especiais mockados
const PREPARAR_KAME = { nome: "Kamehameha (Preparo)", familia: "Neutro", subTipo: "Neutro", efeito: "Preparar" };
const DISPARAR_KAME = { nome: "Kamehameha", familia: "Ki", subTipo: "Pedra", dano: 28, efeito: "Disparar" };
const PREPARAR_GENKI = { nome: "Genki Dama (Preparo)", familia: "Neutro", subTipo: "Neutro", efeito: "PrepararGenki" };
const DISPARAR_GENKI = { nome: "Genki Dama", familia: "Ki", subTipo: "Neutro", dano: 40, efeito: "DispararGenki" };

// --- AUTENTICAÇÃO E SALAS ONLINE ---
auth.signInAnonymously().catch((error) => console.error("Erro no Auth:", error));
auth.onAuthStateChanged((user) => {
    if (user) {
        meuUid = user.uid;
        document.getElementById('status-sala').innerText = "Conectado! Pronto para batalhar.";
    }
});

function gerarCodigoSala() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let codigo = "KAME-";
    for (let i = 0; i < 4; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return codigo;
}

// --- LISTENERS DOS BOTÕES INICIAIS ---
document.getElementById('btn-lutar-bot').addEventListener('click', () => {
    isModoBot = true;
    isBotPassivo = document.getElementById('chk-bot-passivo').checked;
    renderizarPersonagens(PERSONAGENS);
    mostrarTela('tela-selecao');
});

document.getElementById('btn-criar-sala').addEventListener('click', async () => {
    isModoBot = false;
    if (!meuUid) {
        document.getElementById('status-sala').innerText = "Conectando ao servidor... aguarde.";
        return;
    }
    
    codigoSalaAtual = gerarCodigoSala();
    document.getElementById('status-sala').innerText = `Sala ${codigoSalaAtual} criada! Aguardando oponente...`;
    
    try {
        await db.collection('salas').doc(codigoSalaAtual).set({
            status: "aguardando",
            criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
            jogadores: { [meuUid]: true }
        });
        escutarSala(codigoSalaAtual);
    } catch (e) {
        console.error("Erro ao criar sala:", e);
        alert("Erro ao criar sala.");
    }
});

document.getElementById('btn-entrar-sala').addEventListener('click', async () => {
    isModoBot = false;
    if (!meuUid) {
        document.getElementById('status-sala').innerText = "Conectando ao servidor... aguarde.";
        return;
    }
    
    codigoSalaAtual = document.getElementById('input-codigo-sala').value.toUpperCase();
    if (!codigoSalaAtual) return alert("Digite o código da sala.");
    
    try {
        const salaRef = db.collection('salas').doc(codigoSalaAtual);
        const salaDoc = await salaRef.get();
        
        if (!salaDoc.exists) return alert("Sala não encontrada. Verifique o código.");
        if (salaDoc.data().status !== "aguardando") return alert("Sala fechada ou cheia.");
        
        await salaRef.update({
            [`jogadores.${meuUid}`]: true,
            status: "selecao"
        });
        
        document.getElementById('status-sala').innerText = `Entrou na sala ${codigoSalaAtual}!`;
        escutarSala(codigoSalaAtual);
    } catch (e) {
        console.error("Erro ao entrar na sala:", e);
        alert("Erro ao entrar na sala. Veja o console (F12) para detalhes.");
    }
});

function escutarSala(codigo) {
    if (unsubscribeSala) unsubscribeSala();
    unsubscribeSala = db.collection('salas').doc(codigo).onSnapshot((doc) => {
        if (!doc.exists) return;
        const data = doc.data();
        
        const numJogadores = data.jogadores ? Object.keys(data.jogadores).length : 0;
        
        if (data.status === "selecao" && numJogadores === 2 && !jaFuiParaSelecao) {
            jaFuiParaSelecao = true;
            renderizarPersonagens(PERSONAGENS);
            mostrarTela('tela-selecao');
        }
        
        if (data.personagens && Object.keys(data.personagens).length === 2 && meuPersonagem && !jaInicieiBatalha) {
            const uids = Object.keys(data.jogadores);
            const opUid = uids.find(uid => uid !== meuUid);
            oponentePersonagem = PERSONAGENS[data.personagens[opUid]];
            
            jaInicieiBatalha = true;
            iniciarBatalhaLocal();
        }
        
        if (data.escolhasTurno && Object.keys(data.escolhasTurno).length === 2 && meuPersonagem && !jaResolviTurno) {
            const uids = Object.keys(data.jogadores);
            const opUid = uids.find(uid => uid !== meuUid);
            const minhaEscolha = data.escolhasTurno[meuUid];
            const escolhaOponente = data.escolhasTurno[opUid];
            
            jaResolviTurno = true;
            resolverTurnoAtual(minhaEscolha.mov, minhaEscolha.custoKi, escolhaOponente.mov, escolhaOponente.custoKi);
        }
        
        if (data.clashKi && Object.keys(data.clashKi).length === 2 && meuPersonagem && !jaResolviTurno) {
            const uids = Object.keys(data.jogadores);
            const opUid = uids.find(uid => uid !== meuUid);
            const injectA = data.clashKi[meuUid];
            const injectB = data.clashKi[opUid];
            
            const resClash = resolverClash(28, injectA, injectB);
            estado.meuKi = Math.max(0, estado.meuKi - injectA);
            estado.oponenteKi = Math.max(0, estado.oponenteKi - injectB);
            
            document.getElementById('area-gifs').innerHTML = '<span id="texto-narracao"></span>';
            jaResolviTurno = true;
            aplicarResultadoTurno(
                { nome: "Kamehameha", efeito: "Disparar", subTipo: "Pedra", familia: "Ki" }, 
                { nome: "Kamehameha", efeito: "Disparar", subTipo: "Pedra", familia: "Ki" }, 
                resClash
            );
            db.collection('salas').doc(codigoSalaAtual).set({ escolhasTurno: {}, clashKi: {} }, { merge: true });
        }
    });
}

document.getElementById('lista-personagens').addEventListener('click', async (evento) => {
    if (evento.target.classList.contains('btn-escolher')) {
        const idPersonagem = evento.target.dataset.id;
        meuPersonagem = PERSONAGENS[idPersonagem];
        
        if (isModoBot) {
            const keys = Object.keys(PERSONAGENS);
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            oponentePersonagem = PERSONAGENS[randomKey];
            iniciarBatalhaLocal();
        } else {
            await db.collection('salas').doc(codigoSalaAtual).update({
                [`personagens.${meuUid}`]: idPersonagem
            });
            document.getElementById('tela-selecao').innerHTML = `<h2>Você escolheu ${meuPersonagem.nome}!</h2><p>Aguardando oponente...</p>`;
        }
    }
});

// --- LÓGICA DE BATALHA ---
function iniciarBatalhaLocal() {
    mostrarTela('tela-batalha');
    estado = {
        meuHP: 100, meuKi: 100, meuStun: 0,
        oponenteHP: 100, oponenteKi: 100, oponStun: 0,
        meuEstado: "Neutro",
        oponenteEstado: "Neutro"
    };
    meuPreparando = false;
    oponentePreparando = false;
    turnoAtual = 0;
    meuTransformado = false;
    oponenteTransformado = false;
    jaTransformou = false;
    meuFreezaSurvived = false;
    oponenteFreezaSurvived = false;
    meuGenkiTurno = 0;
    oponenteGenkiTurno = 0;
    comboJogador = [];
    comboBot = [];
    comboFisicoJogador = [];
    comboFisicoBot = [];
    comboFinalizarAtivoJogador = false;
    comboFinalizarAtivoBot = false;
    hesitouVezesJogador = 0;
    tensaoMaximaAtiva = false;
    carregarKiContagemJogador = 0;
    carregarKiContagemBot = 0;
    guardaQuebradaJogador = 0;
    guardaQuebradaBot = 0;
    rivalidadeContagem = 0;
    statTurnos = 0;
    statMaiorDano = 0;
    jaResolviTurno = false;
    
    document.getElementById('log-narracao').innerHTML = '<p>A luta vai começar!</p>';
    
    atualizarStatusUI();
    iniciarTurno();
}

function iniciarTurno() {
    if (estado.meuHP <= 0 || estado.oponenteHP <= 0) {
        fimDeJogo();
        return;
    }

    if (meuPreparando) {
        atualizarArena("Você está disparando o Kamehameha...");
        document.getElementById('menu-acoes').innerHTML = '<p style="grid-column: span 2; text-align: center;">DISPARANDO!</p>';
        clearInterval(timerTurno);
        setTimeout(() => {
            if (isModoBot) {
                resolverTurnoAtual(DISPARAR_KAME, 0, null, null);
            } else {
                db.collection('salas').doc(codigoSalaAtual).update({
                    [`escolhasTurno.${meuUid}`]: { mov: DISPARAR_KAME, custoKi: 0 }
                });
            }
        }, 1500);
    } else if (meuGenkiTurno > 0) {
        let turno = meuGenkiTurno;
        atualizarArena(`Você concentra energia para a Genki Dama... (${turno}/3)`);
        document.getElementById('menu-acoes').innerHTML = `<p style="grid-column: span 2; text-align: center;">CONCENTRANDO ENERGIA... (${turno}/3)</p>`;
        let genkiMov = turno === 3 ? DISPARAR_GENKI : PREPARAR_GENKI;
        clearInterval(timerTurno);
        setTimeout(() => {
            if (isModoBot) {
                resolverTurnoAtual(genkiMov, 0, null, null);
            } else {
                db.collection('salas').doc(codigoSalaAtual).update({
                    [`escolhasTurno.${meuUid}`]: { mov: genkiMov, custoKi: 0 }
                });
            }
        }, 1500);
    } else {
        // Aplica a penalidade de Tensão Máxima antes de renderizar
        if (tensaoMaximaAtiva) {
            estado.meuKi = Math.max(0, estado.meuKi - 10);
            adicionarLog("TENSÃO MÁXIMA: -10 de Ki por hesitação!");
            tensaoMaximaAtiva = false;
            atualizarStatusUI();
        }

        if (estado.meuEstado === "FinalizarCombo") {
            atualizarArena("VOCÊ ACHOU UMA BRECHA! O oponente não consegue reagir. FINALIZE O COMBO!");
            renderizarBotoes();
            iniciarTimer();
        } else if (estado.meuEstado === "SofrendoCombo") {
            atualizarArena("VOCÊ FOI PEGO NUM COMBO! Está apanhando consecutivamente e não consegue se defender...");
            document.getElementById('menu-acoes').innerHTML = '<p style="grid-column: span 2; text-align: center; color: #e74c3c; font-weight: bold; font-size: 1.2rem;">APANHANDO...</p>';
            clearInterval(timerTurno);
            let dummyMov = { nome: "Apanhando", familia: "Neutro", subTipo: "Neutro", dano: 0, ki: 0, efeito: "ApanharCombo", id: "apanhar_combo" };
            // Envia o dummy move imediatamente (1.5s) para não travar o jogo online
            setTimeout(() => {
                if (isModoBot) {
                    resolverTurnoAtual(dummyMov, 0, null, null);
                } else {
                    db.collection('salas').doc(codigoSalaAtual).update({
                        [`escolhasTurno.${meuUid}`]: { mov: dummyMov, custoKi: 0 }
                    });
                }
            }, 1500);
        } else {
            atualizarArena("Escolha sua ação.");
            renderizarBotoes();
            verificarTransformacao();
            iniciarTimer();
        }
    }
}

function fimDeJogo() {
    clearInterval(timerTurno);
    const venceu = estado.oponenteHP <= 0;
    
    const logBatalha = document.getElementById('log-narracao').innerHTML;
    document.getElementById('log-completo-fim').innerHTML = logBatalha;
    
    const titulo = document.getElementById('titulo-fim');
    titulo.innerText = venceu ? "VITÓRIA!" : "DERROTA...";
    titulo.style.color = venceu ? "#2ecc71" : "#e74c3c";
    
    document.getElementById('resumo-arena').innerHTML = `
        <div class="stat-linha"><span>Turnos Jogados:</span> <span>${statTurnos}</span></div>
        <div class="stat-linha"><span>Maior Dano Causado:</span> <span>${statMaiorDano}</span></div>
        <div class="stat-linha"><span>Seu HP Final:</span> <span>${estado.meuHP}</span></div>
    `;
    
    mostrarTela('tela-fim-jogo');
    
    document.getElementById('btn-revanche').onclick = () => {
        iniciarBatalhaLocal();
    };
    document.getElementById('btn-menu-inicial').onclick = () => {
        mostrarTela('tela-inicial');
    };
    
    document.getElementById('btn-ver-log').onclick = () => {
        document.getElementById('modal-log').style.display = 'flex';
    };
    document.getElementById('btn-fechar-log').onclick = () => {
        document.getElementById('modal-log').style.display = 'none';
    };
}

function iniciarTimer() {
    clearInterval(timerTurno);
    tempoRestante = 20;
    const menu = document.getElementById('menu-acoes');
    
    let timerDiv = document.getElementById('timer-escolha');
    if (!timerDiv) {
        timerDiv = document.createElement('div');
        timerDiv.id = 'timer-escolha';
        timerDiv.style.gridColumn = 'span 2';
        timerDiv.style.textAlign = 'center';
        timerDiv.style.color = '#e74c3c';
        timerDiv.style.fontWeight = 'bold';
        timerDiv.style.fontSize = '1.2rem';
        menu.insertBefore(timerDiv, menu.firstChild);
    }
    timerDiv.innerText = `⏳ ${tempoRestante}s`;

    timerTurno = setInterval(() => {
        tempoRestante--;
        timerDiv.innerText = `⏳ ${tempoRestante}s`;
        if (tempoRestante <= 0) {
            clearInterval(timerTurno);
            jogarAleatorio();
        }
    }, 1000);
}

function jogarAleatorio() {
    hesitouVezesJogador++;
    adicionarLog("Você hesitou demais! O tempo esgotou.");
    
    if (hesitouVezesJogador >= 2) {
        tensaoMaximaAtiva = true;
        adicionarLog("TENSÃO MÁXIMA! No próximo turno você perderá 10 de Ki.");
    }
    
    escolherMovimento(HESITAR);
}

function verificarTransformacao() {
    const btnTrans = document.getElementById('btn-transformar');
    if (btnTrans) btnTrans.remove();

    if (!jaTransformou && estado.meuKi === 100 && estado.meuHP < 50) {
        const menu = document.getElementById('menu-acoes');
        const btn = document.createElement('button');
        btn.id = 'btn-transformar';
        btn.className = 'btn-acao';
        btn.style.gridColumn = 'span 2';
        btn.style.background = '#f1c40f';
        btn.style.color = '#000';
        btn.innerText = '⚡ TRANSFORMAR (Super Saiyajin) ⚡';
        btn.onclick = () => transformar();
        menu.appendChild(btn);
    }
}

function transformar() {
    clearInterval(timerTurno);
    document.querySelectorAll('.btn-acao').forEach(b => b.disabled = true);
    jaTransformou = true;
    meuTransformado = true;
    estado.meuKi = 0;
    atualizarArena("Você grita ao céu... Seus cabelos ficam dourados! SUPER SAIYAJIN!");
    adicionarLog("VOCÊ SE TRANSFORMOU! +30% de dano permanente!");
    atualizarStatusUI();
    setTimeout(() => iniciarTurno(), 5000); // 5 segundos para o clímax
}

function atualizarStatusUI() {
    let stunJogador = estado.meuStun > 0 ? ` 💫${estado.meuStun}` : '';
    let stunBot = estado.oponStun > 0 ? ` 💫${estado.oponStun}` : '';

    document.getElementById('info-jogador').innerHTML = `
        <div class="avatar-lutador esquerda" id="avatar-jog">🥋</div>
        <div class="status-texto">
            <div class="nome-personagem">${meuPersonagem.nome} ${meuTransformado ? '✨(SSJ)' : ''} (Você) ${meuPreparando ? '⚡' : ''} [${estado.meuEstado}]${stunJogador}</div>
            <div class="barra-container"><div class="barra-titulo"><span>HP</span><span>${estado.meuHP}/100</span></div><div class="barra-fundo"><div class="barra-preenchimento barra-hp" style="width: ${estado.meuHP}%"></div></div></div>
            <div class="barra-container"><div class="barra-titulo"><span>Ki</span><span>${estado.meuKi}/100</span></div><div class="barra-fundo"><div class="barra-preenchimento barra-ki" style="width: ${estado.meuKi}%"></div></div></div>
        </div>
    `;
    document.getElementById('info-oponente').innerHTML = `
        <div class="status-texto">
            <div class="nome-personagem">${oponentePersonagem.nome} ${oponenteTransformado ? '✨(SSJ)' : ''} (Oponente) ${oponentePreparando ? '⚡' : ''} [${estado.oponenteEstado}]${stunBot}</div>
            <div class="barra-container"><div class="barra-titulo"><span>HP</span><span>${estado.oponenteHP}/100</span></div><div class="barra-fundo"><div class="barra-preenchimento barra-hp" style="width: ${estado.oponenteHP}%"></div></div></div>
            <div class="barra-container"><div class="barra-titulo"><span>Ki</span><span>${estado.oponenteKi}/100</span></div><div class="barra-fundo"><div class="barra-preenchimento barra-ki" style="width: ${estado.oponenteKi}%"></div></div></div>
        </div>
        <div class="avatar-lutador direita-avatar" id="avatar-opon">👾</div>
    `;
}

function renderizarBotoes() {
    const menu = document.getElementById('menu-acoes');
    menu.innerHTML = '';
    
    const movimentosPorEstado = {
        "Neutro": ["seq_socos", "chute_giratorio", "golpe_cabeca", "martelo", "chute_ascendente", "rajada_ki", "onda_ampla", "kamehameha", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "esperar", "zanzoken", "subir_ceus"],
        "Ofensiva": ["seq_socos", "chute_giratorio", "golpe_cabeca", "martelo", "chute_ascendente", "rajada_ki", "onda_ampla", "kamehameha", "carregar_ki", "esperar"],
        "Cambaleando": ["seq_socos", "chute_giratorio", "golpe_cabeca", "martelo", "chute_ascendente", "rajada_ki", "onda_ampla", "kamehameha", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "esperar", "reversal", "zanzoken"],
        "Distancia": ["rajada_ki", "onda_ampla", "kamehameha", "genki_dama", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "aproximar", "aproximar_vel", "zanzoken", "subir_ceus"],
        "OfensivaDist": ["rajada_ki", "onda_ampla", "kamehameha", "carregar_ki", "esperar", "aproximar", "aproximar_vel"],
        "CambaleandoDist": ["rajada_ki", "onda_ampla", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "aproximar", "aproximar_vel", "reversal"],
        "Perseguicao": ["teleporte_golpe", "carregar_ki", "kamehameha", "deixar_recuperar"],
        "Voando": ["forcor_estab", "contra_furioso", "fugir", "explosao_aura"],
        "Atordoado": ["sacudir_cabeca", "aguentar_firme", "explosao_aura"],
        "FinalizarCombo": ["finalizar_fisico", "finalizar_ki", "finalizar_super"],
        "SofrendoCombo": [], // Vítima de combo não tem opções
        "Aereo": ["seq_socos", "chute_giratorio", "golpe_cabeca", "martelo", "chute_ascendente", "rajada_ki", "onda_ampla", "kamehameha", "carregar_ki", "descer_ceus"],
        "AereoSolo": ["rajada_ki", "onda_ampla", "kamehameha", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "descer_ceus"],
        "SoloAereo": ["rajada_ki", "onda_ampla", "kamehameha", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "subir_ceus"],
        "AereoPerseguicao": ["teleporte_golpe", "carregar_ki", "kamehameha", "deixar_recuperar", "descer_ceus"],
        "AereoVoando": ["forcor_estab", "contra_furioso", "fugir", "explosao_aura", "descer_ceus"]
    };

    const permitidos = movimentosPorEstado[estado.meuEstado] || [];
    let movimentosDisponiveis = meuPersonagem.movimentos.filter(mov => permitidos.includes(mov.id));

    // Lógica do Super Kamehameha (Goku SSJ)
    if (meuTransformado && meuPersonagem.id === 'goku') {
        movimentosDisponiveis = movimentosDisponiveis.filter(m => m.id !== 'kamehameha');
        const superKame = meuPersonagem.movimentos.find(m => m.id === 'super_kamehameha');
        if (superKame) movimentosDisponiveis.push(superKame);
    }

    movimentosDisponiveis.forEach(mov => {
        const btn = document.createElement('button');
        btn.className = `btn-acao btn-cor-${mov.subTipo.toLowerCase()}`;
        btn.innerText = `${mov.nome} (${mov.familia}/${mov.subTipo}) - ${mov.ki} Ki`;
        if (estado.meuKi < mov.ki) {
            btn.disabled = true;
            btn.style.opacity = 0.5;
            btn.style.cursor = 'not-allowed';
        }
        btn.onclick = () => escolherMovimento(mov);
        menu.appendChild(btn);
    });
}

function escolherMovimento(mov) {
    clearInterval(timerTurno);
    document.querySelectorAll('.btn-acao').forEach(b => {
        b.disabled = true;
        b.style.opacity = '0.5';
        b.style.cursor = 'not-allowed';
    });
    let movA = mov;
    let custoKiA = mov.ki;
    
    if (mov.id === "kamehameha") {
        movA = PREPARAR_KAME;
        meuPreparando = true;
    } else if (mov.id === "genki_dama") {
        movA = PREPARAR_GENKI;
        meuGenkiTurno = 1;
    }
    
    atualizarArena(`Você prepara: ${mov.nome}... Aguardando oponente.`);
    
    if (isModoBot) {
        setTimeout(() => resolverTurnoAtual(movA, custoKiA, null, null), 1000);
    } else {
        db.collection('salas').doc(codigoSalaAtual).update({
            [`escolhasTurno.${meuUid}`]: { mov: movA, custoKi: custoKiA }
        });
    }
}
function resolverTurnoAtual(movA, custoKiA, movB_param, custoKiB_param) {
    let movB = movB_param;
    let custoKiB = custoKiB_param;

    // Gera jogada do Bot se for modo local
    if (!movB) {
        if (isBotPassivo) {
            movB = { nome: "Carregar Ki", familia: "Neutro", subTipo: "Verde", dano: 0, ki: 0, efeito: "Carregar", id: "carregar_ki" };
            custoKiB = 0;
        } else if (estado.oponenteEstado === "SofrendoCombo") {
            movB = { nome: "Apanhando", familia: "Neutro", subTipo: "Neutro", dano: 0, ki: 0, efeito: "ApanharCombo", id: "apanhar_combo" };
            custoKiB = 0;
        } else if (oponentePreparando) {
            movB = DISPARAR_KAME;
        } else if (oponenteGenkiTurno === 2) {
            movB = PREPARAR_GENKI;
        } else if (oponenteGenkiTurno === 3) {
            movB = DISPARAR_GENKI;
        } else {
            if (turnoAtual === 1 && estado.oponenteKi >= 50) {
                movB = PREPARAR_KAME;
                custoKiB = 50;
                oponentePreparando = true;
            } else {
                const movsPorEstadoBot = {
                    "Neutro": ["seq_socos", "chute_giratorio", "golpe_cabeca", "martelo", "chute_ascendente", "rajada_ki", "onda_ampla", "kamehameha", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "esperar", "zanzoken", "subir_ceus"],
                    "Ofensiva": ["seq_socos", "chute_giratorio", "golpe_cabeca", "martelo", "chute_ascendente", "rajada_ki", "onda_ampla", "kamehameha", "carregar_ki", "esperar"],
                    "Cambaleando": ["seq_socos", "chute_giratorio", "golpe_cabeca", "martelo", "chute_ascendente", "rajada_ki", "onda_ampla", "kamehameha", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "esperar", "reversal", "zanzoken"],
                    "Distancia": ["rajada_ki", "onda_ampla", "kamehameha", "genki_dama", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "aproximar", "aproximar_vel", "zanzoken", "subir_ceus"],
                    "OfensivaDist": ["rajada_ki", "onda_ampla", "kamehameha", "carregar_ki", "esperar", "aproximar", "aproximar_vel"],
                    "CambaleandoDist": ["rajada_ki", "onda_ampla", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "aproximar", "aproximar_vel", "reversal"],
                    "Perseguicao": ["teleporte_golpe", "carregar_ki", "kamehameha", "deixar_recuperar"],
                    "Voando": ["forcor_estab", "contra_furioso", "fugir", "explosao_aura"],
                    "Atordoado": ["sacudir_cabeca", "aguentar_firme", "explosao_aura"],
                    "FinalizarCombo": ["finalizar_fisico", "finalizar_ki", "finalizar_super"],
                    "SofrendoCombo": [],
                    "Aereo": ["seq_socos", "chute_giratorio", "golpe_cabeca", "martelo", "chute_ascendente", "rajada_ki", "onda_ampla", "kamehameha", "carregar_ki", "descer_ceus"],
                    "AereoSolo": ["rajada_ki", "onda_ampla", "kamehameha", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "descer_ceus"],
                    "SoloAereo": ["rajada_ki", "onda_ampla", "kamehameha", "guarda_alta", "bloqueio_pernas", "postura_fechada", "carregar_ki", "subir_ceus"],
                    "AereoPerseguicao": ["teleporte_golpe", "carregar_ki", "kamehameha", "deixar_recuperar", "descer_ceus"],
                    "AereoVoando": ["forcor_estab", "contra_furioso", "fugir", "explosao_aura", "descer_ceus"]
                };
                const permitidosBot = movsPorEstadoBot[estado.oponenteEstado] || [];
                const movsValidosBot = oponentePersonagem.movimentos.filter(m => {
                    if (estado.oponenteKi < m.ki) return false;
                    return permitidosBot.includes(m.id);
                });

                if (estado.oponenteEstado === "SofrendoCombo") {
                    movB = { nome: "Apanhando", familia: "Neutro", subTipo: "Neutro", dano: 0, ki: 0, efeito: "ApanharCombo", id: "apanhar_combo" };
                    custoKiB = 0;
                } else if (movsValidosBot.length === 0) {
                    movB = PREPARAR_GENKI;
                    custoKiB = 0;
                } else {
                    let movBot = movsValidosBot[Math.floor(Math.random() * movsValidosBot.length)];
                    if (movBot.id === "kamehameha") {
                        movB = PREPARAR_KAME; custoKiB = 50; oponentePreparando = true;
                    } else if (movBot.id === "genki_dama") {
                        movB = PREPARAR_GENKI; custoKiB = 0; oponenteGenkiTurno = 1;
                    } else {
                        movB = movBot; custoKiB = movBot.ki;
                    }
                }
            }
        }
    }

    turnoAtual++;
    const resultado = resolverTurno(movA, movB, custoKiA, custoKiB);

    if (resultado.clashDetectado) {
        meuPreparando = false;
        oponentePreparando = false;
        estado.meuKi = Math.max(0, estado.meuKi - custoKiA);
        estado.oponenteKi = Math.max(0, estado.oponenteKi - custoKiB);
        atualizarStatusUI();
        atualizarArena("CLASH DE FEIXES! As energias colidem no ar!");
        adicionarLog("CLASH DE FEIXES DETECTADO!");
        abrirJanelaLeilaoKi();
        
        if (!isModoBot) db.collection('salas').doc(codigoSalaAtual).set({ escolhasTurno: {} }, { merge: true });
        return;
    }

    aplicarResultadoTurno(movA, movB, resultado);
    if (!isModoBot) db.collection('salas').doc(codigoSalaAtual).set({ escolhasTurno: {} }, { merge: true });
}

function aplicarResultadoTurno(movA, movB, resultado) {
    let meuEstadoAnterior = estado.meuEstado;
    let oponEstadoAnterior = estado.oponenteEstado;

    let multDanoJogador = 1.0;
    let multDanoBot = 1.0;

    if (meuTransformado) multDanoJogador += 0.30;
    if (meuPersonagem.id === "goku" && estado.meuHP < 30) multDanoJogador += 0.20;
    if (meuPersonagem.id === "vegeta") resultado.kiA = Math.floor(resultado.kiA * 2);
    
    if (oponenteTransformado) multDanoBot += 0.30;
    if (oponentePersonagem.id === "goku" && estado.oponenteHP < 30) multDanoBot += 0.20;
    if (oponentePersonagem.id === "vegeta") resultado.kiB = Math.floor(resultado.kiB * 2);

    // === MECÂNICA DE NERF (Mesmo golpe 3x seguidas com sucesso) ===
    let nerfJogadorAtivo = false;
    let nerfBotAtivo = false;

    // Adicionado "&& resultado.danoA === 0" para não contar combo em Clash
    if (resultado.danoB > 0 && resultado.danoA === 0) {
        comboJogador.push(movA.id);
        if (comboJogador.length > 3) comboJogador.shift();
        
        if (comboJogador.length === 3 && comboJogador[0] === comboJogador[1] && comboJogador[1] === comboJogador[2]) {
            multDanoJogador = 0;
            resultado.danoB = 0;
            comboJogador = [];
            resultado.danoA = Math.floor(15 * multDanoBot); // Dano de contra-ataque
            nerfJogadorAtivo = true;
            estado.meuEstado = "CambaleandoDist";
            estado.oponenteEstado = "OfensivaDist";
            // Sobrescreve a narração para contar o contra-ataque
            resultado.narracao = `OPONENTE DECIFROU SEU ESTILO! ${movA.nome} falhou. Você sofreu um contra-ataque de ${resultado.danoA} de dano!`;
        }
    } else {
        comboJogador = [];
    }

    if (resultado.danoA > 0 && resultado.danoB === 0) {
        comboBot.push(movB.id);
        if (comboBot.length > 3) comboBot.shift();
        
        if (comboBot.length === 3 && comboBot[0] === comboBot[1] && comboBot[1] === comboBot[2]) {
            multDanoBot = 0;
            resultado.danoA = 0;
            comboBot = [];
            resultado.danoB = Math.floor(15 * multDanoJogador);
            nerfBotAtivo = true;
            estado.oponenteEstado = "CambaleandoDist";
            estado.meuEstado = "OfensivaDist";
            // Sobrescreve a narração
            resultado.narracao = `VOCÊ DECIFROU O ESTILO DO OPONENTE! ${movB.nome} falhou. O oponente sofreu um contra-ataque de ${resultado.danoB} de dano!`;
        }
    } else {
        comboBot = [];
    }

    // === MECÂNICA DE BUFF (Combo Físico de 3 golpes diferentes seguidos) ===
    if (!nerfJogadorAtivo && resultado.danoB > 0 && resultado.danoA === 0 && movA.familia === "Fisico") {
        if (!comboFisicoJogador.includes(movA.id)) {
            comboFisicoJogador.push(movA.id);
            if (comboFisicoJogador.length === 3) {
                adicionarLog("COMBO REALIZADO! O oponente está vulnerável. FINALIZE AGORA!");
                comboFinalizarAtivoJogador = true;
                comboFisicoJogador = [];
            }
        } else {
            comboFisicoJogador = [movA.id];
        }
    } else if (!nerfJogadorAtivo) {
        comboFisicoJogador = [];
    }

    if (!nerfBotAtivo && resultado.danoA > 0 && resultado.danoB === 0 && movB.familia === "Fisico") {
        if (!comboFisicoBot.includes(movB.id)) {
            comboFisicoBot.push(movB.id);
            if (comboFisicoBot.length === 3) {
                adicionarLog("OPONENTE FEZ UM COMBO! Cuidado com o Finalizador!");
                comboFinalizarAtivoBot = true;
                comboFisicoBot = [];
            }
        } else {
            comboFisicoBot = [movB.id];
        }
    } else if (!nerfBotAtivo) {
        comboFisicoBot = [];
    }

        if (resultado.danoB > 0) resultado.danoB = Math.floor(resultado.danoB * multDanoJogador);
    if (resultado.danoA > 0) resultado.danoA = Math.floor(resultado.danoA * multDanoBot);

    // === COLISÃO DE AURAS ===
    if (movA.efeito === "Carregar") carregarKiContagemJogador++; else carregarKiContagemJogador = 0;
    if (movB.efeito === "Carregar") carregarKiContagemBot++; else carregarKiContagemBot = 0;

    if (carregarKiContagemJogador === 3 && carregarKiContagemBot === 3) {
        resultado.danoA = 5; resultado.danoB = 5;
        estado.meuKi = Math.max(0, estado.meuKi - 10);
        estado.oponenteKi = Math.max(0, estado.oponenteKi - 10);
        estado.meuEstado = "Neutro"; estado.oponenteEstado = "Neutro";
        resultado.narracao = "As auras são tão intensas que o ar explode! Ambos tomam dano e perdem Ki. Volta ao Neutro!";
        carregarKiContagemJogador = 0; carregarKiContagemBot = 0;
    }

    // === BÔNUS DE QUEIMA-ROUPA (Super Kamehameha / Kamehameha) ===
    const estadosCorpoACorpo = ["Neutro", "Ofensiva", "Cambaleando"];
    if (movA.efeito === "Disparar" && resultado.danoB > 0 && estadosCorpoACorpo.includes(meuEstadoAnterior) && estadosCorpoACorpo.includes(oponEstadoAnterior)) {
        resultado.danoB = Math.floor(resultado.danoB * 1.5);
        resultado.narracao += " A QUEIMA-ROUPA! O dano é massivo!";
    }
    if (movB.efeito === "Disparar" && resultado.danoA > 0 && estadosCorpoACorpo.includes(meuEstadoAnterior) && estadosCorpoACorpo.includes(oponEstadoAnterior)) {
        resultado.danoA = Math.floor(resultado.danoA * 1.5);
        resultado.narracao += " A QUEIMA-ROUPA! O dano é massivo!";
    }

    // === MECÂNICA DE RIVALIDADE ===
    if (resultado.danoA > 0 && resultado.danoB > 0) {
        rivalidadeContagem++;
        if (rivalidadeContagem >= 3) {
            estado.meuKi = Math.min(100, estado.meuKi + 10);
            estado.oponenteKi = Math.min(100, estado.oponenteKi + 10);
            resultado.narracao += " RIVALIDADE! A tensão é enorme! Ambos recuperam 10 de Ki.";
            rivalidadeContagem = 0;
        }
    } else if (resultado.danoA !== resultado.danoB) {
        rivalidadeContagem = 0;
    }

    statTurnos++;

    // ADIÇÃO DE NARRAÇÃO DE EXPLOSÃO PARA GOLPES FORTES
    const danoMaximoTurno = Math.max(resultado.danoA, resultado.danoB);
    if (danoMaximoTurno >= 25) {
        const fracoesExplosao = [
            " UMA GRANDE EXPLOSÃO ECLODE!",
            " O IMPACTO FAZ A TERRA TREMER!",
            " UMA ONDA DE CHOQUE VARRE A ARENA!",
            " A ENERGIA EXPLODE COM FORÇA TOTAL!",
            " UMA EXPLOSÃO COLOSAL DEVASTA O CENÁRIO!"
        ];
        // Evita adicionar se já foi um texto de Finalizar Combo
        if (!resultado.narracao.includes("FINALIZA O COMBO")) {
            resultado.narracao += fracoesExplosao[Math.floor(Math.random() * fracoesExplosao.length)];
        }
    }

    statTurnos++;
    if (resultado.danoB > statMaiorDano) statMaiorDano = resultado.danoB;

    if (meuPersonagem.id === "piccolo" && resultado.danoB > 0 && resultado.danoA === 0) {
        estado.meuHP = Math.min(100, estado.meuHP + 3);
        adicionarLog("Piccolo regenerou +3 HP!");
    }
    if (oponentePersonagem.id === "piccolo" && resultado.danoA > 0 && resultado.danoB === 0) {
        estado.oponenteHP = Math.min(100, estado.oponenteHP + 3);
        adicionarLog("Piccolo (Oponente) regenerou +3 HP!");
    }

    if (meuPersonagem.id === "freeza" && (estado.meuHP - resultado.danoA <= 0) && !meuFreezaSurvived) {
        estado.meuHP = 1;
        meuFreezaSurvived = true;
        adicionarLog("FREEZA SOBREVIVEU ao golpe fatal com 1 HP!");
    } else {
        estado.meuHP = Math.max(0, estado.meuHP - resultado.danoA);
    }

    if (oponentePersonagem.id === "freeza" && (estado.oponenteHP - resultado.danoB <= 0) && !oponenteFreezaSurvived) {
        estado.oponenteHP = 1;
        oponenteFreezaSurvived = true;
        adicionarLog("FREEZA (Oponente) SOBREVIVEU ao golpe fatal com 1 HP!");
    } else {
        estado.oponenteHP = Math.max(0, estado.oponenteHP - resultado.danoB);
    }

    estado.meuKi = Math.min(100, Math.max(0, estado.meuKi + resultado.kiA));
    estado.oponenteKi = Math.min(100, Math.max(0, estado.oponenteKi + resultado.kiB));

    if (resultado.cancelarA) meuPreparando = false;
    if (resultado.cancelarB) oponentePreparando = false;
    if (movA.efeito === "Disparar") meuPreparando = false;
    if (movB.efeito === "Disparar") oponentePreparando = false;

    if (movA.efeito === "PrepararGenki" && !resultado.cancelarA) {
        meuGenkiTurno++;
    } else if (movA.efeito === "DispararGenki" || resultado.cancelarA) {
        meuGenkiTurno = 0;
    }

    if (movB.efeito === "PrepararGenki" && !resultado.cancelarB) {
        oponenteGenkiTurno++;
    } else if (movB.efeito === "DispararGenki" || resultado.cancelarB) {
        oponenteGenkiTurno = 0;
    }

    if (resultado.danoB > 0 && movA.subTipo === "Azul" && movA.familia !== "Defesa") estado.oponStun += 1;
    if (resultado.danoA > 0 && movB.subTipo === "Azul" && movB.familia !== "Defesa") estado.meuStun += 1;

    if (meuEstadoAnterior === "Atordoado") estado.meuStun = 0;
    if (oponEstadoAnterior === "Atordoado") estado.oponStun = 0;

    // === MECÂNICA DE QUEBRA DE GUARDA ===
    let quebraDeGuardaAtiva = false;
    if (movA.familia === "Defesa" && movB.subTipo === "Azul" && resultado.danoA === 0) {
        guardaQuebradaJogador++;
        if (guardaQuebradaJogador >= 3) {
            resultado.narracao = "QUEBRA DE GUARDA! Você bloqueou muitos golpes pesados e o impacto te atordoa!";
            estado.meuEstado = "Atordoado";
            estado.oponenteEstado = "Neutro";
            guardaQuebradaJogador = 0;
            quebraDeGuardaAtiva = true;
        }
    } else if (movA.familia !== "Defesa") {
        guardaQuebradaJogador = 0;
    }

    if (movB.familia === "Defesa" && movA.subTipo === "Azul" && resultado.danoB === 0) {
        guardaQuebradaBot++;
        if (guardaQuebradaBot >= 3) {
            resultado.narracao = "QUEBRA DE GUARDA! O oponente bloqueou muitos golpes pesados e fica atordoado!";
            estado.oponenteEstado = "Atordoado";
            estado.meuEstado = "Neutro";
            guardaQuebradaBot = 0;
            quebraDeGuardaAtiva = true;
        }
    } else if (movB.familia !== "Defesa") {
        guardaQuebradaBot = 0;
    }

    if (quebraDeGuardaAtiva) {
        // Pula as transições normais abaixo pois o stun já foi aplicado
    } else if (comboFinalizarAtivoJogador) {
        estado.meuEstado = "FinalizarCombo";
        estado.oponenteEstado = "SofrendoCombo"; // Vítima não pode fazer nada
        comboFinalizarAtivoJogador = false; 
    } else if (comboFinalizarAtivoBot) {
        estado.oponenteEstado = "FinalizarCombo";
        estado.meuEstado = "SofrendoCombo"; // Você não pode fazer nada
        comboFinalizarAtivoBot = false; 
    } else if (resultado.proximoEstadoA) {
        estado.meuEstado = resultado.proximoEstadoA;
        estado.oponenteEstado = resultado.proximoEstadoB;
    } else if (estado.oponStun >= 3) {
        estado.oponenteEstado = "Atordoado";
        estado.meuEstado = "Neutro";
        estado.oponStun = 0;
        adicionarLog("OPONENTE ATORDOADO!");
    } else if (estado.meuStun >= 3) {
        estado.meuEstado = "Atordoado";
        estado.oponenteEstado = "Neutro";
        estado.meuStun = 0;
        adicionarLog("VOCÊ ESTÁ ATORDOADO!");
    } else if (movA.efeito === "Esperar" || movB.efeito === "Esperar" || movA.efeito === "Fugir" || movB.efeito === "Fugir") {
        estado.meuEstado = "Distancia";
        estado.oponenteEstado = "Distancia";
    } else if (estado.meuEstado === "Perseguicao" || estado.meuEstado === "Voando") {
        estado.meuEstado = "Neutro";
        estado.oponenteEstado = "Neutro";
    } else if (resultado.danoB > 0 && resultado.danoA === 0) {
        if (movA.efeito === "LancaParede" || movA.efeito === "LancaCeu") {
            let chanceColisao = Math.random() < 0.5; // 50% de chance
            let isAereo = meuEstadoAnterior === "Aereo" || meuEstadoAnterior === "AereoPerseguicao" || meuEstadoAnterior === "AereoVoando" || meuEstadoAnterior === "AereoSolo";
            
            if (movA.efeito === "LancaCeu" && isAereo) {
                // Lança para baixo (Chão)
                if (chanceColisao) {
                    resultado.danoB += 10;
                    resultado.narracao += " O oponente despencão e COLIDE com o solo! (+10 Dano de Impacto) O combo é interrompido!";
                    estado.meuEstado = "Neutro";
                    estado.oponenteEstado = "Cambaleando";
                } else {
                    resultado.narracao += " O oponente despencão, mas aterrissa em pé!";
                    estado.meuEstado = "Neutro";
                    estado.oponenteEstado = "Cambaleando";
                }
            } else if (movA.efeito === "LancaParede") {
                // Lança Horizontal (Montanha)
                if (chanceColisao) {
                    resultado.danoB += 10;
                    resultado.narracao += " O oponente colide com uma MONTANHA! (+10 Dano de Impacto) O combo é interrompido!";
                    estado.meuEstado = isAereo ? "Aereo" : "Distancia";
                    estado.oponenteEstado = isAereo ? "Aereo" : "CambaleandoDist";
                } else {
                    resultado.narracao += " O oponente é lançado ao longe!";
                    estado.meuEstado = isAereo ? "AereoPerseguicao" : "Perseguicao";
                    estado.oponenteEstado = isAereo ? "AereoVoando" : "Voando";
                }
            } else {
                // Lança para cima (Aereo)
                resultado.narracao += " O oponente é arremessado aos CÉUS!";
                estado.meuEstado = "AereoPerseguicao";
                estado.oponenteEstado = "AereoVoando";
            }
        } else if (meuEstadoAnterior === "Distancia" || meuEstadoAnterior === "OfensivaDist" || meuEstadoAnterior === "CambaleandoDist") {
            estado.meuEstado = "OfensivaDist";
            estado.oponenteEstado = "CambaleandoDist";
        } else if (meuEstadoAnterior === "AereoSolo" || oponEstadoAnterior === "SoloAereo") {
            estado.meuEstado = "AereoSolo";
            estado.oponenteEstado = "SoloAereo";
        } else if (meuEstadoAnterior === "Aereo" || oponEstadoAnterior === "Aereo") {
            estado.meuEstado = "Aereo";
            estado.oponenteEstado = "Aereo";
        } else {
            estado.meuEstado = "Ofensiva";
            estado.oponenteEstado = "Cambaleando";
        }
    } else if (resultado.danoA > 0 && resultado.danoB === 0) {
        if (movB.efeito === "LancaParede" || movB.efeito === "LancaCeu") {
            let chanceColisao = Math.random() < 0.5;
            let isAereo = oponEstadoAnterior === "Aereo" || oponEstadoAnterior === "AereoPerseguicao" || oponEstadoAnterior === "AereoVoando" || oponEstadoAnterior === "AereoSolo";
            
            if (movB.efeito === "LancaCeu" && isAereo) {
                if (chanceColisao) {
                    resultado.danoA += 10;
                    resultado.narracao += " Você despencão e COLIDE com o solo! (+10 Dano de Impacto) O combo é interrompido!";
                    estado.oponenteEstado = "Neutro";
                    estado.meuEstado = "Cambaleando";
                } else {
                    resultado.narracao += " Você despencão, mas aterrissa em pé!";
                    estado.oponenteEstado = "Neutro";
                    estado.meuEstado = "Cambaleando";
                }
            } else if (movB.efeito === "LancaParede") {
                if (chanceColisao) {
                    resultado.danoA += 10;
                    resultado.narracao += " Você colide com uma MONTANHA! (+10 Dano de Impacto) O combo é interrompido!";
                    estado.oponenteEstado = isAereo ? "Aereo" : "Distancia";
                    estado.meuEstado = isAereo ? "Aereo" : "CambaleandoDist";
                } else {
                    resultado.narracao += " Você é lançado ao longe!";
                    estado.oponenteEstado = isAereo ? "AereoPerseguicao" : "Perseguicao";
                    estado.meuEstado = isAereo ? "AereoVoando" : "Voando";
                }
            } else {
                resultado.narracao += " Você é arremessado aos CÉUS!";
                estado.oponenteEstado = "AereoPerseguicao";
                estado.meuEstado = "AereoVoando";
            }
        } else if (oponEstadoAnterior === "Distancia" || oponEstadoAnterior === "OfensivaDist" || oponEstadoAnterior === "CambaleandoDist") {
            estado.oponenteEstado = "OfensivaDist";
            estado.meuEstado = "CambaleandoDist";
        } else if (meuEstadoAnterior === "SoloAereo" || oponEstadoAnterior === "AereoSolo") {
            estado.meuEstado = "SoloAereo";
            estado.oponenteEstado = "AereoSolo";
        } else if (oponEstadoAnterior === "Aereo" || meuEstadoAnterior === "Aereo") {
            estado.oponenteEstado = "Aereo";
            estado.meuEstado = "Aereo";
        } else {
            estado.oponenteEstado = "Ofensiva";
            estado.meuEstado = "Cambaleando";
        }
    } else if (resultado.danoA > 0 && resultado.danoB > 0) {
        // Ambos tomaram dano (Clash)
        let isAereo = meuEstadoAnterior === "Aereo" || meuEstadoAnterior === "AereoPerseguicao" || meuEstadoAnterior === "AereoVoando";
        let isAereoSep = meuEstadoAnterior === "AereoSolo" || meuEstadoAnterior === "SoloAereo";
        if (isAereo) {
            estado.meuEstado = "Aereo"; estado.oponenteEstado = "Aereo";
        } else if (isAereoSep) {
            estado.meuEstado = meuEstadoAnterior; estado.oponenteEstado = oponEstadoAnterior;
        } else {
            estado.meuEstado = "Neutro"; estado.oponenteEstado = "Neutro";
        }
    } else {
        // Se nenhum dano ocorreu e nenhum estado foi forçado (ex: preparo do kamehameha), mantém o estado atual
        estado.meuEstado = meuEstadoAnterior;
        estado.oponenteEstado = oponEstadoAnterior;
    }

    animarArena(resultado);
    adicionarLog(`Turno: Você [${movA.nome}] vs Oponente [${movB.nome}]`);
    adicionarLog(`Resultado: ${resultado.narracao}`);
    atualizarStatusUI();
    
    // Bloqueia os botões imediatamente para o jogador não clicar durante a narração
    document.querySelectorAll('.btn-acao').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    });
    
    jaResolviTurno = false;
    setTimeout(() => iniciarTurno(), 5000); // 5 segundos para leitura
}

function abrirJanelaLeilaoKi() {
    jaResolviTurno = false; 
    
    const area = document.getElementById('area-gifs');
    const maxKi = Math.min(50, estado.meuKi);
    
    if (maxKi < 10) {
        area.innerHTML = `
            <div style="width: 100%; text-align: center;">
                <h2 style="color: #ffcc00; margin-bottom: 10px;">⚔️ CLASH DE FEIXES! ⚔️</h2>
                <p style="font-size: 1.2rem; margin-top: 15px;">Você não tem Ki suficiente para injetar (0 Ki).</p>
                <p style="font-size: 0.9rem; color: #aaa; margin-top: 10px;">Aguardando oponente...</p>
            </div>
        `;
        setTimeout(async () => {
            if (isModoBot) {
                finalizarClashBot(0);
            } else {
                await db.collection('salas').doc(codigoSalaAtual).update({ [`clashKi.${meuUid}`]: 0 });
            }
        }, 1500);
        return;
    }
    
    area.innerHTML = `
        <div style="width: 100%; text-align: center;">
            <h2 style="color: #ffcc00; margin-bottom: 10px;">⚔️ CLASH DE FEIXES! ⚔️</h2>
            <p style="font-size: 1rem; margin-bottom: 15px;">Vocês usaram o ataque ao mesmo tempo! Quanto de Ki injetar na disputa?</p>
            <input type="range" id="input-clash-ki" min="10" max="${maxKi}" value="10" oninput="document.getElementById('valor-clash-ki').innerText = this.value" style="width: 80%;">
            <div style="font-size: 2rem; font-weight: bold; color: #3498db; margin: 10px 0;"><span id="valor-clash-ki">10</span> Ki</div>
            <button id="btn-injetar-ki" class="btn-acao" style="background: #e74c3c; color: white; border: none; padding: 10px 20px; font-size: 1.1rem;">INJETAR!</button>
        </div>
    `;

    document.getElementById('btn-injetar-ki').onclick = async () => {
        const injectA = parseInt(document.getElementById('input-clash-ki').value);
        document.getElementById('btn-injetar-ki').disabled = true;
        document.getElementById('btn-injetar-ki').innerText = "AGUARDANDO OPONENTE...";
        
        if (isModoBot) {
            const maxBot = Math.min(50, estado.oponenteKi);
            const injectB = Math.floor(Math.random() * (maxBot - 9)) + 10;
            finalizarClashBot(injectA, injectB);
        } else {
            await db.collection('salas').doc(codigoSalaAtual).update({ [`clashKi.${meuUid}`]: injectA });
        }
    };
}

function finalizarClashBot(injectA, injectB) {
    const resClash = resolverClash(28, injectA, injectB);
    estado.meuKi = Math.max(0, estado.meuKi - injectA);
    estado.oponenteKi = Math.max(0, estado.oponenteKi - injectB);
    document.getElementById('area-gifs').innerHTML = '<span id="texto-narracao"></span>';
    aplicarResultadoTurno(
        { nome: "Kamehameha", efeito: "Disparar", subTipo: "Pedra", familia: "Ki" }, 
        { nome: "Kamehameha", efeito: "Disparar", subTipo: "Pedra", familia: "Ki" }, 
        resClash
    );
}

function atualizarArena(texto) {
    const area = document.getElementById('texto-narracao');
    if (area) area.innerText = texto;
}

function animarArena(resultado) {
    const app = document.getElementById('app');
    const jog = document.getElementById('avatar-jog');
    const opon = document.getElementById('avatar-opon');
    const texto = document.getElementById('texto-narracao');

    if (texto) {
        texto.innerText = resultado.narracao;
        if (resultado.danoB > 0 && resultado.danoA === 0) {
            texto.style.color = '#2ecc71';
        } else if (resultado.danoA > 0 && resultado.danoB === 0) {
            texto.style.color = '#e74c3c';
        } else if (resultado.danoA > 0 && resultado.danoB > 0) {
            texto.style.color = '#f1c40f';
        } else {
            texto.style.color = '#fff';
        }
    }

    if (jog) jog.className = 'avatar-lutador esquerda';
    if (opon) opon.className = 'avatar-lutador direita-avatar';

    if (resultado.danoB > 0 && opon) opon.classList.add('anim-dano');
    if (resultado.danoA > 0 && jog) jog.classList.add('anim-dano');

    const danoMaximoAnim = Math.max(resultado.danoA, resultado.danoB);
    if (danoMaximoAnim > 0) {
        if (danoMaximoAnim >= 25) { // Tremor forte para Kamehameha, Genki, Finalizadores
            app.classList.add('tremor-tela-forte');
            setTimeout(() => app.classList.remove('tremor-tela-forte'), 4500); // Dura até quase o fim da narração de 5s
        } else { // Tremor normal para golpes comuns
            app.classList.add('tremor-tela');
            setTimeout(() => app.classList.remove('tremor-tela'), 400);
        }
    }
}

function adicionarLog(texto) {
    const log = document.getElementById('log-narracao');
    const p = document.createElement('p');
    p.innerText = texto;
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
}
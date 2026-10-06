// js/engine.js
// Regras puras do combate (GDD 3.1, 3.3, 3.4, 10.1, 10.3, 10.4, 10.6)

const venceFamilia = {
    "Ki": "Fisico",
    "Fisico": "Defesa",
    "Defesa": "Ki"
};

const venceSubTipo = {
    "Azul": "Vermelho",
    "Vermelho": "Verde",
    "Verde": "Azul"
};

function sortearFrase(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function resolverTurno(escolhaA, escolhaB, custoKiA = 0, custoKiB = 0) {
    let danoA = 0, danoB = 0, kiA = 0, kiB = 0;
    let cancelarA = false, cancelarB = false;
    let narracao = "";
    let proximoEstadoA = null, proximoEstadoB = null;
    let clashDetectado = false;

    // 1. Descontar o custo de Ki
    kiA -= custoKiA;
    kiB -= custoKiB;

    // 0.5 Hesitação (Tensão Máxima)
    const isHesitarA = escolhaA.efeito === "Hesitar";
    const isHesitarB = escolhaB.efeito === "Hesitar";

    if (isHesitarA && isHesitarB) {
        narracao = "Ambos hesitaram! O tempo passou em branco.";
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }
    if (isHesitarA) {
        if (escolhaB.dano > 0) {
            danoA = escolhaB.dano;
            narracao = "Você hesitou demais! O oponente te acerta de graça!";
        } else {
            narracao = "Você hesitou e perdeu a vez. O oponente age livremente.";
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }
    if (isHesitarB) {
        if (escolhaA.dano > 0) {
            danoB = escolhaA.dano;
            narracao = "O oponente hesitou demais! Você acerta um golpe de graça!";
        } else {
            narracao = "O oponente hesitou e perdeu a vez. Você age livremente.";
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 2. Preparação de Especial Kamehameha (GDD 3.4)
    const isPrepararA = escolhaA.efeito === "Preparar";
    const isPrepararB = escolhaB.efeito === "Preparar";

    if (isPrepararA && isPrepararB) {
        narracao = sortearFrase([
            "Ambos preparam um ataque especial! O ar treme pesadamente...",
            "Energia se acumula dos dois lados! O céu estremece!",
            "KA... ME... HA... ME... As auras explodem em chamas azuis!"
        ]);
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    if (isPrepararA) {
        if (escolhaB.familia === "Fisico" || escolhaB.familia === "Ki") {
            danoA = escolhaB.dano;
            cancelarA = true;
            kiA += 10;
            narracao = sortearFrase([
                "Preparação interrompida! Você apanhou dano cheio sem defesa!",
                "O ataque do oponente te acerta antes do disparo! Dano total!",
                "Impossível concentrar! Você foi brutalmente interrompido!"
            ]);
        } else {
            narracao = sortearFrase([
                "Você concentra energia... KA... ME... (Vulnerável!)",
                "O céu escurece ao seu redor. Você está vulnerável!",
                "A aura cresce. É hora do Kamehameha no próximo turno!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    if (isPrepararB) {
        if (escolhaA.familia === "Fisico" || escolhaA.familia === "Ki") {
            danoB = escolhaA.dano;
            cancelarB = true;
            kiB += 10;
            narracao = sortearFrase([
                "Preparação do oponente interrompida! Ele apanhou!",
                "Você não deixou ele respirar! Dano cheio no preparo!",
                "O oponente tenta carregar, mas você é mais rápido!"
            ]);
        } else {
            narracao = sortearFrase([
                "Oponente concentra energia... (Cuidado!)",
                "A aura do oponente cresce perigosamente. Ele está vulnerável!",
                "O ar fica denso. O oponente prepara um Kamehameha!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 2.5 Genki Dama (GDD 10.6)
    const isPrepararGenkiA = escolhaA.efeito === "PrepararGenki";
    const isPrepararGenkiB = escolhaB.efeito === "PrepararGenki";

    if (isPrepararGenkiA || isPrepararGenkiB) {
        if (isPrepararGenkiA) {
            if (escolhaB.efeito === "AproximarVel") {
                danoA = 10; // Dano da aproximação
                cancelarA = true; // Cancela a Genki
                narracao = sortearFrase([
                    "O oponente cruzou a arena num flash! Sua Genki Dama foi cancelada!",
                    "Aproximação veloz! Você não teve tempo de juntar energia!",
                    "O oponente te acerta antes de você erguer as mãos!"
                ]);
            } else {
                narracao = sortearFrase([
                    "Você ergue as mãos ao céu... O planeta responde vibrando!",
                    "A natureza clama por justiça. Energia de todos converge!",
                    "Uma esfera de esperança começa a brilhar acima de você."
                ]);
            }
        } else if (isPrepararGenkiB) {
            if (escolhaA.efeito === "AproximarVel") {
                danoB = 10;
                cancelarB = true;
                narracao = sortearFrase([
                    "Você se aproximou em velocidade! Genki Dama cancelada!",
                    "Flash veloz! O oponente não conseguiu reunir a energia!",
                    "Você interrompe o milagre com um golpe rápido!"
                ]);
            } else {
                narracao = sortearFrase([
                    "Oponente ergue as mãos... A natureza clama!",
                    "A esperança de todos se forma nas mãos do oponente.",
                    "Uma aura colossal vem de cima. A arena treme!"
                ]);
            }
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA: "Distancia", proximoEstadoB: "Distancia", clashDetectado };
    }

    const isDispararGenkiA = escolhaA.efeito === "DispararGenki";
    const isDispararGenkiB = escolhaB.efeito === "DispararGenki";

    if (isDispararGenkiA || isDispararGenkiB) {
        if (isDispararGenkiA) {
            if (escolhaB.familia === "Defesa") {
                danoB = Math.floor(escolhaA.dano * 0.2);
                kiB += 15;
                narracao = sortearFrase([
                    "GENKI DAMA! Mas o oponente a agarrou e reduziu o dano!",
                    "A esfera desce, mas a guarda do oponente a detém parcialmente!",
                    "O oponente range os dentes e segura a energia!"
                ]);
            } else {
                danoB = escolhaA.dano;
                narracao = sortearFrase([
                    "GENKI DAMAAA! A esperança de todos cai como meteorito!",
                    "A esfera de energia aniquila tudo no caminho!",
                    "O oponente é engolido pela luz da Genki Dama!"
                ]);
            }
        } else if (isDispararGenkiB) {
            if (escolhaA.familia === "Defesa") {
                danoA = Math.floor(escolhaB.dano * 0.2);
                kiA += 15;
                narracao = sortearFrase([
                    "Oponente disparou GENKI DAMA! Você a agarrou e reduziu o dano!",
                    "A luz cai, mas sua guarda a detém parcialmente!",
                    "Você range os dentes e segura a energia da Genki!"
                ]);
            } else {
                danoA = escolhaB.dano;
                narracao = sortearFrase([
                    "Você foi atingido de cheio por uma GENKI DAMA!",
                    "A esfera de esperança do oponente te engole por completo!",
                    "O peso de um planeta cai sobre você!"
                ]);
            }
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA: "Neutro", proximoEstadoB: "Neutro", clashDetectado };
    }

    // 3.0 Sofrendo Combo (Vítima não pode reagir, dano direto)
    const isApanharComboA = escolhaA.efeito === "ApanharCombo";
    const isApanharComboB = escolhaB.efeito === "ApanharCombo";

    if (isApanharComboA || isApanharComboB) {
        if (isApanharComboB && (escolhaA.familia === "Fisico" || escolhaA.familia === "Ki")) {
            danoB = escolhaA.dano;
            narracao = sortearFrase([
                `${escolhaA.nome} FINALIZA O COMBO! Dano massivo direto!`,
                `Golpe final esmagador! ${escolhaA.nome} encerra a sequência!`,
                `O oponente não teve chance! ${escolhaA.nome} causa dano limpo!`
            ]);
            proximoEstadoA = "OfensivaDist"; proximoEstadoB = "CambaleandoDist";
        } else if (isApanharComboA && (escolhaB.familia === "Fisico" || escolhaB.familia === "Ki")) {
            danoA = escolhaB.dano;
            narracao = sortearFrase([
                `${escolhaB.nome} FINALIZA O COMBO! Dano massivo direto!`,
                `Golpe final esmagador! ${escolhaB.nome} encerra a sequência!`,
                `Você não teve chance! ${escolhaB.nome} causa dano limpo!`
            ]);
            proximoEstadoB = "OfensivaDist"; proximoEstadoA = "CambaleandoDist";
        } else {
            narracao = "O combo foi interrompido de alguma forma.";
            proximoEstadoA = "Neutro"; proximoEstadoB = "Neutro";
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 3. Disparo de Especial Kamehameha (GDD 3.4) e Clash de Feixes (GDD 10.4)
    const isDispararA = escolhaA.efeito === "Disparar";
    const isDispararB = escolhaB.efeito === "Disparar";

    if (isDispararA && isDispararB) {
        narracao = "CLASH DE FEIXES INICIADO!";
        clashDetectado = true;
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    if (isDispararA) {
        if (escolhaB.familia === "Defesa") {
            danoB = Math.floor(escolhaA.dano * 0.2);
            kiB += 15;
            narracao = sortearFrase([
                "KAMEHAMEHA! Mas o oponente reduziu o dano com a guarda!",
                "O feixe azul explode, mas a defesa do oponente segura o impacto!",
                "O oponente cruza os braços e diminui o dano do Kamehameha!"
            ]);
        } else {
            danoB = escolhaA.dano;
            narracao = sortearFrase([
                "KAMEHAMEHAAA! Dano massivo conectado!",
                "O feixe engole o oponente por completo! Dano cheio!",
                "Onda de energia devastadora! O oponente é varrido!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    if (isDispararB) {
        if (escolhaA.familia === "Defesa") {
            danoA = Math.floor(escolhaB.dano * 0.2);
            kiA += 15;
            narracao = sortearFrase([
                "Oponente disparou KAMEHAMEHA! Você reduziu o dano!",
                "O feixe vem forte, mas sua guarda segura parte do impacto!",
                "Você cruza os braços e ameniza o dano do Kamehameha!"
            ]);
        } else {
            danoA = escolhaB.dano;
            narracao = sortearFrase([
                "Você foi atingido de cheio por um KAMEHAMEHA!",
                "O feixe azul do oponente te engole! Dano massivo!",
                "Sem defesa! O Kamehameha te atinge com força total!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 3.5 Reversal de Desespero (GDD 10.8)
    const isReversalA = escolhaA.efeito === "Reversal";
    const isReversalB = escolhaB.efeito === "Reversal";

    if (isReversalA && isReversalB) {
        danoA = Math.floor(escolhaB.dano * 0.3);
        danoB = Math.floor(escolhaA.dano * 0.3);
        narracao = sortearFrase([
            "Ambos tentaram Reversal! Colidiram no ar em impacto duvidoso!",
            "Desespero dos dois lados! Os golpes se cruzam aleatoriamente!",
            "Caos total! Ambos arriscaram tudo e se machucaram!"
        ]);
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    if (isReversalA) {
        if (escolhaB.familia === "Fisico") {
            danoB = escolhaA.dano;
            narracao = sortearFrase([
                "REVERSAL! Você interceptou o físico e inverteu a situação!",
                "Golpe de desespero conectado! A Ofensiva é sua agora!",
                "Você lê o ataque e pega o oponente de surpresa!"
            ]);
        } else {
            danoA = escolhaB.dano;
            narracao = sortearFrase([
                "Reversal falhou! O oponente não atacou fisicamente.",
                "Você tentou reverter, mas o oponente fez outra coisa. Apanhou!",
                "Esperava um soco, mas veio outra coisa. Reversal inútil!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    if (isReversalB) {
        if (escolhaA.familia === "Fisico") {
            danoA = escolhaB.dano;
            narracao = sortearFrase([
                "REVERSAL do oponente! Seu ataque físico foi interceptado!",
                "O oponente leu seu golpe e inverteu a pressão!",
                "De repente você é quem está cambaleando! Reversal nele!"
            ]);
        } else {
            danoB = escolhaA.dano;
            narracao = sortearFrase([
                "Reversal do oponente falhou miseravelmente!",
                "Ele esperava um soco, mas você fez outra coisa!",
                "O oponente tenta reverter, mas você não caiu na lábia!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 3.5.2 Zanzoken (GDD 10.3)
    const isZanzokenA = escolhaA.efeito === "Zanzoken";
    const isZanzokenB = escolhaB.efeito === "Zanzoken";

    if (isZanzokenA && isZanzokenB) {
        narracao = sortearFrase([
            "Ambos usam Zanzoken! Imagens residuais se cruzam no ar!",
            "Velocidade máxima dos dois lados! Ninguém acertou ninguém!",
            "Duas afterimages colidem! Eles já sumiram de vista!"
        ]);
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA: "Neutro", proximoEstadoB: "Neutro", clashDetectado };
    }
    if (isZanzokenA) {
        if (escolhaB.familia === "Fisico") {
            proximoEstadoA = "Ofensiva"; proximoEstadoB = "Cambaleando";
            narracao = sortearFrase([
                "ZANZOKEN! Você evade do físico e aparece na Ofensiva!",
                "Sua imagem pisca! Você foge e aparece atrás do oponente!",
                "O golpe do oponente acerta o vazio! Zanzoken perfeito!"
            ]);
        } else {
            danoA = escolhaB.dano;
            narracao = sortearFrase([
                "Zanzoken falhou! O oponente usou Ki e te pegou!",
                "Você tentou desviar, mas um feixe de energia te acertou!",
                "O oponente não atacou fisicamente. Zanzoken inútil!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }
    if (isZanzokenB) {
        if (escolhaA.familia === "Fisico") {
            proximoEstadoB = "Ofensiva"; proximoEstadoA = "Cambaleando";
            narracao = sortearFrase([
                "ZANZOKEN do oponente! Ele evade seu físico e te pega!",
                "A imagem dele pisca! O oponente foge e aparece atrás de você!",
                "Seu golpe acerta o vazio! O oponente apareceu na sua retina!"
            ]);
        } else {
            danoB = escolhaA.dano;
            narracao = sortearFrase([
                "Zanzoken do oponente falhou! Seu Ki o pegou no ar!",
                "Ele tentou desviar, mas sua rajada foi mais rápida!",
                "O oponente esperava um soco. Errou feio a leitura!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 3.5.3 Atordoado (GDD 10.1)
    const isStunMoveA = escolhaA.efeito === "Sacudir" || escolhaA.efeito === "Aguentar";
    const isStunMoveB = escolhaB.efeito === "Sacudir" || escolhaB.efeito === "Aguentar";

    if (isStunMoveA || isStunMoveB) {
        if (escolhaA.efeito === "Sacudir") {
            danoA = escolhaB.dano;
            narracao = sortearFrase([
                "Você sacode a cabeça e limpa o atordoamento, mas apanhou!",
                "Você recobra os sentidos, mas o golpe te acertou!",
                "O zumbido passa, mas o dano veio cheio."
            ]);
        } else if (escolhaA.efeito === "Aguentar") {
            danoA = Math.floor(escolhaB.dano * 0.3);
            narracao = sortearFrase([
                "Você aguenta firme! Dano reduzido e atordoamento limpo.",
                "Postura de ferro! Você absorve parte do impacto e reage!",
                "Você range os dentes, recebe o golpe mas volta a si!"
            ]);
        } else if (escolhaB.efeito === "Sacudir") {
            danoB = escolhaA.dano;
            narracao = sortearFrase([
                "Oponente sacode a cabeça e limpa o atordoamento, mas apanhou!",
                "O oponente recobra os sentidos, mas seu golpe acertou!",
                "O zumbido passa nele, mas o dano veio cheio."
            ]);
        } else if (escolhaB.efeito === "Aguentar") {
            danoB = Math.floor(escolhaA.dano * 0.3);
            narracao = sortearFrase([
                "Oponente aguenta firme! Dano reduzido e volta a si.",
                "Postura de ferro dele! Absorve o impacto e reage!",
                "Ele range os dentes, toma o golpe mas limpa o stun!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA: "Neutro", proximoEstadoB: "Neutro", clashDetectado };
    }

    // 3.6 Matriz À Distância (GDD 6.2)
    const isAproxA = escolhaA.efeito === "Aproximar" || escolhaA.efeito === "AproximarVel";
    const isAproxB = escolhaB.efeito === "Aproximar" || escolhaB.efeito === "AproximarVel";

    if (isAproxA || isAproxB) {
        if (escolhaA.efeito === "AproximarVel" && escolhaB.efeito === "AproximarVel") {
            danoA = 5; danoB = 5;
            proximoEstadoA = "Neutro"; proximoEstadoB = "Neutro";
            narracao = sortearFrase([
                "CHOQUE VELOZ! Ambos se cruzam no ar e colidem pesado! 5 de dano para cada. Volta ao Neutro.",
                "Impulso duplo! Vocês se chocam no meio da arena!",
                "Velocidade máxima dos dois lados! O impacto ecoa!"
            ]);
        } else if (escolhaA.efeito === "AproximarVel" && (escolhaB.familia === "Ki" || escolhaB.efeito === "Carregar")) {
            proximoEstadoA = "Ofensiva"; proximoEstadoB = "Cambaleando";
            narracao = sortearFrase([
                "Aproximação em velocidade! Você evade e chega na Ofensiva!",
                "Flash veloz! Você cruza a arena e surpreende o oponente!",
                "O oponente não te viu chegando! A pressão é sua!"
            ]);
        } else if (escolhaB.efeito === "AproximarVel" && (escolhaA.familia === "Ki" || escolhaA.efeito === "Carregar")) {
            proximoEstadoB = "Ofensiva"; proximoEstadoA = "Cambaleando";
            narracao = sortearFrase([
                "Oponente se aproxima em velocidade! Você é pego!",
                "Flash veloz! O oponente cruza a arena e te pega de guarda baixa!",
                "Você não o viu chegando! O oponente assume a Ofensiva!"
            ]);
        } else if (escolhaA.efeito === "Aproximar" && escolhaB.efeito === "Carregar") {
            proximoEstadoA = "Ofensiva"; proximoEstadoB = "Cambaleando";
            narracao = sortearFrase([
                "Você se aproxima e o oponente é pego carregando Ki!",
                "Caminhada triunfante! Você chega e dá um susto nele!",
                "O oponente estava de olhos fechados. Você invadiu o espaço dele!"
            ]);
        } else if (escolhaB.efeito === "Aproximar" && escolhaA.efeito === "Carregar") {
            proximoEstadoB = "Ofensiva"; proximoEstadoA = "Cambaleando";
            narracao = sortearFrase([
                "Oponente se aproxima e te pega carregando Ki!",
                "Caminhada triunfante dele! Você estava distraído!",
                "O oponente invade seu espaço enquanto você focava em energia!"
            ]);
        } else if (isAproxA && isAproxB) {
            narracao = sortearFrase([
                "Ambos se aproximam. Volta ao Neutro.",
                "Distância fechada pelos dois lados. Fim de papo.",
                "Corpo a corpo novamente. A luta esquenta!"
            ]);
        } else if (escolhaA.efeito === "Aproximar" && escolhaB.familia === "Ki") {
            danoA = escolhaB.dano;
            narracao = sortearFrase([
                "Você tentou se aproximar devagar e tomou Ki direto!",
                "Caminhar foi erro. O oponente te bombardeou de longe!",
                "Aproximação lenta custa caro. Ki cheio no peito!"
            ]);
        } else if (escolhaB.efeito === "Aproximar" && escolhaA.familia === "Ki") {
            danoB = escolhaA.dano;
            narracao = sortearFrase([
                "Oponente tentou se aproximar e tomou seu Ki!",
                "Ele caminhou ingenuamente. Sua rajada foi certeira!",
                "Aproximação lenta do oponente. Erro fatal!"
            ]);
        } else if (escolhaA.efeito === "Aproximar" && escolhaB.familia === "Defesa") {
            proximoEstadoA = "Neutro"; proximoEstadoB = "Neutro";
            narracao = sortearFrase([
                "Você se aproxima com cuidado enquanto o oponente mantém a guarda. Corpo a corpo!",
                "Aproximação cautelosa. O oponente te observa defender.",
                "Você fecha a distância, o oponente recua um passo na guarda."
            ]);
        } else if (escolhaB.efeito === "Aproximar" && escolhaA.familia === "Defesa") {
            proximoEstadoA = "Neutro"; proximoEstadoB = "Neutro";
            narracao = sortearFrase([
                "O oponente se aproxima com cuidado enquanto você mantém a guarda. Corpo a corpo!",
                "Aproximação cautelosa dele. Você o observa chegar.",
                "O oponente fecha a distância, você recua um passo na guarda."
            ]);
        } else {
            narracao = sortearFrase([
                "A distância foi fechada. Volta ao Neutro.",
                "O gap foi fechado. Corpo a corpo novamente!",
                "Vocês se reencontram no centro da arena."
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

        // 3.65 Mecânica de Elevação (Combate Aéreo)
    const isElevacaoA = escolhaA.efeito === "SubirCeus" || escolhaA.efeito === "DescerCeus";
    const isElevacaoB = escolhaB.efeito === "SubirCeus" || escolhaB.efeito === "DescerCeus";

    if (isElevacaoA || isElevacaoB) {
        let elevacaoPermitidaA = true;
        let elevacaoPermitidaB = true;

        // A tenta elevar e B ataca
        if (isElevacaoA && (escolhaB.familia === "Fisico" || escolhaB.familia === "Ki")) {
            if (venceSubTipo[escolhaB.subTipo] === escolhaA.subTipo) { // B vence A
                elevacaoPermitidaA = false;
                danoA = escolhaB.dano;
                kiA += 10;
                proximoEstadoB = "Ofensiva"; proximoEstadoA = "Cambaleando";
                narracao = "O oponente te acerta antes de você mudar de altitude!";
            } else if (venceSubTipo[escolhaA.subTipo] === escolhaB.subTipo) { // A vence B
                elevacaoPermitidaA = true;
                if (escolhaA.efeito === "SubirCeus") {
                    proximoEstadoA = "AereoSolo"; proximoEstadoB = "SoloAereo";
                    narracao = "Você desvia do ataque e voa rumo às nuvens! O oponente fica no solo.";
                } else {
                    proximoEstadoA = "SoloAereo"; proximoEstadoB = "AereoSolo";
                    narracao = "Você desce ao solo desviando do ataque! O oponente permanece no ar.";
                }
            } else { // Empate
                danoA = Math.floor(escolhaB.dano * 0.3);
                danoB = Math.floor(escolhaA.dano * 0.3);
                kiA += 10; kiB += 10;
                narracao = "CLASH! O golpe colide com a sua evasão. Ambos cambaleiam.";
                proximoEstadoA = "Cambaleando"; proximoEstadoB = "Cambaleando";
                elevacaoPermitidaA = false;
            }
        }
        // B tenta elevar e A ataca
        else if (isElevacaoB && (escolhaA.familia === "Fisico" || escolhaA.familia === "Ki")) {
            if (venceSubTipo[escolhaA.subTipo] === escolhaB.subTipo) { // A vence B
                elevacaoPermitidaB = false;
                danoB = escolhaA.dano;
                kiB += 10;
                proximoEstadoA = "Ofensiva"; proximoEstadoB = "Cambaleando";
                narracao = "Você acerta o oponente antes dele mudar de altitude!";
            } else if (venceSubTipo[escolhaB.subTipo] === escolhaA.subTipo) { // B vence A
                elevacaoPermitidaB = true;
                if (escolhaB.efeito === "SubirCeus") {
                    proximoEstadoB = "AereoSolo"; proximoEstadoA = "SoloAereo";
                    narracao = "O oponente desvia do seu ataque e voa rumo às nuvens! Você fica no solo.";
                } else {
                    proximoEstadoB = "SoloAereo"; proximoEstadoA = "AereoSolo";
                    narracao = "O oponente desce ao solo desviando do seu ataque! Você permanece no ar.";
                }
            } else { // Empate
                danoA = Math.floor(escolhaB.dano * 0.3);
                danoB = Math.floor(escolhaA.dano * 0.3);
                kiA += 10; kiB += 10;
                narracao = "CLASH! Seu golpe colide com a evasão dele. Ambos cambaleiam.";
                proximoEstadoA = "Cambaleando"; proximoEstadoB = "Cambaleando";
                elevacaoPermitidaB = false;
            }
        }
        
        if (elevacaoPermitidaA && elevacaoPermitidaB && isElevacaoA && isElevacaoB) {
            if (escolhaA.efeito === "SubirCeus" && escolhaB.efeito === "SubirCeus") {
                proximoEstadoA = "Aereo"; proximoEstadoB = "Aereo";
                narracao = "Ambos sobem aos céus! A batalha migra para as nuvens!";
            } else if (escolhaA.efeito === "DescerCeus" && escolhaB.efeito === "DescerCeus") {
                proximoEstadoA = "Neutro"; proximoEstadoB = "Neutro";
                narracao = "Ambos descem ao solo. De volta ao corpo a corpo!";
            } else if (escolhaA.efeito === "SubirCeus" && escolhaB.efeito === "DescerCeus") {
                proximoEstadoA = "AereoSolo"; proximoEstadoB = "SoloAereo";
                narracao = "Você voa aos céus enquanto o oponente desce ao solo. A distância aumenta!";
            } else if (escolhaA.efeito === "DescerCeus" && escolhaB.efeito === "SubirCeus") {
                proximoEstadoA = "SoloAereo"; proximoEstadoB = "AereoSolo";
                narracao = "Você desce ao solo enquanto o oponente voa aos céus. A distância aumenta!";
            }
        }
        // A eleva, B faz ação neutra/defesa
        else if (elevacaoPermitidaA && isElevacaoA && !isElevacaoB && escolhaB.familia !== "Fisico" && escolhaB.familia !== "Ki") {
            if (escolhaA.efeito === "SubirCeus") {
                proximoEstadoA = "AereoSolo"; proximoEstadoB = "SoloAereo";
                if (escolhaB.efeito === "Carregar") { kiB += 30; narracao = "Você voa rumo às nuvens! O oponente fica no solo e aproveita para carregar energia."; }
                else if (escolhaB.familia === "Defesa") { narracao = "Você voa rumo às nuvens! O oponente se protege no solo."; }
                else { narracao = "Você voa rumo às nuvens! O oponente recua no solo."; }
            } else { // DescerCeus
                proximoEstadoA = "SoloAereo"; proximoEstadoB = "AereoSolo";
                if (escolhaB.efeito === "Carregar") { kiB += 30; narracao = "Você aterrissa com força! O oponente permanece nos céus e carrega energia."; }
                else { narracao = "Você aterrissa no solo! O oponente permanece nos céus."; }
            }
        }
        // B eleva, A faz ação neutra/defesa
        else if (elevacaoPermitidaB && isElevacaoB && !isElevacaoA && escolhaA.familia !== "Fisico" && escolhaA.familia !== "Ki") {
            if (escolhaB.efeito === "SubirCeus") {
                proximoEstadoB = "AereoSolo"; proximoEstadoA = "SoloAereo";
                if (escolhaA.efeito === "Carregar") { kiA += 30; narracao = "O oponente voa rumo às nuvens! Você fica no solo e aproveita para carregar energia."; }
                else if (escolhaA.familia === "Defesa") { narracao = "O oponente voa rumo às nuvens! Você se protege no solo."; }
                else { narracao = "O oponente voa rumo às nuvens! Você recua no solo."; }
            } else { // DescerCeus
                proximoEstadoB = "SoloAereo"; proximoEstadoA = "AereoSolo";
                if (escolhaA.efeito === "Carregar") { kiA += 30; narracao = "O oponente aterrissa com força! Você permanece nos céus e carrega energia."; }
                else { narracao = "O oponente aterrissa no solo! Você permanece nos céus."; }
            }
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 3.7 Ações de Perseguição/Voando
    const isFlyingActionA = escolhaA.efeito === "Fugir" || escolhaA.efeito === "Estabilidade" || escolhaA.efeito === "ContraFurioso" || escolhaA.efeito === "Aura" || escolhaA.efeito === "Teleporte" || escolhaA.efeito === "DeixarRecuperar";
    const isFlyingActionB = escolhaB.efeito === "Fugir" || escolhaB.efeito === "Estabilidade" || escolhaB.efeito === "ContraFurioso" || escolhaB.efeito === "Aura" || escolhaB.efeito === "Teleporte" || escolhaB.efeito === "DeixarRecuperar";

    if (isFlyingActionA || isFlyingActionB) {
        if (escolhaA.efeito === "Fugir" && escolhaB.efeito === "Teleporte") {
            danoA = escolhaB.dano;
            proximoEstadoA = "Cambaleando"; proximoEstadoB = "Ofensiva";
            narracao = sortearFrase([
                "Você tentou fugir, mas o Teleporte do oponente te pegou no ar!",
                "Fuga interrompida! O oponente surgiu na sua frente e te acertou!",
                "O oponente previu sua rota de fuga e te emboscou!"
            ]);
        } else if (escolhaB.efeito === "Fugir" && escolhaA.efeito === "Teleporte") {
            danoB = escolhaA.dano;
            proximoEstadoB = "Cambaleando"; proximoEstadoA = "Ofensiva";
            narracao = sortearFrase([
                "Oponente tentou fugir, mas seu Teleporte o pegou no ar!",
                "Fuga interrompida! Você surgiu na frente dele e acertou o golpe!",
                "Você previu a rota de fuga e deu um emboscada nele!"
            ]);
                } else if (escolhaA.efeito === "Fugir") {
            proximoEstadoA = "Distancia"; proximoEstadoB = "Distancia";
            if (escolhaB.efeito === "Carregar") {
                kiB += 30;
                narracao = "Você foge voando para a distância, mas o oponente aproveita para carregar Ki!";
            } else {
                narracao = "Você fugiu voando para a distância!";
            }
        } else if (escolhaB.efeito === "Fugir") {
            proximoEstadoB = "Distancia"; proximoEstadoA = "Distancia";
            if (escolhaA.efeito === "Carregar") {
                kiA += 30;
                narracao = "O oponente foge voando para a distância, mas você aproveita para carregar Ki!";
            } else {
                narracao = "Oponente fugiu voando para a distância!";
            }
        } else if (escolhaA.efeito === "DeixarRecuperar") {
            proximoEstadoA = "Neutro"; proximoEstadoB = "Neutro";
            kiB += 20;
            narracao = sortearFrase([
                "Você deixou o oponente se recuperar. Ambos voltam ao Neutro.",
                "Você afrouxa a guarda e deixa ele respirar. O placar zerou.",
                "Um momento de trégua. O oponente recupera o fôlego."
            ]);
        } else if (escolhaB.efeito === "DeixarRecuperar") {
            proximoEstadoB = "Neutro"; proximoEstadoA = "Neutro";
            kiA += 20;
            narracao = sortearFrase([
                "Oponente deixou você se recuperar. Volta ao Neutro.",
                "Ele afrouxou a guarda. Você respira fundo.",
                "Trégua inesperada. Você limpa a cabeça e volta ao Neutro."
            ]);
        } else if (escolhaA.efeito === "Aura") {
            if (escolhaB.efeito === "Estabilidade") {
                danoB = Math.floor(escolhaA.dano * 0.5);
                narracao = sortearFrase([
                    "Explosão de aura! O oponente resistiu, mas levou dano reduzido.",
                    "Sua aura explodi! Ele se protegeu, mas o impacto doou.",
                    "O oponente cruza os braços, mas sua aura o empurra metade do dano."
                ]);
            } else {
                danoB = escolhaA.dano;
                narracao = sortearFrase([
                    "Explosão de aura! O oponente foi arremessado de volta à distância.",
                    "Você explode energia de raiva! O oponente voa longe.",
                    "Sua aura cataclísmica manda ele de volta à parede!"
                ]);
                proximoEstadoB = "Distancia";
            }
        } else if (escolhaB.efeito === "Aura") {
            if (escolhaA.efeito === "Estabilidade") {
                danoA = Math.floor(escolhaB.dano * 0.5);
                narracao = sortearFrase([
                    "Oponente usa Aura! Você resistiu, mas levou dano reduzido.",
                    "Aura exploda! Você se protegeu, mas o impacto doou.",
                    "Você cruza os braços, mas a aura dele te empurra metade do dano."
                ]);
            } else {
                danoA = escolhaB.dano;
                narracao = sortearFrase([
                    "Oponente usa Explosão de aura! Você é arremessado à distância.",
                    "A raiva dele explode! Você voa longe.",
                    "Aura cataclísmica! Você é empurrado de volta!"
                ]);
                proximoEstadoA = "Distancia";
            }
        } else {
            if (escolhaA.subTipo === escolhaB.subTipo) {
                danoA = Math.floor(escolhaB.dano * 0.3);
                danoB = Math.floor(escolhaA.dano * 0.3);
                narracao = sortearFrase([
                    "CLASH AÉREO! Ambos cambaleiam no ar!",
                    "Golpes no ar colidem! Impacto duplo e pesado!",
                    "Caos no céu! Ninguém se safou do impacto."
                ]);
                proximoEstadoA = "Cambaleando"; proximoEstadoB = "Cambaleando";
            } else if (venceSubTipo[escolhaA.subTipo] === escolhaB.subTipo) {
                danoB = escolhaA.dano;
                narracao = sortearFrase([
                    "Sua técnica é superior no ar! O oponente é golpeado!",
                    "Você domina o espaço aéreo e acerta um golpe limpo!",
                    "O oponente não conseguiu escapar de seu ataque aéreo!"
                ]);
                proximoEstadoA = "Ofensiva"; proximoEstadoB = "Cambaleando";
            } else {
                danoA = escolhaB.dano;
                narracao = sortearFrase([
                    "A técnica do oponente é superior no ar! Você é golpeado!",
                    "Ele domina o espaço aéreo e te acerta um golpe limpo!",
                    "Você não conseguiu escapar de seu ataque aéreo!"
                ]);
                proximoEstadoB = "Ofensiva"; proximoEstadoA = "Cambaleando";
            }
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 4. Ações Neutras (Carregar Ki) - GDD 3.3
    const ehCarregarA = escolhaA.efeito === "Carregar";
    const ehCarregarB = escolhaB.efeito === "Carregar";

    if (ehCarregarA && ehCarregarB) {
        kiA += 30; kiB += 30;
        narracao = sortearFrase([
            "Ambos concentram poder! A aura ilumina a arena! (+30)",
            "Juntando energia! O ar fica pesado e elétrico! (+30)",
            "Reunindo poder! A terra treme com a força bruta! (+30)",
            "Ambos buscam o limite! O céu se escurece ao redor! (+30)",
            "Energia fluindo em ondas! Um choque de ambições! (+30)"
        ]);
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    } else if (ehCarregarA && !ehCarregarB) {
        kiA += 30;
        if (escolhaB.familia === "Defesa") {
            kiB += 15;
            narracao = sortearFrase([
                "Você carrega Ki enquanto o oponente se defende!",
                "Energia gratuita! O oponente não ousa atacar.",
                "Você estala os dedos e puxa energia. Ele só observa."
            ]);
        } else if (escolhaB.dano > 0) {
            danoA = escolhaB.dano;
            kiA += 10;
            narracao = sortearFrase([
                "Você foi pego carregando Ki e apanhou!",
                "Concentração interrompida na marra! Dano cheio!",
                "O oponente não teve dó. Você apanhou distraído!"
            ]);
        } else if (escolhaB.efeito === "Esperar") {
            narracao = "Você carrega Ki enquanto o oponente recua. A distância aumenta.";
            proximoEstadoA = "Distancia"; proximoEstadoB = "Distancia";
        } else {
            narracao = "Você carrega energia em segurança.";
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    } else if (!ehCarregarA && ehCarregarB) {
        kiB += 30;
        if (escolhaA.familia === "Defesa") {
            kiA += 15;
            narracao = sortearFrase([
                "Oponente carrega Ki enquanto você se defende!",
                "Ele estala os dedos e puxa energia. Você só observa.",
                "O oponente ganha energia de graça. Cuidado!"
            ]);
        } else if (escolhaA.dano > 0) {
            danoB = escolhaA.dano;
            kiB += 10;
            narracao = sortearFrase([
                "Oponente foi pego carregando Ki e apanhou!",
                "Você não teve dó. Ele apanhou distraído!",
                "Concentração dele interrompida na marra! Dano cheio!"
            ]);
        } else if (escolhaA.efeito === "Esperar") {
            narracao = "Oponente carrega Ki enquanto você recua. A distância aumenta.";
            proximoEstadoA = "Distancia"; proximoEstadoB = "Distancia";
        } else {
            narracao = "O oponente concentra energia...";
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 4.5 Ação Neutra (Esperar/Recuar)
    const isEsperarA = escolhaA.efeito === "Esperar";
    const isEsperarB = escolhaB.efeito === "Esperar";

    if (isEsperarA || isEsperarB) {
        proximoEstadoA = "Distancia"; proximoEstadoB = "Distancia";
        if (isEsperarA && isEsperarB) {
            narracao = sortearFrase([
                "Ambos recuam estratégicamente. A distância aumenta!",
                "Olhar fixo. Os dois dão um passo atrás.",
                "Ninguém quer atacar. A arena fica silenciosa."
            ]);
        } else if (isEsperarA) {
            if (escolhaB.dano > 0) {
                narracao = sortearFrase([
                    `Você se esquiva do ${escolhaB.nome} e recua! A distância aumenta.`,
                    "Você evadiu por pouco e ganhou terreno.",
                    "Bate em retirada estratégica! O golpe não te pegou."
                ]);
            } else if (escolhaB.familia === "Defesa") {
                narracao = "Você recua enquanto o oponente se protege. A distância aumenta.";
            } else {
                narracao = "Você recua e ganha distância.";
            }
        } else if (isEsperarB) {
            if (escolhaA.dano > 0) {
                narracao = sortearFrase([
                    `O oponente se esquiva do seu ${escolhaA.nome} e recua! A distância aumenta.`,
                    "O oponente evadiu por pouco e ganhou terreno.",
                    "Ele bateu em retirada! Seu golpe acertou o vazio."
                ]);
            } else if (escolhaA.familia === "Defesa") {
                narracao = "O oponente recua enquanto você se protege. A distância aumenta.";
            } else {
                narracao = "O oponente recua e ganha distância.";
            }
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 5. Defesa vs Defesa - GDD 3.1
    if (escolhaA.familia === "Defesa" && escolhaB.familia === "Defesa") {
        kiA += 10; kiB += 10;
        narracao = sortearFrase([
            "Ambos se defendem. Energia converge. (+10)",
            "Dupla guarda! O ar estagna enquanto se observam. (+10)",
            "Posturas defensivas. Uma batalha de paciência e leitura. (+10)",
            "Guardas firmes! A tensão aumenta na arena. (+10)",
            "Nenhum movimento ofensivo. Ki absorvido da terra. (+10)"
        ]);
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 6. Ataque vs Defesa - GDD 3.1
    const isAtaqueA = (escolhaA.familia === "Fisico" || escolhaA.familia === "Ki");
    const isDefesaB = (escolhaB.familia === "Defesa");

    if (isAtaqueA && isDefesaB) {
        kiB += 15;
        if (escolhaB.subTipo === escolhaA.subTipo) {
            danoB = 0;
            proximoEstadoB = "Ofensiva"; proximoEstadoA = "Cambaleando";
            narracao = sortearFrase([
                `GUARD IMPACT! Oponente defendeu com a guarda exata! Seu ${escolhaA.nome} foi rebatido. Ele assume a Ofensiva!`,
                "DEFESA PERFFEITA! O oponente para seu ataque com um dedo e rebate!",
                "O oponente anula seu golpe e te empurra para trás! A pressão inverteu!"
            ]);
        } else if (venceSubTipo[escolhaB.subTipo] === escolhaA.subTipo) {
            danoB = 0;
            narracao = sortearFrase([
                `Defesa perfeita do oponente! Seu ${escolhaA.nome} foi anulado sem causar dano.`,
                "O oponente bloqueou seu ataque com maestria!",
                "Guarda rígida. Seu golpe não causou arranhão."
            ]);
        } else {
            danoB = Math.floor(escolhaA.dano * 0.5);
            kiB += 10;
            narracao = sortearFrase([
                `Guarda incorreta do oponente! Seu ${escolhaA.nome} causa 50% de dano.`,
                "A defesa dele falhou, mas diminuiu o impacto.",
                "O oponente se protegeu errado. Dano meio cheio!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    const isAtaqueB = (escolhaB.familia === "Fisico" || escolhaB.familia === "Ki");
    const isDefesaA = (escolhaA.familia === "Defesa");

    if (isAtaqueB && isDefesaA) {
        kiA += 15;
        if (escolhaA.subTipo === escolhaB.subTipo) {
            danoA = 0;
            proximoEstadoA = "Ofensiva"; proximoEstadoB = "Cambaleando";
            narracao = sortearFrase([
                `GUARD IMPACT! Você defendeu com a guarda exata! O ${escolhaB.nome} do oponente foi rebatido. Você assume a Ofensiva!`,
                "DEFESA PERFFEITA! Você para o ataque com um dedo e rebate!",
                "Você anula o golpe dele e o empurra para trás! A pressão inverteu!"
            ]);
        } else if (venceSubTipo[escolhaA.subTipo] === escolhaB.subTipo) {
            danoA = 0;
            narracao = sortearFrase([
                `Defesa perfeita! O ${escolhaB.nome} do oponente foi anulado.`,
                "Você bloqueou o ataque com maestria!",
                "Sua guarda foi rígida. O golpe dele não causou arranhão."
            ]);
        } else {
            danoA = Math.floor(escolhaB.dano * 0.5);
            kiA += 10;
            narracao = sortearFrase([
                `Sua guarda incorreta! O ${escolhaB.nome} do oponente causa 50% de dano.`,
                "Sua defesa falhou, mas diminuiu o impacto.",
                "Você se protegeu errado. Dano meio cheio!"
            ]);
        }
        return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
    }

    // 7. Ataque vs Ataque (Famílias e Sub-tipos)
    if (escolhaA.familia !== escolhaB.familia) {
        if (venceFamilia[escolhaA.familia] === escolhaB.familia) {
            danoB = escolhaA.dano;
            kiB += 10;
            narracao = sortearFrase([
                "Sua técnica destrói a defesa inimiga! Acerto crítico!",
                "O oponente não esperava por isso. Dano completo!",
                "A vantagem é sua! O golpe causa estragos enormes."
            ]);
        } else if (venceFamilia[escolhaB.familia] === escolhaA.familia) {
            danoA = escolhaB.dano;
            kiA += 10;
            narracao = sortearFrase([
                "A defesa não aguenta! O oponente te acerta em cheio!",
                "A vantagem é dele! Você sofre o impacto máximo.",
                "Você tenta se proteger, mas o ataque do oponente te perfura!"
            ]);
        }
    } else {
        if (escolhaA.subTipo === escolhaB.subTipo) {
            danoA = Math.floor(escolhaB.dano * 0.3);
            danoB = Math.floor(escolhaA.dano * 0.3);
            kiA += 10; kiB += 10;
            narracao = sortearFrase([
                `CLASH! Ambos colidiram com ${escolhaA.nome}!`,
                `IMPACTO DUPLO! ${escolhaA.nome} e ${escolhaB.nome} se chocam pesado!`,
                `COLISÃO! Forças iguais se anulum no ar!`,
                `REPIQUE! Ambos acertaram seus golpes ao mesmo tempo!`,
                `CHOQUE DE PODER! O ar explode com o impacto duplo!`
            ]);
        } else if (venceSubTipo[escolhaA.subTipo] === escolhaB.subTipo) {
            danoB = escolhaA.dano;
            kiB += 10;
            narracao = sortearFrase([
                "Seu ataque é implacável! O golpe arrebenta a guarda do oponente!",
                "Com força superior, seu golpe o atinge de cheio!",
                "O oponente não conseguiu resistir à sua técnica!"
            ]);
        } else {
            danoA = escolhaB.dano;
            kiA += 10;
            narracao = sortearFrase([
                "O oponente te acerta com um golpe brutal! Você sente o impacto total!",
                "A técnica dele é mais forte. Você é arremessado para trás!",
                "Sem chances de defesa, você toma o golpe com toda a força!"
            ]);
        }
    }

    return { danoA, danoB, kiA, kiB, narracao, cancelarA, cancelarB, proximoEstadoA, proximoEstadoB, clashDetectado };
}

// Função para resolver o leilão de Ki do Clash (GDD 10.4)
export function resolverClash(danoBase, injectA, injectB) {
    let danoA = 0, danoB = 0;
    let kiA = 0, kiB = 0; 
    let narracao = "";
    let proximoEstadoA = "Neutro", proximoEstadoB = "Neutro";

    if (injectA > injectB) {
        danoB = Math.floor(danoBase * 1.3);
        narracao = sortearFrase([
            `Você injetou ${injectA} contra ${injectB}! SEU KAMEHAMEHA ENGOLIU O DELE! Dano massivo!`,
            "Sua vontade foi mais forte! O feixe azul aniquila o oponente!",
            "Você empurra a energia dele de volta! EXPLOSÃO TOTAL!"
        ]);
    } else if (injectB > injectA) {
        danoA = Math.floor(danoBase * 1.3);
        narracao = sortearFrase([
            `Oponente injetou ${injectB} contra ${injectA}! O KAMEHAMEHA DELE TE ENGOLIU! Você foi devastado!`,
            "A vontade dele foi mais forte! O feixe azul te engole!",
            "Ele empurra sua energia de volta! Você é devastado!"
        ]);
    } else {
        danoA = Math.floor(danoBase * 0.5);
        danoB = Math.floor(danoBase * 0.5);
        proximoEstadoA = "Distancia";
        proximoEstadoB = "Distancia";
        narracao = sortearFrase([
            "EMPATE! Uma EXPLOSÃO COLOSAL ocorre! O impacto arremessa ambos para longe! Volta à Distância!",
            "Forças iguais! A arena treme e a onda de choque joga ambos para lados opostos!",
            "Ninguém cedeu! A explosão ressoa e voces se afastam em meio a fumaça!"
        ]);
    }

    return { danoA, danoB, kiA, kiB, narracao, proximoEstadoA, proximoEstadoB };
}
// js/data.js
// Fonte única de verdade para personagens, movimentos e regras (Baseado no GDD v1.0)

const movimentosPadrao = [
    { id: "seq_socos", nome: "Sequência de socos", familia: "Fisico", subTipo: "Verde", categoria: "Leve", dano: 8, ki: 0, efeito: null },
    { id: "chute_giratorio", nome: "Chute giratório", familia: "Fisico", subTipo: "Vermelho", categoria: "Media", dano: 12, ki: 0, efeito: null },
    { id: "golpe_cabeca", nome: "Golpe na cabeça", familia: "Fisico", subTipo: "Azul", categoria: "Media", dano: 12, ki: 0, efeito: "Atordoamento" },
    { id: "martelo", nome: "Martelo descendente", familia: "Fisico", subTipo: "Azul", categoria: "Forte", dano: 15, ki: 5, efeito: "LancaParede" },
    { id: "chute_ascendente", nome: "Chute ascendente", familia: "Fisico", subTipo: "Vermelho", categoria: "Forte", dano: 15, ki: 5, efeito: "LancaCeu" },
    { id: "rajada_ki", nome: "Rajada de Ki blast", familia: "Ki", subTipo: "Verde", categoria: "Leve", dano: 8, ki: 5, efeito: null },
    { id: "onda_ampla", nome: "Onda ampla", familia: "Ki", subTipo: "Vermelho", categoria: "Media", dano: 12, ki: 10, efeito: null },
    { id: "kamehameha", nome: "Kamehameha", familia: "Ki", subTipo: "Azul", categoria: "Especial", dano: 35, ki: 50, efeito: "Especial2Turnos" },
    { id: "guarda_alta", nome: "Guarda alta", familia: "Defesa", subTipo: "Azul", categoria: "Nula", dano: 0, ki: 0, efeito: null },
    { id: "bloqueio_pernas", nome: "Bloqueio de pernas", familia: "Defesa", subTipo: "Vermelho", categoria: "Nula", dano: 0, ki: 0, efeito: null },
    { id: "postura_fechada", nome: "Postura fechada", familia: "Defesa", subTipo: "Verde", categoria: "Nula", dano: 0, ki: 0, efeito: null },
    { id: "genki_dama", nome: "Genki Dama", familia: "Ki", subTipo: "Verde", categoria: "Ultimate", dano: 40, ki: 0, efeito: "PrepararGenki" },
    { id: "carregar_ki", nome: "Carregar Ki", familia: "Neutro", subTipo: "Verde", categoria: "Nula", dano: 0, ki: 0, efeito: "Carregar" },
    { id: "reversal", nome: "Reversal de desespero", familia: "Fisico", subTipo: "Vermelho", categoria: "Media", dano: 15, ki: 35, efeito: "Reversal" },
    { id: "esperar", nome: "Esperar/Recuar", familia: "Neutro", subTipo: "Neutro", categoria: "Nula", dano: 0, ki: 0, efeito: "Esperar" },
    { id: "teleporte_golpe", nome: "Teleporte + golpe", familia: "Fisico", subTipo: "Azul", categoria: "Media", dano: 10, ki: 25, efeito: "Teleporte" },
    { id: "deixar_recuperar", nome: "Deixar recuperar", familia: "Neutro", subTipo: "Neutro", categoria: "Nula", dano: 0, ki: 0, efeito: "DeixarRecuperar" },
    { id: "forcar_estab", nome: "Forçar estabilidade", familia: "Defesa", subTipo: "Verde", categoria: "Nula", dano: 0, ki: 0, efeito: "Estabilidade" },
    { id: "contra_furioso", nome: "Contra-furioso", familia: "Fisico", subTipo: "Vermelho", categoria: "Forte", dano: 20, ki: 40, efeito: "ContraFurioso" },
    { id: "fugir", nome: "Fugir", familia: "Defesa", subTipo: "Azul", categoria: "Nula", dano: 0, ki: 0, efeito: "Fugir" },
    { id: "explosao_aura", nome: "Explosão de aura", familia: "Ki", subTipo: "Vermelho", categoria: "Forte", dano: 8, ki: 40, efeito: "Aura" },
    { id: "zanzoken", nome: "Zanzoken", familia: "Defesa", subTipo: "Azul", categoria: "Nula", dano: 0, ki: 20, efeito: "Zanzoken" },
    { id: "sacudir_cabeca", nome: "Sacudir a cabeça", familia: "Neutro", subTipo: "Neutro", categoria: "Nula", dano: 0, ki: 0, efeito: "Sacudir" },
    { id: "aguentar_firme", nome: "Aguentar firme", familia: "Defesa", subTipo: "Neutro", categoria: "Nula", dano: 0, ki: 0, efeito: "Aguentar" },
    { id: "aproximar", nome: "Aproximar", familia: "Neutro", subTipo: "Verde", categoria: "Nula", dano: 0, ki: 0, efeito: "Aproximar" },
    { id: "aproximar_vel", nome: "Aproximar em velocidade", familia: "Neutro", subTipo: "Vermelho", categoria: "Nula", dano: 0, ki: 10, efeito: "AproximarVel" },
    { id: "super_kamehameha", nome: "Super Kamehameha", familia: "Ki", subTipo: "Azul", categoria: "Especial", dano: 45, ki: 60, efeito: "Especial2Turnos" },
    { id: "subir_ceus", nome: "Subir aos Céus", familia: "Neutro", subTipo: "Verde", categoria: "Nula", dano: 0, ki: 5, efeito: "SubirCeus" },
    { id: "descer_ceus", nome: "Descer ao Solo", familia: "Neutro", subTipo: "Verde", categoria: "Nula", dano: 0, ki: 0, efeito: "DescerCeus" },
    { id: "agarrao", nome: "Agarrão Brutal", familia: "Fisico", subTipo: "Verde", categoria: "Media", dano: 12, ki: 5, efeito: "Agarrao" },
    { id: "leitura_golpe", nome: "Leitura de Golpe", familia: "Neutro", subTipo: "Neutro", categoria: "Media", dano: 15, ki: 5, efeito: "LeituraGolpe" }
];

export const PERSONAGENS = {
    goku: {
        id: "goku",
        nome: "Goku",
        passiva: "Zenkai: +20% de dano com HP < 30%",
        movimentos: movimentosPadrao
    },
    vegeta: {
        id: "vegeta",
        nome: "Vegeta",
        passiva: "Orgulho: ganha o dobro de Ki ao apanhar",
        movimentos: movimentosPadrao
    },
    piccolo: {
        id: "piccolo",
        nome: "Piccolo",
        passiva: "Regeneração: +3 HP por rodada vencida",
        movimentos: movimentosPadrao
    },
    freeza: {
        id: "freeza",
        nome: "Freeza",
        passiva: "Sobrevivência: aguenta 1 golpe fatal com 1 HP (1x por partida)",
        movimentos: movimentosPadrao
    }
};
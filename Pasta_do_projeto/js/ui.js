// js/ui.js
// Manipulação de telas, GIFs e narração

// Função para alternar entre telas
export function mostrarTela(idTela) {
    const telas = document.querySelectorAll('.tela');
    telas.forEach(tela => tela.classList.remove('ativa'));
    document.getElementById(idTela).classList.add('ativa');
}

// Função para desenhar a lista de personagens
export function renderizarPersonagens(personagens) {
    const container = document.getElementById('lista-personagens');
    container.innerHTML = ''; // Limpa a lista

    Object.values(personagens).forEach(personagem => {
        const card = document.createElement('div');
        card.className = 'card-personagem';
        
        card.innerHTML = `
            <h3>${personagem.nome}</h3>
            <p><em>${personagem.passiva}</em></p>
            <button class="btn-escolher" data-id="${personagem.id}">Escolher</button>
        `;
        container.appendChild(card);
    });
}
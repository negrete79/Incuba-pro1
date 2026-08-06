// ==========================================
// 1. REGISTRO DO SERVICE WORKER (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('✅ PWA Pronta!'))
            .catch((err) => console.warn('SW Falhou:', err));
    });
}

// ==========================================
// 2. SONS DO CHAT (Estilo ChatGPT)
// ==========================================
let audioCtx;
function getAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playSound(type) {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscillator.type = 'sine';
        
        if (type === 'send') {
            oscillator.frequency.setValueAtTime(800, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.1);
        } else if (type === 'receive') {
            oscillator.frequency.setValueAtTime(600, ctx.currentTime);
            oscillator.frequency.setValueAtTime(900, ctx.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.2);
        }
    } catch (e) {}
}

// ==========================================
// 3. DADOS E ESTADO DO APP
// ==========================================
const defaultSpecies = [
    { id: 1, nome: 'Galinha', dias: 21, temp: 37.5, umid: 60 },
    { id: 2, nome: 'Pato', dias: 28, temp: 37.5, umid: 70 },
    { id: 3, nome: 'Codornas', dias: 17, temp: 37.8, umid: 60 },
    { id: 4, nome: 'Calopsita', dias: 18, temp: 37.3, umid: 65 },
    { id: 5, nome: 'Pavão', dias: 28, temp: 37.5, umid: 60 },
    { id: 6, nome: 'Faisão', dias: 24, temp: 37.8, umid: 65 },
    { id: 7, nome: 'Ganso', dias: 30, temp: 37.5, umid: 70 },
    { id: 8, nome: 'Cisne', dias: 35, temp: 37.2, umid: 65 }
];

const defaultSteps = [
    { text: 'Aquecer a incubadora', desc: 'Ligue 24h antes para estabilizar a temperatura.', done: false },
    { text: 'Colocar os ovos', desc: 'Posicione com a ponta mais fina para baixo.', done: false },
    { text: 'Iniciar viragens', desc: 'Vire os ovos no mínimo 3 vezes ao dia.', done: false },
    { text: 'Ovoscopia (Dia 7)', desc: 'Verifique se há embrião em desenvolvimento.', done: false },
    { text: 'Parar viragens (3 dias antes)', desc: 'Deixe os ovos em repouso para o nascimento.', done: false },
    { text: 'Eclosão', desc: 'Não abra a incubadora! Aguarde os pintinhos secarem.', done: false }
];

let species = [];
let lotes = [];
let steps = [];

try { 
    const savedSpecies = JSON.parse(localStorage.getItem('ib_species'));
    if (!Array.isArray(savedSpecies) || savedSpecies.length !== defaultSpecies.length || !savedSpecies.find(s => s.nome === 'Pavão')) {
        species = defaultSpecies; 
        localStorage.setItem('ib_species', JSON.stringify(species));
    } else {
        species = savedSpecies;
    }
} catch(e) { 
    species = defaultSpecies; 
    localStorage.setItem('ib_species', JSON.stringify(species));
}

try { lotes = JSON.parse(localStorage.getItem('ib_lotes')) || []; } catch(e) { lotes = []; }
try { steps = JSON.parse(localStorage.getItem('ib_steps')) || defaultSteps; } catch(e) { steps = defaultSteps; }

function saveData() {
    try {
        localStorage.setItem('ib_species', JSON.stringify(species));
        localStorage.setItem('ib_lotes', JSON.stringify(lotes));
        localStorage.setItem('ib_steps', JSON.stringify(steps));
    } catch(e) { console.error("Erro ao salvar:", e); }
}

// ==========================================
// 4. NAVEGAÇÃO
// ==========================================
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        const viewEl = document.getElementById(`view-${btn.dataset.view}`);
        if(viewEl) viewEl.classList.add('active');
    });
});

// ==========================================
// 5. MODAIS
// ==========================================
function openModal(id) { const m = document.getElementById(id); if(m) m.classList.add('show'); }
function closeModal(id) { const m = document.getElementById(id); if(m) m.classList.remove('show'); }

document.getElementById('btn-settings').addEventListener('click', () => openModal('modal-settings'));
document.getElementById('close-settings').addEventListener('click', () => closeModal('modal-settings'));

document.getElementById('btn-add-lote').addEventListener('click', () => {
    document.getElementById('lote-modal-title').innerText = 'Novo Lote';
    document.getElementById('edit-lote-id').value = '';
    document.getElementById('lote-nome').value = '';
    document.getElementById('lote-qtd').value = '';
    document.getElementById('lote-data').valueAsDate = new Date();
    document.getElementById('btn-save-lote').innerText = 'Criar Lote';
    populateSpeciesSelect();
    openModal('modal-lote');
});
document.getElementById('close-lote').addEventListener('click', () => closeModal('modal-lote'));

document.getElementById('btn-add-species').addEventListener('click', () => {
    document.getElementById('species-modal-title').innerText = 'Nova Espécie';
    document.getElementById('edit-species-id').value = '';
    document.getElementById('sp-nome').value = '';
    document.getElementById('sp-dias').value = '';
    document.getElementById('sp-temp').value = '';
    document.getElementById('sp-humid').value = '';
    openModal('modal-species');
});
document.getElementById('close-species').addEventListener('click', () => closeModal('modal-species'));

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) e.target.classList.remove('show');
});

// ==========================================
// 6. CRUD ESPÉCIES
// ==========================================
function renderSpeciesTable() {
    const tbody = document.getElementById('especies-tbody');
    if(!tbody) return;
    tbody.innerHTML = species.map(sp => `
        <tr>
            <td>${sp.nome}</td>
            <td>${sp.dias}d</td>
            <td>${sp.temp}°C</td>
            <td>${sp.umid}%</td>
            <td><button class="btn-sm btn-del" onclick="deleteSpecies(${sp.id})">Excluir</button></td>
        </tr>
    `).join('');
}

document.getElementById('btn-save-species').addEventListener('click', () => {
    const nome = document.getElementById('sp-nome').value.trim();
    const dias = parseInt(document.getElementById('sp-dias').value);
    const temp = parseFloat(document.getElementById('sp-temp').value);
    const umid = parseInt(document.getElementById('sp-humid').value);
    
    if (!nome || !dias || !temp) return alert('Preencha Nome, Dias e Temperatura.');
    
    species.push({ id: Date.now(), nome, dias, temp, umid });
    saveData();
    renderSpeciesTable();
    closeModal('modal-species');
});

window.deleteSpecies = function(id) {
    if (confirm('Excluir esta espécie?')) {
        species = species.filter(s => s.id !== id);
        saveData();
        renderSpeciesTable();
    }
};

// ==========================================
// 7. CRUD LOTES
// ==========================================
function populateSpeciesSelect() {
    const select = document.getElementById('lote-especie');
    if(!select) return;
    select.innerHTML = '<option value="">Selecione...</option>' + 
        species.map(sp => `<option value="${sp.id}">${sp.nome}</option>`).join('');
}

document.getElementById('btn-save-lote').addEventListener('click', () => {
    const editId = document.getElementById('edit-lote-id').value;
    const nome = document.getElementById('lote-nome').value.trim();
    const especieId = document.getElementById('lote-especie').value;
    const qtd = parseInt(document.getElementById('lote-qtd').value) || 0;
    const data = document.getElementById('lote-data').value;
    
    if (!nome || !especieId || !data) return alert('Preencha Nome, Espécie e Data.');

    if (editId) {
        const lote = lotes.find(l => l.id == editId);
        if (lote) {
            lote.nome = nome;
            lote.especieId = parseInt(especieId);
            lote.qtd = qtd;
            lote.dataInicio = data;
        }
    } else {
        lotes.forEach(l => l.ativo = false);
        lotes.push({ id: Date.now(), nome, especieId: parseInt(especieId), qtd, dataInicio: data, ativo: true });
    }
    
    saveData();
    renderLotes();
    updateDashboard();
    closeModal('modal-lote');
});

function renderLotes() {
    const list = document.getElementById('lotes-list');
    if(!list) return;
    
    if (lotes.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-dim); padding:40px 0;">Nenhum lote cadastrado.</p>';
        return;
    }
    
    list.innerHTML = lotes.map(l => {
        const sp = species.find(s => s.id === l.especieId);
        const dataFormatada = new Date(l.dataInicio+'T00:00:00').toLocaleDateString('pt-BR');
        const statusClass = l.ativo ? 'status-active' : 'status-inactive';
        const statusText = l.ativo ? 'Ativo' : 'Inativo';
        
        return `
        <div class="card-item">
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="margin: 0;">${l.nome}</h4>
                    <button class="btn-status ${statusClass}" onclick="toggleLoteStatus(${l.id})">${statusText}</button>
                </div>
                <div class="lote-details-grid">
                    <span><strong>Espécie:</strong> ${sp ? sp.nome : 'Removida'}</span>
                    <span><strong>Ovos:</strong> ${l.qtd} unid.</span>
                    <span><strong>Início:</strong> ${dataFormatada}</span>
                </div>
            </div>
            <div class="lote-actions">
                <button class="btn-sm btn-edit" onclick="editLote(${l.id})">Editar</button>
                <button class="btn-sm btn-del" onclick="deleteLote(${l.id})">Excluir</button>
            </div>
        </div>`;
    }).join('');
}

window.toggleLoteStatus = function(id) {
    const lote = lotes.find(l => l.id === id);
    if (lote) {
        if (lote.ativo) { lote.ativo = false; } 
        else { lotes.forEach(l => l.ativo = false); lote.ativo = true; }
        saveData(); renderLotes(); updateDashboard();
    }
};

window.editLote = function(id) {
    const lote = lotes.find(l => l.id === id);
    if (!lote) return;
    document.getElementById('lote-modal-title').innerText = 'Editar Lote';
    document.getElementById('edit-lote-id').value = lote.id;
    document.getElementById('lote-nome').value = lote.nome;
    document.getElementById('lote-qtd').value = lote.qtd;
    document.getElementById('lote-data').value = lote.dataInicio;
    document.getElementById('btn-save-lote').innerText = 'Salvar Alterações';
    populateSpeciesSelect();
    document.getElementById('lote-especie').value = lote.especieId;
    openModal('modal-lote');
};

window.deleteLote = function(id) {
    if (confirm('Excluir este lote permanentemente?')) {
        lotes = lotes.filter(l => l.id !== id);
        saveData(); renderLotes(); updateDashboard();
    }
};

// ==========================================
// 8. DASHBOARD
// ==========================================
function updateDashboard() {
    const ativo = lotes.find(l => l.ativo);
    if (!ativo) {
        document.getElementById('dash-lote-name').innerText = 'Nenhum lote ativo';
        document.getElementById('dash-species').innerText = '---';
        document.getElementById('dash-temp').innerText = '--';
        document.getElementById('dash-humid').innerText = '--%';
        document.getElementById('dash-days-left').innerText = '-- dias';
        document.getElementById('dash-progress-bar').style.width = '0%';
        return;
    }

    const sp = species.find(s => s.id === ativo.especieId);
    document.getElementById('dash-lote-name').innerText = ativo.nome;
    document.getElementById('dash-species').innerText = sp ? sp.nome : '---';
    document.getElementById('dash-temp').innerText = sp ? sp.temp : '--';
    document.getElementById('dash-humid').innerText = sp ? sp.umid + '%' : '--%';

    const inicio = new Date(ativo.dataInicio + 'T00:00:00');
    const diasTotal = sp ? sp.dias : 21;
    const diaAtual = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasFaltantes = Math.max(0, diasTotal - diaAtual);
    
    document.getElementById('dash-days-left').innerText = diasFaltantes + ' dias';
    document.getElementById('dash-progress-bar').style.width = Math.min(100, (diaAtual / diasTotal) * 100) + '%';
}

// ==========================================
// 9. CHECKLIST
// ==========================================
function renderTimeline() {
    const ul = document.getElementById('timeline-steps');
    if(!ul) return;
    ul.innerHTML = steps.map((s, i) => `
        <li class="${s.done ? 'done' : ''}" onclick="toggleStep(${i})">
            <strong>${s.text}</strong>
            <p class="step-desc">${s.desc}</p>
        </li>
    `).join('');
}

window.toggleStep = function(i) {
    if(steps[i]) { steps[i].done = !steps[i].done; saveData(); renderTimeline(); }
};

// ==========================================
// 10. CHAT IA (COM LEITURA DO CONTEXTO DO APP)
// ==========================================
const chatContainer = document.getElementById('chat-messages');

document.querySelectorAll('.trigger-btn').forEach(btn => {
    btn.addEventListener('click', () => handleChat(btn.dataset.msg));
});

document.getElementById('btn-send-chat').addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    if (input.value.trim()) handleChat(input.value);
    input.value = '';
});

document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const input = document.getElementById('chat-input');
        if (input.value.trim()) handleChat(input.value);
        input.value = '';
    }
});

function addMessage(text, type) {
    if(!chatContainer) return;
    const div = document.createElement('div');
    div.className = `chat-msg ${type}`;
    div.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// NOVA FUNÇÃO: Coleta o contexto atual do app para mandar pra IA
function getAppContext() {
    const ativo = lotes.find(l => l.ativo);
    if (!ativo) {
        return "O usuário não possui nenhum lote de incubação ativo no momento.";
    }

    const sp = species.find(s => s.id === ativo.especieId);
    const inicio = new Date(ativo.dataInicio + 'T00:00:00');
    const diasTotal = sp ? sp.dias : 0;
    const diaAtual = Math.floor((Date.now() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const diasFaltantes = Math.max(0, diasTotal - diaAtual);

    let contexto = `CONTEXTO ATUAL DO APP DO USUÁRIO:\n`;
    contexto += `- Lote Ativo: "${ativo.nome}"\n`;
    contexto += `- Espécie: ${sp ? sp.nome : 'Não identificada'}\n`;
    contexto += `- Total de Ovos: ${ativo.qtd}\n`;
    contexto += `- Data de Início: ${new Date(inicio).toLocaleDateString('pt-BR')}\n`;
    contexto += `- Dia atual de incubação: ${diaAtual}\n`;
    contexto += `- Dias totais da espécie: ${diasTotal}\n`;
    contexto += `- Dias restantes para eclosão: ${diasFaltantes}\n`;
    
    if (sp) {
        contexto += `- Temperatura alvo configurada: ${sp.temp}°C\n`;
        contexto += `- Umidade alvo configurada: ${sp.umid}%\n`;
    }

    // Verifica se está perto dos últimos 3 dias
    if (diasFaltantes <= 3 && diasFaltantes > 0) {
        contexto += `\n!!! ATENÇÃO: O lote está nos últimos 3 dias antes da eclosão. A viragem já deve ter sido parada.`;
    } else if (diasFaltantes === 0) {
        contexto += `\n!!! ATENÇÃO: É o dia da eclosão! A incubadora não deve ser aberta.`;
    }

    return contexto;
}

async function handleChat(msg) {
    playSound('send');
    addMessage(msg, 'user');
    
    const apiKey = localStorage.getItem('ib_groq_key');
    
    if (!apiKey) {
        setTimeout(() => {
            playSound('receive');
            addMessage("Para obter respostas inteligentes, configure sua chave API do Groq no ícone ⚙️.", 'bot');
        }, 500);
        return;
    }

    try {
        // Pega o contexto real do aplicativo
        const contextData = getAppContext();

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${apiKey}` 
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { 
                        role: 'system', 
                        content: `Você é um especialista mundial em incubação de ovos de aves. Responda de forma clara, objetiva e amigável em português do Brasil. 
                        
                        IMPORTANTE: Leia atentamente o contexto do aplicativo fornecido abaixo. Use essas informações para responder às perguntas do usuário de forma personalizada (ex: se ele perguntar sobre o lote, use os nomes, quantidades e dias exatos que estão no contexto). 
                        
                        Se o contexto disser que não há lote ativo, responda informando isso.
                        
                        CONTEXTO DO APP:
                        ${contextData}`
                    },
                    { role: 'user', content: msg }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        
        if (data.error) {
            playSound('receive');
            addMessage(`Erro da API: ${data.error.message}`, 'bot');
        } else if (data.choices && data.choices[0]) {
            playSound('receive');
            addMessage(data.choices[0].message.content, 'bot');
        } else {
            playSound('receive');
            addMessage('A IA não retornou resposta. Tente novamente.', 'bot');
        }
    } catch (error) {
        playSound('receive');
        addMessage('Erro de conexão com a IA. Verifique sua internet.', 'bot');
    }
}

// ==========================================
// 11. CONFIGURAÇÕES (API KEY)
// ==========================================
function checkApiKey() {
    const key = localStorage.getItem('ib_groq_key');
    if (key) {
        document.getElementById('api-key-view').style.display = 'none';
        document.getElementById('api-key-active-view').style.display = 'block';
        document.getElementById('btn-remove-api').style.display = 'block';
    } else {
        document.getElementById('api-key-view').style.display = 'block';
        document.getElementById('api-key-active-view').style.display = 'none';
        document.getElementById('btn-remove-api').style.display = 'none';
    }
}

document.getElementById('btn-save-api').addEventListener('click', () => {
    const key = document.getElementById('input-api-key').value.trim();
    if (key.startsWith('gsk_')) {
        localStorage.setItem('ib_groq_key', key);
        checkApiKey();
    } else {
        alert('Chave inválida. Deve começar com gsk_');
    }
});

document.getElementById('btn-remove-api').addEventListener('click', () => {
    localStorage.removeItem('ib_groq_key');
    document.getElementById('input-api-key').value = '';
    checkApiKey();
});

// ==========================================
// 12. INICIALIZAÇÃO
// ==========================================
function init() {
    renderSpeciesTable();
    renderLotes();
    updateDashboard();
    renderTimeline();
    checkApiKey();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

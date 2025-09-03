// --- CONFIGURAÇÃO ---
// Substitua pelos seus dados do Airtable
const AIRTABLE_API_KEY = 'patjsRIdUyTjexuyU.0491c701b73b6bcbf18ec61f4b8c996d450ce7cfb4aafe90787e4fb21cb43823'; // Começa com "key..."
const AIRTABLE_BASE_ID = 'appcn9tV1jZeAh68Y'; // Começa com "app..."
const AIRTABLE_TABLE_NAME = 'Despesas'; // O nome da sua tabela

// --- LÓGICA DO APLICATIVO ---
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const nomePessoa = params.get('pessoa');

    if (!nomePessoa) {
        document.getElementById('despesas-lista').innerHTML = '<h2>Erro: Nome da pessoa não especificado na URL.</h2><p>Exemplo de uso: ?pessoa=Joao</p>';
        document.getElementById('loading').style.display = 'none';
        return;
    }

    document.getElementById('nome-pessoa').textContent = nomePessoa;
    fetchDespesas(nomePessoa);
});

async function fetchDespesas(pessoa) {
    // Monta a URL da API do Airtable, filtrando pela pessoa
    // A fórmula do filtro é poderosa! Veja a documentação da API do Airtable.
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={Pessoa}='${pessoa}'`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao buscar dados do Airtable.');
        }

        const data = await response.json();
        renderDespesas(data.records);

    } catch (error) {
        console.error(error);
        document.getElementById('despesas-lista').innerHTML = '<h2>Ocorreu um erro ao carregar suas despesas.</h2>';
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function renderDespesas(despesas) {
    const listaEl = document.getElementById('despesas-lista');
    const totalEl = document.getElementById('valor-total');
    let total = 0;

    if (despesas.length === 0) {
        listaEl.innerHTML = '<p>Nenhuma despesa encontrada para você. Parabéns!</p>';
        return;
    }

    despesas.forEach(record => {
        const despesa = record.fields;
        total += despesa.Valor || 0;

        // --- MÁGICA DA CORREÇÃO DA DATA ---
        // Pega a string de data (ex: "2025-09-11T00:00:00.000Z")
        const dataStringISO = despesa.Data; 
        // Pega apenas a parte da data (ex: "2025-09-11")
        const parteData = dataStringISO.split('T')[0];
        // Separa em ano, mês e dia (ex: ["2025", "09", "11"])
        const [ano, mes, dia] = parteData.split('-');
        // Monta a data no formato brasileiro (ex: "11/09/2025")
        const dataFormatada = `${dia}/${mes}/${ano}`;
        // --- FIM DA MÁGICA ---

        const itemEl = document.createElement('div');
        itemEl.classList.add('item');
        itemEl.innerHTML = `
            <span>${dataFormatada}</span>
            <span>${despesa.Descricao}</span>
            <span class="valor">${despesa.Valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        `;
        listaEl.appendChild(itemEl);
    });

    totalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

}



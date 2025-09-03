// --- CONFIGURAÇÃO ---
// Substitua pelos seus dados do Airtable
const AIRTABLE_API_KEY = 'patjsRIdUyTjexuyU.0491c701b73b6bcbf18ec61f4b8c996d450ce7cfb4aafe90787e4fb21cb43823'; // Lembre-se de colocar sua chave aqui
const AIRTABLE_BASE_ID = 'appcn9tV1jZeAh68Y'; // E seu Base ID aqui
const AIRTABLE_TABLE_NAME = 'Despesas'; // O nome da sua tabela

// --- LÓGICA DO APLICATIVO ---
window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const nomePessoa = params.get('pessoa');

    if (!nomePessoa) {
        document.getElementById('despesas-lista').innerHTML = '<h2>Erro: Nome da pessoa não especificado na URL.</h2><p>Exemplo de uso: ?pessoa=Francisco</p>';
        document.getElementById('loading').style.display = 'none';
        document.getElementById('nome-pessoa').textContent = 'Visitante';
        return;
    }

    document.getElementById('nome-pessoa').textContent = nomePessoa;
    fetchDespesas(nomePessoa);
});

async function fetchDespesas(pessoa) {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={Pessoa}='${pessoa}'`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`
            }
        });

        if (!response.ok) {
            throw new Error('Falha ao buscar dados do Airtable. Verifique suas credenciais.');
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

// Substitua sua função antiga por esta versão completa
function renderDespesas(despesas) {
    const listaEl = document.getElementById('despesas-lista');
    const totalEl = document.getElementById('valor-total');
    let total = 0;

    // Limpa a lista antes de adicionar novos itens
    listaEl.innerHTML = ''; 

    if (despesas.length === 0) {
        listaEl.innerHTML = '<p>Nenhuma despesa encontrada para você. Parabéns!</p>';
        totalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        return;
    }

    despesas.forEach(record => {
        const despesa = record.fields;

        // --- LÓGICA DO PAGAMENTO ---
        // Só adiciona ao total se a despesa NÃO estiver marcada como paga
        if (!despesa.Pago) {
            total += despesa.Valor || 0;
        }

        // Formatação da data que já corrigimos
        const dataStringISO = despesa.Data; 
        const parteData = dataStringISO.split('T')[0];
        const [ano, mes, dia] = parteData.split('-');
        const dataFormatada = `${dia}/${mes}/${ano}`;

        const itemEl = document.createElement('div');
        itemEl.classList.add('item');

        // --- LÓGICA VISUAL DO PAGAMENTO ---
        // Se a despesa estiver paga, adiciona uma classe 'pago' ao item
        if (despesa.Pago) {
            itemEl.classList.add('pago');
        }

        itemEl.innerHTML = `
            <span>${dataFormatada}</span>
            <span>${despesa.Descricao}</span>
            <span class="valor">${despesa.Valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        `;
        listaEl.appendChild(itemEl);
    });

    totalEl.textContent = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

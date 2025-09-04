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
    // Ordena os registros pela data da compra para garantir a ordem cronológica
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?filterByFormula={Pessoa}='${pessoa}'&sort%5B0%5D%5Bfield%5D=Data&sort%5B0%5D%5Bdirection%5D=asc`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
        });

        if (!response.ok) {
            throw new Error('Falha ao buscar dados do Airtable.');
        }

        const data = await response.json();
        const todasAsParcelas = gerarParcelas(data.records);
        renderMeses(todasAsParcelas);

    } catch (error) {
        console.error(error);
        document.getElementById('despesas-lista').innerHTML = '<h2>Ocorreu um erro ao carregar suas despesas.</h2>';
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Substitua sua função gerarParcelas antiga por esta versão corrigida
function gerarParcelas(compras) {
    const parcelasGeradas = [];

    compras.forEach(record => {
        const compra = record.fields;
        const numParcelas = compra.NumParcelas || 1;
        const parcelasPagas = compra.ParcelasPagas || 0;

        for (let i = 1; i <= numParcelas; i++) {
            const dataCompra = new Date(compra.Data);
            const dataVencimento = new Date(new Date(dataCompra).setMonth(dataCompra.getMonth() + (i - 1)));

            // --- LÓGICA DE FATURA CORRIGIDA ---
            let dataDaFatura = new Date(dataVencimento);
            // Se o dia do vencimento da parcela for APÓS o dia 7,
            // ela pertence à fatura do MÊS SEGUINTE.
            if (dataVencimento.getDate() > 7) {
                dataDaFatura.setMonth(dataDaFatura.getMonth() + 1);
            }

            parcelasGeradas.push({
                descricao: `${compra.Descricao} (${i}/${numParcelas})`,
                valor: compra.ValorParcela || 0,
                dataVencimento: dataVencimento,
                fatura: dataDaFatura, // Usamos a data da fatura corrigida
                paga: i <= parcelasPagas
            });
        }
    });

    return parcelasGeradas;
}


// Substitua sua função renderMeses por esta versão final
function renderMeses(parcelas) {
    const listaEl = document.getElementById('despesas-lista');
    const totalEl = document.getElementById('valor-total');
    let totalGeralPendente = 0;
    
    listaEl.innerHTML = '';

    // AGORA AGRUPAMOS PELA NOVA DATA DA FATURA
    const faturasAgrupadas = parcelas.reduce((acc, parcela) => {
        // A chave do grupo agora é o mês/ano da fatura
        const faturaKey = parcela.fatura.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (!acc[faturaKey]) {
            acc[faturaKey] = [];
        }
        acc[faturaKey].push(parcela);
        return acc;
    }, {});

    // Ordena as faturas da mais recente para a mais antiga
    const faturasOrdenadas = Object.keys(faturasAgrupadas).sort((a, b) => {
        const dataA = new Date(`01 ${a.replace(' de ', ' ')}`);
        const dataB = new Date(`01 ${b.replace(' de ', ' ')}`);
        return dataB - dataA;
    });

    const mesFaturaAtual = new Date();
    if(new Date().getDate() <= 7) mesFaturaAtual.setMonth(mesFaturaAtual.getMonth() - 1);
    const faturaAtualKey = mesFaturaAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    faturasOrdenadas.forEach(faturaKey => {
        const parcelasDaFatura = faturasAgrupadas[faturaKey];
        let totalFaturaPendente = 0;
        
        const faturaContainer = document.createElement('details');
        faturaContainer.classList.add('mes-container');
        if (faturaKey === faturaAtualKey) {
            faturaContainer.open = true;
        }
        
        const faturaTitulo = document.createElement('summary');
        faturaTitulo.textContent = `Fatura de ${faturaKey.charAt(0).toUpperCase() + faturaKey.slice(1)}`;
        faturaContainer.appendChild(faturaTitulo);

        const itensContainer = document.createElement('div');
        itensContainer.classList.add('itens-container');

        // Ordena as parcelas dentro da fatura por data de vencimento
        parcelasDaFatura.sort((a, b) => a.dataVencimento - b.dataVencimento);

        parcelasDaFatura.forEach(parcela => {
            if (!parcela.paga) {
                totalFaturaPendente += parcela.valor;
            }
            const itemEl = document.createElement('div');
            itemEl.classList.add('item');
            if (parcela.paga) itemEl.classList.add('pago');
            itemEl.innerHTML = `
                <span>${parcela.dataVencimento.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                <span class="descricao-item">${parcela.descricao}</span>
                <span class="valor">${parcela.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            `;
            itensContainer.appendChild(itemEl);
        });

        const faturaSumario = document.createElement('div');
        faturaSumario.classList.add('mes-sumario');
        faturaSumario.innerHTML = `Total pendente da fatura: <strong>${totalFaturaPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>`;
        
        itensContainer.appendChild(faturaSumario);
        faturaContainer.appendChild(itensContainer);
        
        listaEl.appendChild(faturaContainer);
        totalGeralPendente += totalFaturaPendente;
    });

    totalEl.textContent = totalGeralPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


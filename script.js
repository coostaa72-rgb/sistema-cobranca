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

function gerarParcelas(compras) {
    const parcelasGeradas = [];

    compras.forEach(record => {
        const compra = record.fields;
        const numParcelas = compra.NumParcelas || 1;
        const parcelasPagas = compra.ParcelasPagas || 0;

        for (let i = 1; i <= numParcelas; i++) {
            const dataCompra = new Date(compra.Data);
            // Adiciona (i-1) meses à data da compra para obter a data de vencimento da parcela
            const dataVencimento = new Date(dataCompra.setMonth(dataCompra.getMonth() + (i - 1)));

            parcelasGeradas.push({
                descricao: `${compra.Descricao} (${i}/${numParcelas})`,
                valor: compra.ValorParcela || 0,
                dataVencimento: dataVencimento,
                categoria: compra.Categoria,
                paga: i <= parcelasPagas
            });
        }
    });

    return parcelasGeradas;
}

function renderMeses(parcelas) {
    const listaEl = document.getElementById('despesas-lista');
    const totalEl = document.getElementById('valor-total');
    let totalGeralPendente = 0;
    
    listaEl.innerHTML = '';

    const mesesAgrupados = parcelas.reduce((acc, parcela) => {
        const mesAno = parcela.dataVencimento.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        if (!acc[mesAno]) {
            acc[mesAno] = [];
        }
        acc[mesAno].push(parcela);
        return acc;
    }, {});

    const mesAtualKey = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    for (const mesAno in mesesAgrupados) {
        const parcelasDoMes = mesesAgrupados[mesAno];
        let totalMesPendente = 0;
        
        // --- MUDANÇA AQUI: de DIV para DETAILS ---
        const mesContainer = document.createElement('details');
        mesContainer.classList.add('mes-container');
        // Se for o mês atual, começa aberto
        if (mesAno === mesAtualKey) {
            mesContainer.open = true;
        }
        
        // --- MUDANÇA AQUI: de H3 para SUMMARY ---
        const mesTitulo = document.createElement('summary');
        mesTitulo.textContent = mesAno.charAt(0).toUpperCase() + mesAno.slice(1);
        mesContainer.appendChild(mesTitulo);

        // O container para os itens agora fica separado para o spoiler funcionar
        const itensContainer = document.createElement('div');
        itensContainer.classList.add('itens-container');

        parcelasDoMes.forEach(parcela => {
            if (!parcela.paga) {
                totalMesPendente += parcela.valor;
            }

            const itemEl = document.createElement('div');
            itemEl.classList.add('item');
            if (parcela.paga) {
                itemEl.classList.add('pago');
            }

            itemEl.innerHTML = `
                <span>${parcela.dataVencimento.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                <span class="descricao-item">${parcela.descricao}</span>
                <span class="valor">${parcela.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            `;
            itensContainer.appendChild(itemEl); // Adiciona ao container de itens
        });

        const mesSumario = document.createElement('div');
        mesSumario.classList.add('mes-sumario');
        mesSumario.innerHTML = `Total pendente do mês: <strong>${totalMesPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>`;
        
        itensContainer.appendChild(mesSumario); // Adiciona o sumário junto com os itens
        mesContainer.appendChild(itensContainer); // Adiciona o container de itens ao spoiler
        
        listaEl.appendChild(mesContainer);
        totalGeralPendente += totalMesPendente;
    }

    totalEl.textContent = totalGeralPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}


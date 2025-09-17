// admin.js

// --- CONFIGURAÇÃO DE SEGURANÇA E API ---
const SECRET_KEY = "admnat"; // Mude para uma senha sua!
const AIRTABLE_API_KEY = 'patjsRIdUyTjexuyU.0491c701b73b6bcbf18ec61f4b8c996d450ce7cfb4aafe90787e4fb21cb43823'; // Use a chave com permissão de LEITURA
const AIRTABLE_BASE_ID = 'appcn9tV1jZeAh68Y';
const AIRTABLE_TABLE_NAME = 'Despesas';


window.addEventListener('load', () => {
    // Passo 1: Checar a autorização
    const params = new URLSearchParams(window.location.search);
    if (params.get('key') !== SECRET_KEY) {
        document.getElementById('acesso-negado').style.display = 'block';
        return;
    }
    
    // Se a chave estiver correta, mostra o conteúdo e busca os dados
    document.getElementById('dashboard-content').style.display = 'block';
    fetchAllDespesas();
});

async function fetchAllDespesas() {
    // A URL agora não tem filtro, buscando TODOS os registros
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}?sort%5B0%5D%5Bfield%5D=Data&sort%5B0%5D%5Bdirection%5D=asc`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` }
        });
        if (!response.ok) throw new Error('Falha ao buscar dados do Airtable.');

        const data = await response.json();
        const todasAsParcelas = gerarParcelasGlobais(data.records);
        processarDashboard(todasAsParcelas);

    } catch (error) {
        console.error(error);
        alert('Ocorreu um erro ao carregar os dados do dashboard.');
    }
}

function gerarParcelasGlobais(compras) {
    const parcelasGeradas = [];
    compras.forEach(record => {
        const compra = record.fields;
        const numParcelas = compra.NumParcelas || 1;
        const parcelasPagas = compra.ParcelasPagas || 0;

        for (let i = 1; i <= numParcelas; i++) {
            if (i > parcelasPagas) { // Processa apenas as parcelas PENDENTES
                const dataCompra = new Date(compra.Data);
                const dataVencimento = new Date(new Date(dataCompra).setMonth(dataCompra.getMonth() + (i - 1)));
                
                let dataDaFatura = new Date(dataVencimento);
                if (dataVencimento.getDate() > 7) {
                    dataDaFatura.setMonth(dataDaFatura.getMonth() + 1);
                }

                parcelasGeradas.push({
                    pessoa: compra.Pessoa, // Importante: guarda quem é o dono da parcela
                    valor: compra.ValorParcela || 0,
                    fatura: dataDaFatura
                });
            }
        }
    });
    return parcelasGeradas;
}

function processarDashboard(parcelas) {
    // 1. Calcular resumo por pessoa
    const resumoPessoas = parcelas.reduce((acc, p) => {
        acc[p.pessoa] = (acc[p.pessoa] || 0) + p.valor;
        return acc;
    }, {});

    // 2. Calcular resumo por fatura (para o gráfico)
    const resumoFaturas = parcelas.reduce((acc, p) => {
        const faturaKey = p.fatura.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        acc[faturaKey] = (acc[faturaKey] || 0) + p.valor;
        return acc;
    }, {});

    // 3. Renderizar tudo
    renderMetricas(resumoPessoas);
    renderResumoPorPessoa(resumoPessoas);
    renderGraficoAdmin(resumoFaturas);
}

function renderMetricas(resumoPessoas) {
    const totalGeral = Object.values(resumoPessoas).reduce((sum, val) => sum + val, 0);
    const totalDevedores = Object.keys(resumoPessoas).length;

    document.getElementById('total-geral').textContent = totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('total-devedores').textContent = totalDevedores;
}

function renderResumoPorPessoa(resumoPessoas) {
    const container = document.getElementById('resumo-por-pessoa');
    container.innerHTML = ''; // Limpa o "Carregando..."
    
    // Ordena as pessoas por quem deve mais
    const sortedPessoas = Object.entries(resumoPessoas).sort(([,a],[,b]) => b-a);

    sortedPessoas.forEach(([nome, valor]) => {
        const div = document.createElement('div');
        div.className = 'pessoa-resumo';
        div.innerHTML = `
            <span>${nome}</span>
            <span>${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        `;
        container.appendChild(div);
    });
}

// Substitua sua função antiga por esta versão completa e aprimorada
function renderGraficoGastos(dadosFaturas) {
    const ctx = document.getElementById('graficoGastos').getContext('2d');

    // Destrói o gráfico anterior se ele existir, para evitar bugs visuais
    if (window.myChart instanceof Chart) {
        window.myChart.destroy();
    }

function renderGraficoAdmin(resumoFaturas) {
    const ctx = document.getElementById('grafico-admin').getContext('2d');
    
    const sortedFaturas = Object.entries(resumoFaturas).sort((a,b) => new Date(a[0]) - new Date(b[0]));
    
    const labels = sortedFaturas.map(f => f[0]);
    const data = sortedFaturas.map(f => f[1]);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Pendente na Fatura (R$)',
                data: data,
                backgroundColor: 'rgba(220, 53, 69, 0.7)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 1
            }]
        },
        options: { // Reutilizando as opções do outro gráfico
            responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }
        }
    });
}
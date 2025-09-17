// /api/adicionar-despesa.js

export default async function handler(req, res) {
    // Permite apenas requisições do tipo POST
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Apenas o método POST é permitido' });
    }

    const {
        pessoa,
        descricao,
        valorTotal,
        numParcelas,
        valorParcela,
        data,
    } = req.body;

    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID; // Adicionaremos este também
    const AIRTABLE_TABLE_NAME = 'Despesas';

    try {
        const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                fields: {
                    Pessoa: pessoa,
                    Descricao: descricao,
                    ValorTotal: parseFloat(valorTotal),
                    NumParcelas: parseInt(numParcelas, 10),
                    ValorParcela: parseFloat(valorParcela),
                    Data: data,
                    ParcelasPagas: 0 // Começa com 0 parcelas pagas
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro do Airtable: ${JSON.stringify(errorData)}`);
        }

        const newRecord = await response.json();
        res.status(200).json({ message: 'Despesa adicionada com sucesso!', record: newRecord });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ocorreu um erro ao adicionar a despesa.' });
    }
}
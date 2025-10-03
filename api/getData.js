// Este código roda no servidor da Vercel, não no navegador.

export default async function handler(request, response) {
  // Pega a Chave de API secreta das "Environment Variables" da Vercel
  const API_KEY = process.env.GOOGLE_API_KEY;
  const SPREADSHEET_ID = '19CL5NQMuTc96yrCu5pLU7kCwoa8yrC7uR2PdojDsbLs';
  const DATA_RANGE = 'A3:E';

  try {
    // ETAPA 1: Descobrir o nome de todas as abas (meses)
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;
    const metaResponse = await fetch(metaUrl);
    const spreadsheetMeta = await metaResponse.json();
    const sheetNames = spreadsheetMeta.sheets.map(sheet => sheet.properties.title);

    // ETAPA 2: Buscar os dados de cada aba
    const dataPromises = sheetNames.map(name => {
        const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(name)}!${DATA_RANGE}?key=${API_KEY}`;
        return fetch(dataUrl).then(res => res.json());
    });
    const allSheetData = await Promise.all(dataPromises);

    // ETAPA 3: Juntar todos os dados
    const fullData = allSheetData.flatMap((sheetResult, index) => {
        if (!sheetResult.values) return [];
        const monthName = sheetNames[index];
        return sheetResult.values.map(row => ({
            mes: monthName,
            atendente: row[0] || null,
            problema: row[1] || null,
            recorrencia: row[2] || null,
            semana: row[3] || null,
            apontamento: row[4] || null,
        })).filter(row => row.atendente);
    });
    
    // Envia os dados de volta para o frontend (seu dashboard)
    response.status(200).json({ data: fullData });

  } catch (error) {
    console.error(error);
    response.status(500).json({ error: 'Falha ao buscar dados da planilha.' });
  }
}

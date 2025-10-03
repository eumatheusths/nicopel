// =======================================================
// ÁREA DE CONFIGURAÇÃO
// =======================================================
const API_KEY = 'AIzaSyASDue3RghhQRqMPhJWZJrD7tsKoquAB5E'; // Sua chave de API
const SPREADSHEET_ID = '19CL5NQMuTc96yrCu5pLU7kCwoa8yrC7uR2PdojDsbLs'; // ID da planilha
const DATA_RANGE = 'A3:E'; // Intervalo de dados dentro de cada aba
// =======================================================

let fullData = [];

const mesFilter = document.getElementById('mes-filter');
const atendenteFilter = document.getElementById('atendente-filter');
const semanaFilter = document.getElementById('semana-filter');
const dashboardContent = document.getElementById('dashboard-content');
const loadingMessage = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');

async function fetchData() {
    console.log("1. Iniciando busca de dados...");
    try {
        // ETAPA 1: Descobrir o nome de todas as abas (meses)
        console.log("2. Buscando metadados (nomes das abas)...");
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;
        const metaResponse = await fetch(metaUrl);
        if (!metaResponse.ok) throw new Error(`Falha ao buscar metadados: ${metaResponse.statusText}`);
        const spreadsheetMeta = await metaResponse.json();
        const sheetNames = spreadsheetMeta.sheets.map(sheet => sheet.properties.title);
        console.log("3. Abas encontradas:", sheetNames);

        // ETAPA 2: Buscar os dados de cada aba em paralelo
        console.log("4. Preparando para buscar dados de cada aba...");
        const dataPromises = sheetNames.map(name => {
            const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(name)}!${DATA_RANGE}?key=${API_KEY}`;
            return fetch(dataUrl).then(res => {
                if (!res.ok) throw new Error(`Falha ao buscar dados da aba '${name}': ${res.statusText}`);
                return res.json();
            });
        });

        const allSheetData = await Promise.all(dataPromises);
        console.log("5. Dados de todas as abas recebidos.");

        // ETAPA 3: Juntar todos os dados
        fullData = allSheetData.flatMap((sheetResult, index) => {
            if (!sheetResult.values) return [];
            const monthName = sheetNames[index];
            return sheetResult.values.map(row => ({
                mes: monthName,
                atendente: row[0],
                problema: row[1],
                recorrencia: row[2],
                semana: row[3],
                apontamento: row[4]
            })).filter(row => row.atendente);
        });
        console.log("6. Todos os dados foram combinados. Total de linhas:", fullData.length);

        populateFilters(sheetNames);
        renderDashboard();

        loadingMessage.style.display = 'none';
        dashboardContent.style.display = 'grid';
        console.log("7. Dashboard renderizado com sucesso!");

    } catch (error) {
        console.error("ERRO DETALHADO NO CATCH:", error);
        loadingMessage.style.display = 'none';
        errorContainer.style.display = 'block';
        errorContainer.innerHTML = `<p class="error-message"><b>Ocorreu um erro ao carregar os dados.</b><br>Por favor, verifique o Console do Desenvolvedor (F12) para detalhes técnicos.</p>`;
    }
}

function populateFilters(sheetNames) {
    console.log("Populando filtros...");
    mesFilter.innerHTML = '<option value="todos">Todos</option>';
    atendenteFilter.innerHTML = '<option value="todos">Todos</option>';
    semanaFilter.innerHTML = '<option value="todos">Todas</option>';
    
    sheetNames.forEach(name => {
        mesFilter.innerHTML += `<option value="${name}">${name}</option>`;
    });

    const atendentes = [...new Set(fullData.map(item => item.atendente))];
    atendentes.sort().forEach(atendente => {
        atendenteFilter.innerHTML += `<option value="${atendente}">${atendente}</option>`;
    });

    const semanas = [...new Set(fullData.map(item => item.semana))];
    semanas.sort().forEach(semana => {
        semanaFilter.innerHTML += `<option value="${semana}">${semana}</option>`;
    });
}

function renderDashboard() {
    console.log("Renderizando o dashboard...");
    const selectedMes = mesFilter.value;
    const selectedAtendente = atendenteFilter.value;
    const selectedSemana = semanaFilter.value;

    let filteredData = fullData.filter(item => 
        (selectedMes === 'todos' || item.mes === selectedMes) &&
        (selectedAtendente === 'todos' || item.atendente === selectedAtendente) &&
        (selectedSemana === 'todos' || item.semana === selectedSemana)
    );

    renderList(document.getElementById('problemas-list'), filteredData, 'problema');
    renderRecorrencia(document.querySelector('#recorrencia-table tbody'), filteredData);
    renderList(document.getElementById('apontamentos-list'), filteredData, 'apontamento');
}

function renderList(element, data, property) {
    const items = data.map(item => item[property]).filter(Boolean);
    if (items.length === 0) {
        element.innerHTML = '<li>Nenhum dado encontrado.</li>'; return;
    }
    element.innerHTML = items.map(item => `<li>${item}</li>`).join('');
}

function renderRecorrencia(element, data) {
    const recorrenciaMap = new Map();
    data.forEach(item => {
        const problema = item.problema;
        const vezes = parseInt(item.recorrencia?.match(/\d+/)?.[0] || 0);
        if (problema && vezes > 0) {
            recorrenciaMap.set(problema, (recorrenciaMap.get(problema) || 0) + vezes);
        }
    });
    if (recorrenciaMap.size === 0) {
        element.innerHTML = '<tr><td colspan="2">Nenhuma recorrência encontrada.</td></tr>'; return;
    }
    const sortedRecorrencias = [...recorrenciaMap.entries()].sort((a, b) => b[1] - a[1]);
    element.innerHTML = sortedRecorrencias.map(([problema, total]) => `<tr><td>${problema}</td><td>${total}</td></tr>`).join('');
}

mesFilter.addEventListener('change', renderDashboard);
atendenteFilter.addEventListener('change', renderDashboard);
semanaFilter.addEventListener('change', renderDashboard);

fetchData();

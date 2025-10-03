let fullData = [];

// Elementos do DOM
const mesFilter = document.getElementById('mes-filter');
const atendenteFilter = document.getElementById('atendente-filter');
const semanaFilter = document.getElementById('semana-filter');
const dashboardContent = document.getElementById('dashboard-content');
const loadingMessage = document.getElementById('loading');
const errorContainer = document.getElementById('error-container');
const printButton = document.getElementById('print-button');

async function fetchData() {
    try {
        const response = await fetch('/api/getData'); 
        if (!response.ok) {
            throw new Error(`Erro no servidor: ${response.statusText}`);
        }
        const result = await response.json();
        fullData = result.data;

        const sheetNames = [...new Set(fullData.map(item => item.mes))];
        populateFilters(sheetNames);
        renderDashboard();

        loadingMessage.style.display = 'none';
        dashboardContent.style.display = 'grid';

    } catch (error) {
        console.error("Falha ao buscar dados:", error);
        loadingMessage.style.display = 'none';
        errorContainer.style.display = 'block';
        errorContainer.innerHTML = `<p class="error-message"><b>Ocorreu um erro ao carregar os dados.</b><br>${error.message}</p>`;
    }
}

function populateFilters(sheetNames) {
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
    const selectedMes = mesFilter.value;
    const selectedAtendente = atendenteFilter.value;
    const selectedSemana = semanaFilter.value;

    let filteredData = fullData.filter(item => 
        (selectedMes === 'todos' || item.mes === selectedMes) &&
        (selectedAtendente === 'todos' || item.atendente === selectedAtendente) &&
        (selectedSemana === 'todos' || item.semana === selectedSemana)
    );

    renderList(document.getElementById('problemas-list'), filteredData, 'problema', true);
    renderRecorrencia(document.querySelector('#recorrencia-table tbody'), filteredData);
    renderList(document.getElementById('apontamentos-list'), filteredData, 'apontamento', false);
}

function renderList(element, data, property, unique = false) {
    let items = data.map(item => item[property]).filter(Boolean);
    if (unique) {
        items = [...new Set(items)];
    }
    if (items.length === 0) {
        element.innerHTML = '<li>Nenhum dado encontrado.</li>'; 
        return;
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
        element.innerHTML = '<tr><td colspan="2">Nenhuma recorrência encontrada.</td></tr>'; 
        return;
    }
    const sortedRecorrencias = [...recorrenciaMap.entries()].sort((a, b) => b[1] - a[1]);
    element.innerHTML = sortedRecorrencias.map(([problema, total]) => `<tr><td>${problema}</td><td>${total}</td></tr>`).join('');
}

// Event Listeners dos filtros
mesFilter.addEventListener('change', renderDashboard);
atendenteFilter.addEventListener('change', renderDashboard);
semanaFilter.addEventListener('change', renderDashboard);

// MUDANÇA AQUI: Lógica do botão de imprimir atualizada
printButton.addEventListener('click', () => {
    // 1. Pega o TEXTO visível das opções selecionadas nos filtros
    const selectedMesText = mesFilter.options[mesFilter.selectedIndex].text;
    const selectedAtendenteText = atendenteFilter.options[atendenteFilter.selectedIndex].text;
    const selectedSemanaText = semanaFilter.options[semanaFilter.selectedIndex].text;

    // 2. Atualiza o cabeçalho de impressão com esses textos
    document.getElementById('print-mes').textContent = selectedMesText;
    document.getElementById('print-atendente').textContent = selectedAtendenteText;
    document.getElementById('print-semana').textContent = selectedSemanaText;
    
    // 3. Chama a função de impressão do navegador
    window.print();
});

// Inicia o processo
fetchData();

// Configuración de la API
const API_BASE = 'https://api.guildwars2.com/v2';
const LANG = 'es'; // Español

// Elementos del DOM
const searchType = document.getElementById('searchType');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const results = document.getElementById('results');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Mapeo de tipos a endpoints
const endpoints = {
    objects: 'items',
    skills: 'skills',
    traits: 'traits'
};

// Función principal de búsqueda
async function handleSearch() {
    const type = searchType.value;
    const query = searchInput.value.trim();

    if (!query) {
        showError('❌ Por favor, introduce un ID o nombre para buscar');
        return;
    }

    showLoading();

    try {
        const endpoint = endpoints[type];
        let data;

        // Detectar si es un ID (solo números)
        if (/^\d+$/.test(query)) {
            data = await fetchById(endpoint, query);
        } else {
            data = await searchByName(endpoint, query);
        }

        if (data) {
            displayResults(data, type);
        } else {
            showError(`🔍 No se encontraron resultados para "${query}"`);
        }
    } catch (error) {
        showError(`⚠️ Error: ${error.message}`);
        console.error(error);
    }
}

// Obtener por ID
async function fetchById(endpoint, id) {
    const url = `${API_BASE}/${endpoint}/${id}?lang=${LANG}`;
    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
}

// Buscar por nombre (usando búsqueda en lista)
async function searchByName(endpoint, name) {
    // Primero obtenemos la lista completa (IDs)
    const listUrl = `${API_BASE}/${endpoint}`;
    const idsResponse = await fetch(listUrl);
    const allIds = await idsResponse.json();

    // Tomamos solo los primeros 200 para no sobrecargar
    const limitedIds = allIds.slice(0, 200);

    // Obtenemos los detalles en lote
    const detailsUrl = `${API_BASE}/${endpoint}?ids=${limitedIds.join(',')}&lang=${LANG}`;
    const detailsResponse = await fetch(detailsUrl);
    const items = await detailsResponse.json();

    // Buscamos por nombre (case-insensitive)
    const lowerName = name.toLowerCase();
    const found = items.filter(item =>
        item.name && item.name.toLowerCase().includes(lowerName)
    );

    return found.length > 0 ? found : null;
}

// Mostrar resultados
function displayResults(data, type) {
    if (Array.isArray(data)) {
        if (data.length === 0) {
            showError('No se encontraron resultados');
            return;
        }

        results.innerHTML = data.map(item => formatItem(item, type)).join('');
    } else {
        results.innerHTML = formatItem(data, type);
    }
}

// Formatear un ítem individual
function formatItem(item, type) {
    let html = `<div class="result-item">`;
    html += `<h3>${item.name || 'Sin nombre'}</h3>`;
    html += `<div class="detail">`;
    html += `<span><strong>ID:</strong> ${item.id}</span>`;

    if (item.level !== undefined) {
        html += `<span><strong>Nivel:</strong> ${item.level}</span>`;
    }

    if (item.rarity) {
        html += `<span><strong>Rareza:</strong> ${item.rarity}</span>`;
    }

    if (item.type) {
        html += `<span><strong>Tipo:</strong> ${item.type}</span>`;
    }

    if (item.profession) {
        html += `<span><strong>Profesión:</strong> ${item.profession}</span>`;
    }

    if (item.slot) {
        html += `<span><strong>Slot:</strong> ${item.slot}</span>`;
    }

    html += `</div>`;

    if (item.description) {
        html += `<div class="description">📝 ${item.description}</div>`;
    }

    // Mostrar información específica según tipo
    if (type === 'skills' && item.facts) {
        html += `<div class="description"><strong>📊 Datos de habilidad:</strong> ${item.facts.length} efectos</div>`;
    }

    if (type === 'traits' && item.tier) {
        html += `<div class="description"><strong>📈 Nivel de rasgo:</strong> ${item.tier}</div>`;
    }

    if (type === 'objects' && item.details) {
        html += `<div class="description"><strong>📦 Detalles:</strong> ${JSON.stringify(item.details).slice(0, 100)}...</div>`;
    }

    html += `</div>`;
    return html;
}

// Mostrar loading
function showLoading() {
    results.innerHTML = `<div class="loading">⏳ Cargando...</div>`;
}

// Mostrar error
function showError(message) {
    results.innerHTML = `<div class="error">${message}</div>`;
}

// Mensaje inicial
showError('🔎 Introduce un ID o nombre para buscar');
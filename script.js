// Configuración
const API_BASE = 'https://api.guildwars2.com/v2';
const LANG = 'es';
const MAX_SEARCH_RESULTS = 500;

// Elementos DOM
const searchType = document.getElementById('searchType');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const results = document.getElementById('results');
const resultCount = document.getElementById('resultCount');

// Event Listeners
searchBtn.addEventListener('click', handleSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
});

// Botones de ejemplo
document.querySelectorAll('.example-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        searchType.value = btn.dataset.type;
        searchInput.value = btn.dataset.id;
        handleSearch();
    });
});

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

async function handleSearch() {
    const type = searchType.value;
    const query = searchInput.value.trim();

    if (!query) {
        showError('Por favor, introduce un ID o nombre para buscar', '🔍');
        return;
    }

    showLoading();
    resultCount.style.display = 'none';

    try {
        let data;

        // Si es número, buscar por ID
        if (/^\d+$/.test(query)) {
            data = await fetchById(type, query);
            if (data) {
                displayResult(data, type);
            } else {
                showError(`No se encontró el ${getTypeName(type)} con ID: ${query}`, '🔍');
            }
        } else {
            // Búsqueda por nombre
            data = await searchByName(type, query);
            if (data && data.length > 0) {
                displayResultsList(data, type, query);
            } else {
                showError(`No se encontraron ${getTypeName(type)} que coincidan con "${query}"`, '🔍');
            }
        }
    } catch (error) {
        showError(`Error al conectar con la API: ${error.message}`, '⚠️');
        console.error('Error:', error);
    }
}

// ============================================
// PETICIONES A LA API
// ============================================

async function fetchById(type, id) {
    const url = `${API_BASE}/${type}/${id}?lang=${LANG}`;
    const response = await fetch(url);

    if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
}

async function searchByName(type, name) {
    // Obtener lista de IDs
    const listUrl = `${API_BASE}/${type}`;
    const idsResponse = await fetch(listUrl);
    const allIds = await idsResponse.json();

    // Limitar para no sobrecargar
    const limitedIds = allIds.slice(0, MAX_SEARCH_RESULTS);

    // Obtener detalles en lote
    const detailsUrl = `${API_BASE}/${type}?ids=${limitedIds.join(',')}&lang=${LANG}`;
    const detailsResponse = await fetch(detailsUrl);
    const items = await detailsResponse.json();

    // Buscar por nombre (case-insensitive)
    const lowerName = name.toLowerCase();
    const found = items.filter(item =>
        item.name && item.name.toLowerCase().includes(lowerName)
    );

    return found;
}

// ============================================
// RENDERIZADO DE RESULTADOS
// ============================================

function displayResult(item, type) {
    results.innerHTML = createResultCard(item, type);
    updateResultCount(1);
}

function displayResultsList(items, type, query) {
    const cards = items.map(item => createResultCard(item, type)).join('');
    results.innerHTML = cards;
    updateResultCount(items.length);
}

function createResultCard(item, type) {
    // Determinar el tipo de objeto
    const typeName = getTypeName(type);
    const iconHtml = getIconHtml(item);
    const rarityHtml = item.rarity ?
        `<span class="rarity-badge rarity-${item.rarity}">${item.rarity}</span>` : '';

    let html = `
        <div class="result-card">
            <div class="result-header">
                <div class="result-icon">
                    ${iconHtml}
                </div>
                <div class="result-title">
                    <h2>${item.name || 'Sin nombre'}</h2>
                    <div class="id-info">
                        <span>ID: ${item.id}</span>
                        ${rarityHtml}
                        <span>${typeName}</span>
                    </div>
                </div>
            </div>
            <div class="result-body">
    `;

    // Información común
    html += createDetailRow('Nivel', item.level);
    html += createDetailRow('Tipo', item.type);
    html += createDetailRow('Sub-tipo', item.subtype);
    html += createDetailRow('Rareza', item.rarity);
    html += createDetailRow('Peso', item.weight);
    html += createDetailRow('Profesión', item.profession);
    html += createDetailRow('Especialización', item.specialization);
    html += createDetailRow('Slot', item.slot);
    html += createDetailRow('Arma', item.weapon_type);
    html += createDetailRow('Armadura', item.armor_type);

    // Información específica por tipo
    if (type === 'items') {
        html += renderItemDetails(item);
    } else if (type === 'skills') {
        html += renderSkillDetails(item);
    } else if (type === 'traits') {
        html += renderTraitDetails(item);
    }

    // Descripción
    if (item.description) {
        html += `
            <div class="description-box">
                📝 ${item.description}
            </div>
        `;
    }

    // Datos adicionales
    if (item.flags && item.flags.length > 0) {
        html += createDetailRow('Flags',
            item.flags.map(f => `<span class="tag">${f}</span>`).join(' ')
        );
    }

    if (item.game_types && item.games && item.games.length > 0) {
        html += createDetailRow('Modos de juego',
            item.games.map(g => `<span class="tag">${g}</span>`).join(' ')
        );
    }

    if (item.categories && item.categories.length > 0) {
        html += createDetailRow('Categorías',
            item.categories.map(c => `<span class="tag">${c}</span>`).join(' ')
        );
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

// ============================================
// RENDERIZADO DE DETALLES ESPECÍFICOS
// ============================================

function renderItemDetails(item) {
    if (!item.details) return '';

    const details = item.details;
    let html = '';

    // Estadísticas de objetos
    if (details.stats) {
        html += createDetailRow('Estadísticas',
            `${details.stats.damage || ''} ${details.stats.defense || ''}`
        );

        // Atributos
        if (details.stats.attributes) {
            const attrs = details.stats.attributes;
            const attrList = [];
            if (attrs.Power) attrList.push(`Poder: ${attrs.Power}`);
            if (attrs.Precision) attrList.push(`Precisión: ${attrs.Precision}`);
            if (attrs.Toughness) attrList.push(`Dureza: ${attrs.Toughness}`);
            if (attrs.Vitality) attrList.push(`Vitalidad: ${attrs.Vitality}`);
            if (attrs.ConditionDamage) attrList.push(`Daño por condición: ${attrs.ConditionDamage}`);
            if (attrs.ConditionDuration) attrList.push(`Duración condición: ${attrs.ConditionDuration}%`);
            if (attrs.HealingPower) attrList.push(`Poder de curación: ${attrs.HealingPower}`);
            if (attrs.BoonDuration) attrList.push(`Duración de bendición: ${attrs.BoonDuration}%`);
            if (attrs.CritDamage) attrList.push(`Daño crítico: ${attrs.CritDamage}%`);
            if (attrs.Ferocity) attrList.push(`Ferocidad: ${attrs.Ferocity}`);

            if (attrList.length > 0) {
                html += createDetailRow('Atributos', attrList.join(' • '));
            }
        }
    }

    // Bonificaciones de infusión
    if (details.infusion_upgrade_flags && details.infusion_upgrade_flags.length > 0) {
        html += createDetailRow('Bonificaciones de infusión',
            details.infusion_upgrade_flags.join(', ')
        );
    }

    // Ranuras de mejora
    if (details.upgrade_components && details.upgrade_components.length > 0) {
        html += createDetailRow('Componentes de mejora',
            details.upgrade_components.join(', ')
        );
    }

    // Sufijo
    if (details.suffix_item_id) {
        html += createDetailRow('Item sufijo', details.suffix_item_id);
    }

    return html;
}

function renderSkillDetails(item) {
    let html = '';

    // Facts de habilidades
    if (item.facts && item.facts.length > 0) {
        html += `<div class="facts-section">`;
        html += `<div class="facts-title">📊 Efectos de la habilidad</div>`;

        item.facts.forEach(fact => {
            let value = fact.value || fact.distance || fact.duration || fact.hit_count || fact.targets || '';
            let text = fact.text || fact.description || '';

            if (fact.type === 'Buff' || fact.type === 'Condition' || fact.type === 'Effect') {
                text = fact.status || text;
                value = `${fact.duration || ''}s`;
            }

            html += `
                <div class="fact-item">
                    <span class="fact-text">${text || fact.type}</span>
                    <span class="fact-value">${value}</span>
                </div>
            `;
        });

        html += `</div>`;
    }

    // Tiempo de recarga
    if (item.cooldown) {
        html += createDetailRow('Recarga', `${item.cooldown}s`);
    }

    // Rango
    if (item.range) {
        html += createDetailRow('Rango', `${item.range}`);
    }

    // Costo de iniciativa (Thief)
    if (item.initiative) {
        html += createDetailRow('Iniciativa', item.initiative);
    }

    // Costo de energía (Revenant)
    if (item.energy) {
        html += createDetailRow('Energía', item.energy);
    }

    // Profesiones
    if (item.professions && item.professions.length > 0) {
        html += createDetailRow('Profesiones',
            item.professions.map(p => `<span class="tag">${p}</span>`).join(' ')
        );
    }

    return html;
}

function renderTraitDetails(item) {
    let html = '';

    // Nivel de rasgo
    if (item.tier) {
        html += createDetailRow('Nivel', item.tier);
    }

    // Orden
    if (item.order) {
        html += createDetailRow('Orden', item.order);
    }

    // Profesiones
    if (item.profession) {
        html += createDetailRow('Profesión', item.profession);
    }

    // Especialización
    if (item.specialization) {
        html += createDetailRow('Especialización', item.specialization);
    }

    // Habilidades relacionadas
    if (item.skill_id) {
        html += createDetailRow('Habilidad relacionada', item.skill_id);
    }

    // Facts de rasgos
    if (item.facts && item.facts.length > 0) {
        html += `<div class="facts-section">`;
        html += `<div class="facts-title">📊 Efectos del rasgo</div>`;

        item.facts.forEach(fact => {
            let value = fact.value || fact.duration || fact.distance || '';
            let text = fact.text || fact.type || '';

            if (fact.type === 'Buff' || fact.type === 'Condition') {
                text = fact.status || text;
                value = fact.duration ? `${fact.duration}s` : value;
            }

            html += `
                <div class="fact-item">
                    <span class="fact-text">${text}</span>
                    <span class="fact-value">${value}</span>
                </div>
            `;
        });

        html += `</div>`;
    }

    return html;
}

// ============================================
// UTILIDADES
// ============================================

function createDetailRow(label, value) {
    if (!value && value !== 0) return '';
    if (Array.isArray(value) && value.length === 0) return '';

    return `
        <div class="detail-row">
            <span class="detail-label">${label}:</span>
            <span class="detail-value">${value}</span>
        </div>
    `;
}

function getIconHtml(item) {
    if (item.icon) {
        return `<img src="${item.icon}" alt="${item.name || 'Icono'}" loading="lazy">`;
    }
    return `<span class="no-icon">🎯</span>`;
}

function getTypeName(type) {
    const names = {
        'items': 'objeto',
        'skills': 'habilidad',
        'traits': 'rasgo'
    };
    return names[type] || type;
}

function updateResultCount(count) {
    if (count > 0) {
        resultCount.style.display = 'inline';
        resultCount.textContent = `📊 ${count} resultado${count > 1 ? 's' : ''}`;
    }
}

// ============================================
// ESTADOS DE LA UI
// ============================================

function showLoading() {
    results.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Cargando datos de Tyria...</p>
        </div>
    `;
}

function showError(message, icon = '❌') {
    results.innerHTML = `
        <div class="error">
            <div class="error-icon">${icon}</div>
            <p>${message}</p>
        </div>
    `;
    resultCount.style.display = 'none';
}

// ============================================
// INICIALIZACIÓN
// ============================================

// Mensaje de bienvenida ya está en HTML
console.log('⚔️ GW2 Explorer cargado correctamente');
console.log('💡 Busca objetos, habilidades o rasgos de Guild Wars 2');
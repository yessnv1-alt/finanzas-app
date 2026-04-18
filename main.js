import ApexCharts from 'apexcharts';

// Configuración de API y Variables de Entorno
const API_KEY = import.meta.env.VITE_EXCHANGERATE_API_KEY;
const BASE_URL = `https://v6.exchangerate-api.com/v6/${API_KEY}`;

// Definición de las 12 monedas con la nueva paleta de colores de Yessi
const CURRENCIES = [
    { code: 'USD', name: 'Dólar Estadounidense', flag: 'us', color: 'magenta' },
    { code: 'EUR', name: 'Euro', flag: 'eu', color: 'cyan' },
    { code: 'GBP', name: 'Libra Esterlina', flag: 'gb', color: 'pink' },
    { code: 'CAD', name: 'Dólar Canadiense', flag: 'ca', color: 'magenta' },
    { code: 'CHF', name: 'Franco Suizo', flag: 'ch', color: 'cyan' },
    { code: 'JPY', name: 'Yen Japonés', flag: 'jp', color: 'pink' },
    { code: 'CNY', name: 'Yuan Chino', flag: 'cn', color: 'magenta' },
    { code: 'BRL', name: 'Real Brasileño', flag: 'br', color: 'cyan' },
    { code: 'MXN', name: 'Peso Mexicano', flag: 'mx', color: 'pink' },
    { code: 'CLP', name: 'Peso Chileno', flag: 'cl', color: 'magenta' },
    { code: 'COP', name: 'Peso Colombiano', flag: 'co', color: 'cyan' },
    { code: 'ARS', name: 'Peso Argentino', flag: 'ar', color: 'pink' }
];

let exchangeRates = {};

/**
 * Obtiene las tasas de cambio desde la API
 * Incluye un sistema de respaldo por si hay errores de conexión o API Key
 */
async function fetchRates() {
    try {
        console.log("Iniciando conexión con el Nexus Financiero...");
        const response = await fetch(`${BASE_URL}/latest/DOP`);
        
        if (!response.ok) throw new Error('Error de red o API Key inválida');

        const data = await response.json();
        
        if (data.result === 'success') {
            console.log("✅ Datos sincronizados correctamente.");
            exchangeRates = data.conversion_rates;
        } else {
            throw new Error(data['error-type'] || 'Error desconocido');
        }
    } catch (error) {
        console.warn("⚠️ Error detectado. Activando protocolo de datos de respaldo.");
        console.error("Detalle:", error.message);
        
        // Tasas aproximadas de respaldo para que la app nunca se vea vacía
        exchangeRates = {
            USD: 0.017, EUR: 0.015, GBP: 0.013, CAD: 0.023, CHF: 0.015,
            JPY: 2.54, CNY: 0.12, BRL: 0.085, MXN: 0.29, CLP: 15.9,
            COP: 66.5, ARS: 14.8
        };
    } finally {
        renderCards();
    }
}

/**
 * Renderiza las tarjetas de divisas en el grid
 */
function renderCards() {
    const grid = document.getElementById('currencyGrid');
    if (!grid) return;
    grid.innerHTML = ''; 

    const masterAmount = parseFloat(document.getElementById('masterAmount').value) || 0;

    CURRENCIES.forEach(curr => {
        // Calculamos cuánto es 1 unidad de la moneda extranjera en DOP
        const rateAgainstDOP = 1 / (exchangeRates[curr.code] || 1);
        const totalConverted = (masterAmount * rateAgainstDOP).toFixed(2);
        
        const cardHTML = `
            <div class="col-md-4 col-sm-6 mb-4">
                <div class="card cyber-card border-${curr.color}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <img src="https://flagcdn.com/w80/${curr.flag}.png" 
                                 class="rounded-circle border border-secondary" 
                                 width="40" height="40" 
                                 style="box-shadow: 0 0 10px rgba(255,255,255,0.2)">
                            <h5 class="mb-0 fw-bold" style="letter-spacing: 2px;">${curr.code}</h5>
                        </div>
                        <p class="text-secondary small mb-1 text-uppercase">${curr.name}</p>
                        <div class="currency-value text-neon-${curr.color} mb-3" id="val-${curr.code}">
                            RD$ ${parseFloat(totalConverted).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </div>
                        <!-- Contenedor del Gráfico -->
                        <div id="chart-${curr.code}" class="chart-container"></div>
                    </div>
                </div>
            </div>
        `;
        grid.insertAdjacentHTML('beforeend', cardHTML);
        initChart(curr.code, curr.color, rateAgainstDOP);
    });
}

/**
 * Inicializa los gráficos de tendencia con ApexCharts
 */
function initChart(code, color, currentRate) {
    // Mapeo de colores neón para los gráficos
    const getColorCode = (c) => {
        const palette = { 
            magenta: '#ff00ff', 
            cyan: '#00f3ff', 
            pink: '#ff2d55' 
        };
        return palette[c] || '#ff00ff';
    };

    // Generación de datos simulados para la tendencia (variación del +/- 3%)
    const mockData = Array.from({ length: 12 }, () => 
        (currentRate * (0.97 + Math.random() * 0.06)).toFixed(2)
    );

    const options = {
        series: [{ name: 'Tasa (DOP)', data: mockData }],
        chart: { 
            type: 'area', 
            height: 120, 
            sparkline: { enabled: true },
            animations: { enabled: true, easing: 'easeinout', speed: 1000 }
        },
        stroke: { curve: 'smooth', width: 3, colors: [getColorCode(color)] },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.45,
                opacityTo: 0.05,
                stops: [0, 100]
            }
        },
        colors: [getColorCode(color)],
        tooltip: { 
            theme: 'dark',
            x: { show: false },
            y: { title: { formatter: () => '' } }
        }
    };

    const chartContainer = document.querySelector(`#chart-${code}`);
    if (chartContainer) {
        new ApexCharts(chartContainer, options).render();
    }
}

/**
 * Event Listener para el Calculador Maestro
 */
document.getElementById('masterAmount').addEventListener('input', (e) => {
    const amount = parseFloat(e.target.value) || 0;
    
    CURRENCIES.forEach(curr => {
        const rateAgainstDOP = 1 / (exchangeRates[curr.code] || 1);
        const total = (amount * rateAgainstDOP).toLocaleString('en-US', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
        });
        
        const displayElement = document.getElementById(`val-${curr.code}`);
        if (displayElement) {
            displayElement.innerText = `RD$ ${total}`;
        }
    });
});

// Inicializar la carga de datos
fetchRates();
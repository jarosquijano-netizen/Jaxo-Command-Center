/**
 * API Client para Family Command Center
 * Cliente para comunicarse con el backend Flask
 */

const API_BASE_URL = window.location.origin;

/**
 * Cliente API genérico
 */
class APIClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    /**
     * Método genérico para hacer requests
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const headers = { 'Content-Type': 'application/json' };
        // If APP_PIN is active, include it on every API request
        const pin = sessionStorage.getItem('app_pin') || localStorage.getItem('app_pin');
        if (pin) headers['X-App-Pin'] = pin;

        const defaultOptions = { headers };
        const config = { ...defaultOptions, ...options, headers: { ...headers, ...(options.headers || {}) } };

        // Timeout generoso: generar un menú con IA puede tardar ~60s.
        const controller = new AbortController();
        const timeoutMs = options.timeoutMs || 180000;
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        config.signal = controller.signal;

        try {
            const response = await fetch(url, config);
            // Leer como texto y parsear con seguridad: si el servidor está
            // reiniciándose (deploy) puede devolver HTML/502, no JSON.
            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (parseErr) {
                console.error('API non-JSON response:', response.status, text.slice(0, 200));
                return {
                    success: false,
                    message: `El servidor devolvió una respuesta no válida (HTTP ${response.status}). ` +
                             `Puede estar reiniciándose — espera unos segundos y vuelve a intentarlo.`,
                };
            }
            return data;
        } catch (error) {
            console.error('API Error:', error);
            if (error.name === 'AbortError') {
                throw new Error('La operación tardó demasiado. Si generabas un menú, puede haberse creado igualmente: recarga para comprobarlo.');
            }
            throw error;
        } finally {
            clearTimeout(timer);
        }
    }

    // Métodos HTTP
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Instancia global del cliente
const api = new APIClient();

// Verificar conexión con backend
async function checkBackendConnection() {
    try {
        const response = await api.get('/health');
        console.log('Backend conectado:', response.message);
        return true;
    } catch (error) {
        console.error('Backend no disponible:', error.message);
        console.log('Asegúrate de que el servidor Flask está corriendo en', API_BASE_URL);
        return false;
    }
}

// Verificar al cargar la página
checkBackendConnection();

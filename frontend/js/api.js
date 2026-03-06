/**
 * API Client para Family Command Center
 * Cliente para comunicarse con el backend Flask
 */

const API_BASE_URL = 'http://localhost:9000';

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
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                return data;
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
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
        console.log('✅ Backend conectado:', response.message);
        return true;
    } catch (error) {
        console.error('❌ Backend no disponible:', error.message);
        console.log('Asegúrate de que el servidor Flask está corriendo en', API_BASE_URL);
        return false;
    }
}

// Verificar al cargar la página
checkBackendConnection();

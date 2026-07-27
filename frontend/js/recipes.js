/**
 * Recetas — guarda recetas que te gustan (Pinterest, blogs…) como referencia
 * de estilo para que la IA genere menús más acordes a vuestro gusto.
 */
class RecipesManager {
    constructor() {
        this.recipes = [];
        this._bound = false;
        this.init();
    }

    init() {
        this.setupListeners();
        this.load();
    }

    _headers() {
        const pin = sessionStorage.getItem('app_pin') || localStorage.getItem('app_pin') || '';
        const h = { 'Content-Type': 'application/json' };
        if (pin) h['X-App-Pin'] = pin;
        return h;
    }

    setupListeners() {
        if (this._bound) return;
        const addBtn = document.getElementById('recipeAddBtn');
        if (addBtn) addBtn.addEventListener('click', () => this.addRecipe());
        const nombre = document.getElementById('recipeNombre');
        if (nombre) nombre.addEventListener('keydown', e => { if (e.key === 'Enter') this.addRecipe(); });
        this._bound = true;
    }

    async load() {
        try {
            const res = await fetch('/api/recipes', { headers: this._headers() });
            const data = await res.json();
            this.recipes = (data.success && data.data) ? data.data : [];
            this.render();
        } catch (e) {
            console.error('[recipes] load error', e);
            const list = document.getElementById('recipesList');
            if (list) list.innerHTML = '<p style="color:#f87171;">Error cargando recetas</p>';
        }
    }

    async addRecipe() {
        const nombre = document.getElementById('recipeNombre').value.trim();
        if (!nombre) { alert('Ponle un nombre a la receta'); return; }
        const payload = {
            nombre,
            url_origen: document.getElementById('recipeUrl').value.trim(),
            tipo_comida: document.getElementById('recipeTipo').value,
            descripcion: document.getElementById('recipeNotas').value.trim(),
            apto_ninos: document.getElementById('recipeApto').checked,
            es_favorita: document.getElementById('recipeFav').checked,
        };
        const btn = document.getElementById('recipeAddBtn');
        try {
            if (btn) btn.disabled = true;
            const res = await fetch('/api/recipes', {
                method: 'POST', headers: this._headers(), body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!data.success) { alert(data.message || 'Error guardando'); return; }
            // Limpiar formulario
            document.getElementById('recipeNombre').value = '';
            document.getElementById('recipeUrl').value = '';
            document.getElementById('recipeNotas').value = '';
            document.getElementById('recipeFav').checked = false;
            document.getElementById('recipeApto').checked = true;
            await this.load();
        } catch (e) {
            console.error('[recipes] add error', e);
            alert('Error de red al guardar');
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async toggleFav(id, current) {
        try {
            await fetch(`/api/recipes/${id}`, {
                method: 'PUT', headers: this._headers(),
                body: JSON.stringify({ es_favorita: !current })
            });
            await this.load();
        } catch (e) { console.error('[recipes] fav error', e); }
    }

    async remove(id) {
        if (!confirm('¿Eliminar esta receta?')) return;
        try {
            await fetch(`/api/recipes/${id}`, { method: 'DELETE', headers: this._headers() });
            await this.load();
        } catch (e) { console.error('[recipes] delete error', e); }
    }

    _esc(s) {
        return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    render() {
        const list = document.getElementById('recipesList');
        if (!list) return;
        if (!this.recipes.length) {
            list.innerHTML = '<p style="color:#94a3b8;grid-column:1/-1;text-align:center;padding:24px;">Aún no hay recetas. Añade las que te gusten de Pinterest o donde sea — la IA las usará para acertar más con tu estilo de comida.</p>';
            return;
        }
        const tipoLabel = { desayuno:'Desayuno', comida:'Comida', merienda:'Merienda', cena:'Cena', postre:'Postre', cualquiera:'' };
        list.innerHTML = this.recipes.map(r => {
            const tipo = tipoLabel[r.tipo_comida] || '';
            const fav = r.es_favorita;
            const link = r.url_origen
                ? `<a href="${this._esc(r.url_origen)}" target="_blank" rel="noopener" style="color:#60a5fa;font-size:12px;text-decoration:none;">🔗 Ver receta</a>`
                : '';
            return `
            <div class="glass-card" style="padding:14px;display:flex;flex-direction:column;gap:8px;border:1px solid ${fav ? 'rgba(251,191,36,.4)' : 'rgba(51,65,85,.6)'};">
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                    <h3 style="margin:0;font-size:15px;color:#e2e8f0;line-height:1.3;">${fav ? '⭐ ' : ''}${this._esc(r.nombre)}</h3>
                    <button title="Eliminar" data-del="${r.id}" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:16px;line-height:1;padding:2px;">✕</button>
                </div>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                    ${tipo ? `<span style="font-size:11px;background:rgba(99,102,241,.15);color:#a5b4fc;padding:2px 8px;border-radius:10px;">${tipo}</span>` : ''}
                    ${r.apto_ninos ? '<span style="font-size:11px;background:rgba(34,197,94,.15);color:#4ade80;padding:2px 8px;border-radius:10px;">👶 Niños</span>' : ''}
                </div>
                ${r.descripcion ? `<p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.4;">${this._esc(r.descripcion)}</p>` : ''}
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:auto;">
                    ${link}
                    <button data-fav="${r.id}" data-favstate="${fav ? '1' : '0'}"
                        style="background:none;border:1px solid ${fav ? '#fbbf24' : '#475569'};color:${fav ? '#fbbf24' : '#94a3b8'};border-radius:6px;font-size:11px;padding:3px 8px;cursor:pointer;">
                        ${fav ? '★ Favorita' : '☆ Favorita'}
                    </button>
                </div>
            </div>`;
        }).join('');

        list.querySelectorAll('[data-del]').forEach(b =>
            b.addEventListener('click', () => this.remove(parseInt(b.dataset.del))));
        list.querySelectorAll('[data-fav]').forEach(b =>
            b.addEventListener('click', () => this.toggleFav(parseInt(b.dataset.fav), b.dataset.favstate === '1')));
    }
}

const recipesManager = new RecipesManager();

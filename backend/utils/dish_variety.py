"""
Detección de platos repetidos en un menú semanal.

El prompt pide "cero repeticiones", pero el modelo no siempre lo cumple
(sobre todo en desayunos y meriendas, o cuando se genera día a día).
Este módulo detecta las repeticiones de forma determinista para poder
pedir a la IA que sustituya SOLO esos huecos.
"""

import re
import unicodedata
from difflib import SequenceMatcher
from typing import Dict, Iterable, List, Optional, Tuple

DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
COMIDAS_ORDEN = ['desayuno', 'comida', 'merienda', 'cena']
SECCIONES = ('menu_adultos', 'menu_ninos')

# Palabras que no distinguen un plato de otro.
_STOPWORDS = {
    'a', 'al', 'con', 'de', 'del', 'el', 'en', 'la', 'las', 'los', 'y', 'e',
    'o', 'para', 'por', 'sobre', 'su', 'un', 'una', 'estilo', 'casero', 'casera',
    'caseros', 'caseras', 'suave', 'suaves', 'mini', 'version', 'ninos',
    'nino', 'adaptado', 'adaptada', 'facil', 'rapido', 'rapida',
}

SIMILARITY_THRESHOLD = 0.88


def dish_name(meal) -> str:
    """Nombre del plato en cualquiera de los formatos que ha tenido el JSON."""
    if not isinstance(meal, dict):
        return ''
    for key in ('plato', 'nombre', 'name'):
        if meal.get(key):
            return str(meal[key]).strip()
    # Formato antiguo de comida: primero + segundo
    partes = [str(meal[k]).strip() for k in ('primero', 'segundo') if meal.get(k)]
    return ' + '.join(partes)


def normalize(name: str) -> str:
    """minúsculas, sin acentos, sin puntuación ni palabras vacías."""
    if not name:
        return ''
    txt = unicodedata.normalize('NFKD', name.lower())
    txt = ''.join(c for c in txt if not unicodedata.combining(c))
    txt = re.sub(r'\([^)]*\)', ' ', txt)          # quitar aclaraciones entre paréntesis
    txt = re.sub(r'[^a-z0-9ñ ]+', ' ', txt)
    tokens = [t for t in txt.split() if t not in _STOPWORDS]
    return ' '.join(tokens)


def same_dish(a: str, b: str) -> bool:
    """True si dos nombres describen el mismo plato."""
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    ta, tb = set(na.split()), set(nb.split())
    if ta == tb:
        return True
    # "Tortilla española" vs "Tortilla española con ensalada"
    small, big = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    if len(small) >= 2 and small <= big:
        return True
    return SequenceMatcher(None, na, nb).ratio() >= SIMILARITY_THRESHOLD


def iter_slots(menu_data: Dict, section: str) -> Iterable[Tuple[str, str, str]]:
    """(dia, comida, plato) en orden cronológico."""
    bloque = (menu_data or {}).get(section) or {}
    dias = [d for d in DIAS_ORDEN if d in bloque] + [d for d in bloque if d not in DIAS_ORDEN]
    for dia in dias:
        comidas = bloque.get(dia) or {}
        if not isinstance(comidas, dict):
            continue
        orden = [c for c in COMIDAS_ORDEN if c in comidas] + [c for c in comidas if c not in COMIDAS_ORDEN]
        for comida in orden:
            nombre = dish_name(comidas.get(comida))
            if nombre:
                yield dia, comida, nombre


def find_repeats(menu_data: Dict, previous_dishes: Optional[List[str]] = None,
                 sections: Iterable[str] = SECCIONES,
                 only_days: Optional[Iterable[str]] = None) -> List[Dict]:
    """
    Devuelve los huecos que repiten un plato.

    - Dentro de la semana (por sección): la PRIMERA aparición se queda,
      las siguientes se marcan para sustituir.
    - Contra semanas anteriores: cualquier coincidencia se marca.
    - only_days: limita qué días pueden marcarse (los demás siguen
      contando como "ya usados"). Útil al generar un solo día.
    """
    previous = [p for p in (previous_dishes or []) if p]
    only = set(only_days) if only_days else None
    repeats = []
    for section in sections:
        vistos: List[Tuple[str, str, str]] = []
        slots = list(iter_slots(menu_data, section))
        if only:
            # Los días fijos van primero: el día nuevo es el que debe cambiar.
            slots = [s for s in slots if s[0] not in only] + [s for s in slots if s[0] in only]
        for dia, comida, nombre in slots:
            marcable = only is None or dia in only
            choque = next((v for v in vistos if same_dish(nombre, v[2])), None)
            if marcable and choque:
                repeats.append({
                    'section': section, 'dia': dia, 'comida': comida, 'plato': nombre,
                    'motivo': f'repite "{choque[2]}" ({choque[0]} {choque[1]})',
                })
            elif marcable and any(same_dish(nombre, p) for p in previous):
                repeats.append({
                    'section': section, 'dia': dia, 'comida': comida, 'plato': nombre,
                    'motivo': 'ya se cocinó en semanas anteriores',
                })
            vistos.append((dia, comida, nombre))
    return repeats


def used_dishes(menu_data: Dict, section: str) -> List[str]:
    return list(dict.fromkeys(n for _, _, n in iter_slots(menu_data, section)))

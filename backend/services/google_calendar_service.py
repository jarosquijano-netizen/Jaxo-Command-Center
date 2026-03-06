import json
import os
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from datetime import datetime, date

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from config import Config


SCOPES = [
    'https://www.googleapis.com/auth/calendar'
]


def _safe_load_json(text: str) -> Dict:
    try:
        return json.loads(text)
    except Exception as e:
        raise ValueError(f'Google Credentials no es JSON válido: {e}')


def _normalize_client_config(raw: Dict) -> Dict:
    if 'installed' in raw or 'web' in raw:
        return raw

    if raw.get('type') == 'service_account':
        raise ValueError('Para sincronizar un calendario personal necesitas OAuth Client ("installed" o "web"), no service_account.')

    raise ValueError('Google Credentials inválido. Debe ser un OAuth Client JSON con clave "installed" o "web".')


@dataclass
class GoogleConnectionStatus:
    connected: bool
    has_credentials_json: bool
    token_path: str


class GoogleCalendarService:
    def __init__(self):
        self._token_path = str(Config.GOOGLE_TOKEN_PATH)
        self._state_path = os.path.join(str(Config.TOKENS_DIR), 'google_oauth_state.json')

    def get_connection_status(self) -> Dict:
        return GoogleConnectionStatus(
            connected=self._has_valid_token(),
            has_credentials_json=bool(os.path.exists(str(Config.GOOGLE_CREDENTIALS_PATH))),
            token_path=self._token_path,
        ).__dict__

    def _has_valid_token(self) -> bool:
        creds = self._load_credentials_if_any()
        return bool(creds and creds.valid)

    def _load_credentials_if_any(self) -> Optional[Credentials]:
        if not os.path.exists(self._token_path):
            return None

        try:
            creds = Credentials.from_authorized_user_file(self._token_path, SCOPES)
        except Exception:
            return None

        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                self._save_token(creds)
            except Exception:
                return None

        return creds

    def _save_token(self, creds: Credentials) -> None:
        with open(self._token_path, 'w', encoding='utf-8') as f:
            f.write(creds.to_json())

    def _save_state(self, state: str, redirect_uri: str) -> None:
        payload = {
            'state': state,
            'redirect_uri': redirect_uri,
        }
        with open(self._state_path, 'w', encoding='utf-8') as f:
            json.dump(payload, f)

    def _load_state(self) -> Tuple[Optional[str], Optional[str]]:
        if not os.path.exists(self._state_path):
            return None, None
        try:
            with open(self._state_path, 'r', encoding='utf-8') as f:
                payload = json.load(f)
            return payload.get('state'), payload.get('redirect_uri')
        except Exception:
            return None, None

    def _build_flow(self, google_credentials_json: str, redirect_uri: str, state: Optional[str] = None) -> Flow:
        raw = _safe_load_json(google_credentials_json)
        client_config = _normalize_client_config(raw)

        flow = Flow.from_client_config(
            client_config=client_config,
            scopes=SCOPES,
            state=state,
        )
        flow.redirect_uri = redirect_uri
        return flow

    def get_authorization_url(self, google_credentials_json: str, redirect_uri: str) -> Tuple[str, str]:
        flow = self._build_flow(google_credentials_json, redirect_uri)
        auth_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
        )
        self._save_state(state, redirect_uri)
        return auth_url, state

    def exchange_code_for_token(
        self,
        google_credentials_json: str,
        redirect_uri: Optional[str],
        authorization_response: str,
        state: Optional[str] = None,
    ) -> None:
        if not redirect_uri:
            _, redirect_uri = self._load_state()
        if not redirect_uri:
            raise ValueError('No se encontró redirect_uri para OAuth. Vuelve a iniciar la conexión.')

        if not state:
            state, _ = self._load_state()

        flow = self._build_flow(google_credentials_json, redirect_uri, state=state)
        flow.fetch_token(authorization_response=authorization_response)
        creds = flow.credentials
        if not creds:
            raise ValueError('No se pudo obtener token OAuth de Google')
        self._save_token(creds)

    def disconnect(self) -> None:
        if os.path.exists(self._token_path):
            os.remove(self._token_path)
        if os.path.exists(self._state_path):
            os.remove(self._state_path)

    def _get_calendar_service(self):
        creds = self._load_credentials_if_any()
        if not creds or not creds.valid:
            raise ValueError('Google Calendar no está conectado. Pulsa Conectar en Configuración.')
        return build('calendar', 'v3', credentials=creds)

    def list_calendars(self) -> List[Dict]:
        service = self._get_calendar_service()
        result = service.calendarList().list().execute()
        items = result.get('items', [])
        return [
            {
                'id': c.get('id'),
                'summary': c.get('summary'),
                'primary': bool(c.get('primary')),
                'accessRole': c.get('accessRole'),
            }
            for c in items
        ]

    def create_event(self, calendar_id: str, event_body: Dict) -> str:
        service = self._get_calendar_service()
        created = service.events().insert(calendarId=calendar_id, body=event_body).execute()
        return created.get('id')

    def update_event(self, calendar_id: str, event_id: str, event_body: Dict) -> None:
        service = self._get_calendar_service()
        service.events().update(calendarId=calendar_id, eventId=event_id, body=event_body).execute()

    def list_events(self, calendar_id: str, from_date: date, to_date: date) -> List[Dict]:
        service = self._get_calendar_service()
        time_min = datetime.combine(from_date, datetime.min.time()).isoformat() + 'Z'
        time_max = datetime.combine(to_date, datetime.max.time()).isoformat() + 'Z'
        result = service.events().list(
            calendarId=calendar_id,
            timeMin=time_min,
            timeMax=time_max,
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        items = result.get('items', [])
        events = []
        for e in items:
            start = e.get('start', {})
            end = e.get('end', {})
            events.append({
                'id': e.get('id'),
                'summary': e.get('summary'),
                'description': e.get('description'),
                'location': e.get('location'),
                'status': e.get('status'),
                'all_day': 'date' in start,
                'start_datetime': start.get('dateTime') or start.get('date'),
                'end_datetime': end.get('dateTime') or end.get('date'),
                'updated': e.get('updated'),
            })
        return events


google_calendar_service = GoogleCalendarService()

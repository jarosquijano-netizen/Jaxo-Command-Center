"""
Voice transcription endpoint — uses OpenAI Whisper
"""

from flask import Blueprint, request, jsonify
from models.settings import Settings
import tempfile
import os

voice_bp = Blueprint('voice', __name__)


@voice_bp.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio blob using OpenAI Whisper"""
    try:
        settings = Settings.query.first()
        if not settings or not settings.openai_api_key:
            return jsonify({
                'success': False,
                'message': 'OpenAI API key no configurada. Añádela en Configuración → API Keys.'
            }), 400

        if 'audio' not in request.files:
            return jsonify({'success': False, 'message': 'No se recibió audio'}), 400

        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'success': False, 'message': 'Archivo de audio vacío'}), 400

        # Write to temp file preserving extension for Whisper MIME detection
        suffix = '.webm'
        content_type = audio_file.content_type or ''
        if 'ogg' in content_type:
            suffix = '.ogg'
        elif 'wav' in content_type:
            suffix = '.wav'
        elif 'mp4' in content_type or 'mpeg' in content_type:
            suffix = '.mp4'

        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            audio_file.save(tmp.name)
            tmp_path = tmp.name

        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.openai_api_key)

            with open(tmp_path, 'rb') as f:
                response = client.audio.transcriptions.create(
                    model='whisper-1',
                    file=f,
                    language='es',
                    response_format='text'
                )

            transcript = response.strip() if isinstance(response, str) else str(response).strip()
            return jsonify({'success': True, 'transcript': transcript})

        finally:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    except Exception as e:
        error_msg = str(e)
        if 'api_key' in error_msg.lower() or 'authentication' in error_msg.lower():
            error_msg = 'OpenAI API key inválida. Verifica la clave en Configuración.'
        elif 'quota' in error_msg.lower():
            error_msg = 'Cuota de OpenAI agotada. Revisa tu cuenta.'
        return jsonify({'success': False, 'message': error_msg}), 500

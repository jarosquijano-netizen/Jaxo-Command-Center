"""
Voice transcription endpoint — uses OpenAI Whisper
"""

from flask import Blueprint, request, jsonify, current_app
import tempfile
import os

voice_bp = Blueprint('voice', __name__)


@voice_bp.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio blob using OpenAI Whisper"""
    try:
        api_key = current_app.config.get('OPENAI_API_KEY')
        if not api_key:
            return jsonify({
                'success': False,
                'message': 'OPENAI_API_KEY no configurada. Añádela como variable de entorno en Railway.'
            }), 400

        if 'audio' not in request.files:
            return jsonify({'success': False, 'message': 'No se recibió audio'}), 400

        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'success': False, 'message': 'Archivo de audio vacío'}), 400

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
            client = OpenAI(api_key=api_key)

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
            error_msg = 'OPENAI_API_KEY inválida. Verifica la variable de entorno en Railway.'
        elif 'quota' in error_msg.lower():
            error_msg = 'Cuota de OpenAI agotada. Revisa tu cuenta.'
        return jsonify({'success': False, 'message': error_msg}), 500

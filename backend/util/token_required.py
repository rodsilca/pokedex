import jwt
from flask import request, jsonify, current_app
from functools import wraps
from models.user_model import Usuario

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('x-access-token')
        if not token:
            return jsonify({'message': 'Token de acesso não fornecido!'}), 401
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = Usuario.query.get(data['id_usuario'])
        except Exception as e:
            return jsonify({'message': 'Token inválido ou expirado!', 'error': str(e)}), 401
        return f(current_user, *args, **kwargs)
    return decorated
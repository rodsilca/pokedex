from flask import Blueprint, jsonify, request, current_app
from models import db
from models.user_model import Usuario
import jwt
from datetime import datetime, timezone

bp = Blueprint('auth_routes',__name__)

@bp.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    if Usuario.query.filter_by(login=data['login']).first() or Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Login ou e-mail já em uso.'}), 409
    novo_usuario = Usuario(nome=data['nome'], login=data['login'], email=data['email'])
    novo_usuario.set_password(data['senha'])
    db.session.add(novo_usuario)
    db.session.commit()
    return jsonify({'message': 'Novo usuário registrado com sucesso!'}), 201

@bp.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    user = Usuario.query.filter_by(login=data['login']).first()
    if not user or not user.check_password(data['senha']):
        return jsonify({'message': 'Credenciais inválidas!'}), 401
    token = jwt.encode({'id_usuario': user.id_usuario, 'exp': datetime.now(timezone.utc) + datetime.timedelta(hours=24)}, current_app.config['SECRET_KEY'], algorithm='HS256')
    return jsonify({'token': token, 'user': {'id': user.id_usuario, 'nome': user.nome, 'login': user.login}})

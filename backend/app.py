# -*- coding: utf-8 -*-
import requests
import datetime
import jwt
from functools import wraps
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt

# --- CONFIGURAÇÃO INICIAL ---
app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pokedex.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'sua-chave-secreta-super-segura' # Troque por uma chave segura em produção

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# --- MODELAGEM DO BANCO DE DADOS (ATUALIZADA) ---

pokemon_tipo_association = db.Table('pokemon_tipo',
    db.Column('pokemon_id', db.Integer, db.ForeignKey('pokemon_usuario.id_pokemon_usuario'), primary_key=True),
    db.Column('tipo_id', db.Integer, db.ForeignKey('tipo_pokemon.id_tipo_pokemon'), primary_key=True)
)

class Usuario(db.Model):
    __tablename__ = 'usuario'
    id_usuario = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    login = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    senha = db.Column(db.String(200), nullable=False)
    pokemons = db.relationship('PokemonUsuario', backref='usuario', lazy=True)

    def set_password(self, password):
        self.senha = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.senha, password)

class PokemonUsuario(db.Model):
    # ... (nenhuma mudança neste modelo) ...
    __tablename__ = 'pokemon_usuario'
    id_pokemon_usuario = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'), nullable=False)
    codigo = db.Column(db.String(50), nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    imagem_url = db.Column(db.String(255))
    grupo_batalha = db.Column(db.Boolean, default=False)
    favorito = db.Column(db.Boolean, default=False)
    tipos = db.relationship('TipoPokemon', secondary=pokemon_tipo_association, lazy='subquery',
                            backref=db.backref('pokemons', lazy=True))

class TipoPokemon(db.Model):
    # ... (nenhuma mudança neste modelo) ...
    __tablename__ = 'tipo_pokemon'
    id_tipo_pokemon = db.Column(db.Integer, primary_key=True)
    descricao = db.Column(db.String(50), unique=True, nullable=False)


# --- DECORATOR PARA AUTENTICAÇÃO ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'x-access-token' in request.headers:
            token = request.headers['x-access-token']
        
        if not token:
            return jsonify({'message': 'Token de acesso não fornecido!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = Usuario.query.get(data['id_usuario'])
        except Exception as e:
            return jsonify({'message': 'Token é inválido ou expirado!', 'error': str(e)}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated


# --- ROTAS DA API (ATUALIZADAS) ---

@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    
    # Verifica se o login ou email já existem
    if Usuario.query.filter_by(login=data['login']).first():
        return jsonify({'message': 'Este login já está em uso.'}), 409
    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Este e-mail já está cadastrado.'}), 409

    novo_usuario = Usuario(
        nome=data['nome'],
        login=data['login'],
        email=data['email']
    )
    novo_usuario.set_password(data['senha'])
    
    db.session.add(novo_usuario)
    db.session.commit()
    
    return jsonify({'message': 'Novo usuário registrado com sucesso!'}), 201

@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    user = Usuario.query.filter_by(login=data['login']).first()
    
    if not user or not user.check_password(data['senha']):
        return jsonify({'message': 'Credenciais inválidas! Verifique seu login e senha.'}), 401
        
    # Gera o token JWT
    token = jwt.encode({
        'id_usuario': user.id_usuario,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24) # Token expira em 24 horas
    }, app.config['SECRET_KEY'], algorithm='HS256')
    
    return jsonify({
        'token': token,
        'user': {
            'id': user.id_usuario,
            'nome': user.nome,
            'login': user.login
        }
    })

@app.route('/api/pokemon', methods=['GET'])
@token_required # <- Protegendo a rota de Pokémon
def get_pokemon_list(current_user):
    try:
        limit = request.args.get('limit', 151)
        offset = request.args.get('offset', 0)
        pokeapi_url = f"https://pokeapi.co/api/v2/pokemon?limit={limit}&offset={offset}"
        response = requests.get(pokeapi_url)
        response.raise_for_status()
        
        data = response.json()
        pokemon_list = []
        for pokemon in data.get('results', []):
            pokemon_id = pokemon['url'].split('/')[-2]
            pokemon_image_url = f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{pokemon_id}.png"
            pokemon_list.append({
                'name': pokemon['name'],
                'id': pokemon_id,
                'imageUrl': pokemon_image_url
            })
            
        return jsonify(pokemon_list)

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Erro ao acessar a PokéAPI: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"Ocorreu um erro inesperado: {e}"}), 500

# --- EXECUÇÃO DA APLICAÇÃO ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)

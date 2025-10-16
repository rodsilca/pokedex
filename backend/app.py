# import requests
# import datetime
# import jwt
# from functools import wraps
# from flask import Flask, jsonify, request
# from flask_sqlalchemy import SQLAlchemy
# from flask_cors import CORS
# from flask_bcrypt import Bcrypt
# from sqlalchemy import and_
# from concurrent.futures import ThreadPoolExecutor, as_completed
# from config import Config
# from models import db

from flask import Flask
from flask_cors import CORS
from config import Config
from models import db, bcrypt
from routes import auth_routes, pokemon_routes, user_routes

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app)
    db.init_app(app)
    bcrypt.init_app(app)

    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(pokemon_routes.bp)
    app.register_blueprint(user_routes.bp)

    with app.app_context():
        db.create_all()

    return app



# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pokedex.db'
# app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# app.config['SECRET_KEY'] = 'sua-chave-secreta-super-segura'


# pokemon_tipo_association = db.Table('pokemon_tipo',
#     db.Column('pokemon_id', db.Integer, db.ForeignKey('pokemon_usuario.id_pokemon_usuario'), primary_key=True),
#     db.Column('tipo_id', db.Integer, db.ForeignKey('tipo_pokemon.id_tipo_pokemon'), primary_key=True)
# )

# class Usuario(db.Model):
#     __tablename__ = 'usuario'
#     id_usuario = db.Column(db.Integer, primary_key=True)
#     nome = db.Column(db.String(100), nullable=False)
#     login = db.Column(db.String(50), unique=True, nullable=False)
#     email = db.Column(db.String(100), unique=True, nullable=False)
#     senha = db.Column(db.String(200), nullable=False)
#     pokemons = db.relationship('PokemonUsuario', backref='usuario', lazy=True)

#     def set_password(self, password):
#         self.senha = bcrypt.generate_password_hash(password).decode('utf-8')

#     def check_password(self, password):
#         return bcrypt.check_password_hash(self.senha, password)

# class PokemonUsuario(db.Model):
#     __tablename__ = 'pokemon_usuario'
#     id_pokemon_usuario = db.Column(db.Integer, primary_key=True)
#     id_usuario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'), nullable=False)
#     codigo = db.Column(db.String(50), nullable=False)
#     nome = db.Column(db.String(100), nullable=False)
#     imagem_url = db.Column(db.String(255))
#     grupo_batalha = db.Column(db.Boolean, default=False)
#     favorito = db.Column(db.Boolean, default=False)
#     tipos = db.relationship('TipoPokemon', secondary=pokemon_tipo_association, lazy='subquery', backref=db.backref('pokemons', lazy=True))

# class TipoPokemon(db.Model):
#     __tablename__ = 'tipo_pokemon'
#     id_tipo_pokemon = db.Column(db.Integer, primary_key=True)
#     descricao = db.Column(db.String(50), unique=True, nullable=False)

# def token_required(f):
#     @wraps(f)
#     def decorated(*args, **kwargs):
#         token = request.headers.get('x-access-token')
#         if not token:
#             return jsonify({'message': 'Token de acesso não fornecido!'}), 401
#         try:
#             data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
#             current_user = Usuario.query.get(data['id_usuario'])
#         except Exception as e:
#             return jsonify({'message': 'Token é inválido ou expirado!', 'error': str(e)}), 401
#         return f(current_user, *args, **kwargs)
#     return decorated

# @app.route('/api/register', methods=['POST'])
# def register_user():
#         data = request.get_json()
#         if Usuario.query.filter_by(login=data['login']).first() or Usuario.query.filter_by(email=data['email']).first():
#             return jsonify({'message': 'Login ou e-mail já em uso.'}), 409
#         novo_usuario = Usuario(nome=data['nome'], login=data['login'], email=data['email'])
#         novo_usuario.set_password(data['senha'])
#         db.session.add(novo_usuario)
#         db.session.commit()
#         return jsonify({'message': 'Novo usuário registrado com sucesso!'}), 201

# @app.route('/api/login', methods=['POST'])
# def login_user():
#     data = request.get_json()
#     user = Usuario.query.filter_by(login=data['login']).first()
#     if not user or not user.check_password(data['senha']):
#         return jsonify({'message': 'Credenciais inválidas!'}), 401
#     token = jwt.encode({'id_usuario': user.id_usuario, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)}, app.config['SECRET_KEY'], algorithm='HS256')
#     return jsonify({'token': token, 'user': {'id': user.id_usuario, 'nome': user.nome, 'login': user.login}})

# def fetch_pokemon_details(url):
#     try:
#         detail_response = requests.get(url, timeout=10)
#         detail_response.raise_for_status()
#         pokemon_details = detail_response.json()
#         types = [t['type']['name'] for t in pokemon_details['types']]
#         return {
#             'name': pokemon_details['name'],
#             'id': pokemon_details['id'], 
#             'imageUrl': pokemon_details['sprites']['other']['official-artwork']['front_default'],
#             'types': types
#         }
#     except requests.exceptions.RequestException:
#         return None

# @app.route('/api/pokemon', methods=['GET'])
# @token_required
# def get_pokemon_list(current_user):
#     try:
#         limit = request.args.get('limit', 20)
#         offset = request.args.get('offset', 0)
#         pokeapi_url = f"https://pokeapi.co/api/v2/pokemon?limit={limit}&offset={offset}"
#         response = requests.get(pokeapi_url)
#         response.raise_for_status()
        
#         data = response.json()
#         pokemon_urls = [p['url'] for p in data.get('results', [])]
#         pokemon_list = []
        
#         with ThreadPoolExecutor(max_workers=20) as executor:
#             future_to_url = {executor.submit(fetch_pokemon_details, url): url for url in pokemon_urls}
#             for future in as_completed(future_to_url):
#                 result = future.result()
#                 if result:
#                     pokemon_list.append(result)
        
#         pokemon_list.sort(key=lambda p: p['id'])

#         for p in pokemon_list:
#             p['id'] = str(p['id'])

#         return jsonify(pokemon_list)

#     except requests.exceptions.RequestException as e:
#         return jsonify({"error": f"Erro ao acessar a PokéAPI: {e}"}), 500
#     except Exception as e:
#         return jsonify({"error": f"Ocorreu um erro inesperado: {e}"}), 500
    

# @app.route('/api/pokemon/<string:name>', methods=['GET'])
# @token_required
# def get_pokemon_by_name(current_user, name):
#     try:
#         url = f"https://pokeapi.co/api/v2/pokemon/{name.lower()}"
#         response = requests.get(url, timeout=10)
#         if response.status_code == 404:
#             return jsonify({"message": "Pokémon não encontrado."}), 404
#         response.raise_for_status()
        
#         pokemon_details = response.json()
#         types = [t['type']['name'] for t in pokemon_details['types']]
#         pokemon_data = {
#             'name': pokemon_details['name'],
#             'id': str(pokemon_details['id']),
#             'imageUrl': pokemon_details['sprites']['other']['official-artwork']['front_default'],
#             'types': types
#         }
#         return jsonify(pokemon_data)
#     except requests.exceptions.RequestException as e:
#         return jsonify({"error": f"Erro ao buscar na PokéAPI: {e}"}), 500
#     except Exception as e:
#         return jsonify({"error": f"Ocorreu um erro inesperado: {e}"}), 500

# @app.route('/api/user/pokemons', methods=['GET'])
# @token_required
# def get_user_pokemons(current_user):
#     user_pokemons = PokemonUsuario.query.filter_by(id_usuario=current_user.id_usuario).all()
#     output = [{'codigo': p.codigo, 'nome': p.nome, 'favorito': p.favorito, 'grupo_batalha': p.grupo_batalha} for p in user_pokemons]
#     return jsonify(output)

# @app.route('/api/user/pokemons', methods=['POST'])
# @token_required
# def update_user_pokemon(current_user):
#     data = request.get_json()
#     if not data or 'codigo' not in data or 'nome' not in data:
#         return jsonify({'message': 'Dados incompletos.'}), 400

#     pokemon = PokemonUsuario.query.filter_by(id_usuario=current_user.id_usuario, codigo=data['codigo']).first()
#     if not pokemon:
#         pokemon = PokemonUsuario(id_usuario=current_user.id_usuario, codigo=data['codigo'], nome=data['nome'], imagem_url=data.get('imagem_url', ''))
#         db.session.add(pokemon)

#     if 'favorito' in data:
#         pokemon.favorito = data['favorito']
#     if 'grupo_batalha' in data:
#         if data['grupo_batalha']:
#             team_count = PokemonUsuario.query.filter(and_(PokemonUsuario.id_usuario == current_user.id_usuario, PokemonUsuario.grupo_batalha == True, PokemonUsuario.codigo != data['codigo'])).count()
#             if team_count >= 6:
#                 return jsonify({'message': 'O time de batalha já está cheio (limite de 6 Pokémon).'}), 409
#         pokemon.grupo_batalha = data['grupo_batalha']

#     db.session.commit()
#     return jsonify({'message': 'Pokémon atualizado com sucesso!', 'pokemon': {'codigo': pokemon.codigo, 'favorito': pokemon.favorito, 'grupo_batalha': pokemon.grupo_batalha}}), 200


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)


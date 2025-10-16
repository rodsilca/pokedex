from flask import Blueprint, jsonify, request
from models import db
from models.pokemon_model import PokemonUsuario
from sqlalchemy import and_
from util.token_required import token_required

bp = Blueprint('user_routes', __name__)

@bp.route('/api/user/pokemons', methods=['GET'])
@token_required
def get_user_pokemons(current_user):
    user_pokemons = PokemonUsuario.query.filter_by(id_usuario=current_user.id_usuario).all()
    output = [{'codigo': p.codigo, 'nome': p.nome, 'favorito': p.favorito, 'grupo_batalha': p.grupo_batalha} for p in user_pokemons]
    return jsonify(output)

@bp.route('/api/user/pokemons', methods=['POST'])
@token_required
def update_user_pokemon(current_user):
    data = request.get_json()
    if not data or 'codigo' not in data or 'nome' not in data:
        return jsonify({'message': 'Dados incompletos.'}), 400

    pokemon = PokemonUsuario.query.filter_by(id_usuario=current_user.id_usuario, codigo=data['codigo']).first()
    if not pokemon:
        pokemon = PokemonUsuario(id_usuario=current_user.id_usuario, codigo=data['codigo'], nome=data['nome'], imagem_url=data.get('imagem_url', ''))
        db.session.add(pokemon)

    if 'favorito' in data:
        pokemon.favorito = data['favorito']
    if 'grupo_batalha' in data:
        if data['grupo_batalha']:
            team_count = PokemonUsuario.query.filter(and_(PokemonUsuario.id_usuario == current_user.id_usuario, PokemonUsuario.grupo_batalha == True, PokemonUsuario.codigo != data['codigo'])).count()
            if team_count >= 6:
                return jsonify({'message': 'O time de batalha já está cheio (limite de 6 Pokémon).'}), 409
        pokemon.grupo_batalha = data['grupo_batalha']

    db.session.commit()
    return jsonify({'message': 'Pokémon atualizado com sucesso!', 'pokemon': {'codigo': pokemon.codigo, 'favorito': pokemon.favorito, 'grupo_batalha': pokemon.grupo_batalha}}), 200
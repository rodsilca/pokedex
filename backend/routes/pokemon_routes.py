from util.helpers import fetch_pokemon_details
from util.token_required import token_required
from flask import Blueprint, jsonify, request
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

bp = Blueprint('pokemon_routes',__name__)
@bp.route('/api/pokemon', methods=['GET'])
@token_required
def get_pokemon_list(current_user):
    try:
        limit = request.args.get('limit', 20)
        offset = request.args.get('offset', 0)
        pokeapi_url = f"https://pokeapi.co/api/v2/pokemon?limit={limit}&offset={offset}"
        response = requests.get(pokeapi_url)
        response.raise_for_status()
        
        data = response.json()
        pokemon_urls = [p['url'] for p in data.get('results', [])]
        pokemon_list = []
        
        with ThreadPoolExecutor(max_workers=20) as executor:
            future_to_url = {executor.submit(fetch_pokemon_details, url): url for url in pokemon_urls}
            for future in as_completed(future_to_url):
                result = future.result()
                if result:
                    pokemon_list.append(result)
        
        pokemon_list.sort(key=lambda p: p['id'])

        for p in pokemon_list:
            p['id'] = str(p['id'])

        return jsonify(pokemon_list)

    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Erro ao acessar a PokéAPI: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"Ocorreu um erro inesperado: {e}"}), 500
    
@bp.route('/api/pokemon/<string:name>', methods=['GET'])
@token_required
def get_pokemon_by_name(current_user, name):
    try:
        url = f"https://pokeapi.co/api/v2/pokemon/{name.lower()}"
        response = requests.get(url, timeout=10)
        if response.status_code == 404:
            return jsonify({"message": "Pokémon não encontrado."}), 404
        response.raise_for_status()
        
        pokemon_details = response.json()
        types = [t['type']['name'] for t in pokemon_details['types']]
        pokemon_data = {
            'name': pokemon_details['name'],
            'id': str(pokemon_details['id']),
            'imageUrl': pokemon_details['sprites']['other']['official-artwork']['front_default'],
            'types': types
        }
        return jsonify(pokemon_data)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Erro ao buscar na PokéAPI: {e}"}), 500
    except Exception as e:
        return jsonify({"error": f"Ocorreu um erro inesperado: {e}"}), 500

    
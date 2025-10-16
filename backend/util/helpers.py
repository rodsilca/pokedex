import requests

def fetch_pokemon_details(url):
    try:
        detail_response = requests.get(url, timeout=10)
        detail_response.raise_for_status()
        pokemon_details = detail_response.json()
        types = [t['type']['name'] for t in pokemon_details['types']]
        return {
            'name': pokemon_details['name'],
            'id': pokemon_details['id'], 
            'imageUrl': pokemon_details['sprites']['other']['official-artwork']['front_default'],
            'types': types
        }
    except requests.exceptions.RequestException:
        return None
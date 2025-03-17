import os
import re
import google.oauth2.credentials
import google_auth_oauthlib.flow
import googleapiclient.discovery
import googleapiclient.errors
from datetime import datetime

# Configuración de OAuth 2.0 con scopes actualizados
SCOPES = [
    'https://www.googleapis.com/auth/youtube',  # Acceso completo a YouTube (lectura y escritura)
    'https://www.googleapis.com/auth/youtube.readonly',  # Solo lectura
]
API_SERVICE_NAME = 'youtube'
API_VERSION = 'v3'
CLIENT_SECRETS_FILE = 'client_secret.json'

def get_authenticated_service():
    """Obtiene un servicio autenticado de YouTube."""
    try:
        flow = google_auth_oauthlib.flow.InstalledAppFlow.from_client_secrets_file(
            CLIENT_SECRETS_FILE, SCOPES)
        credentials = flow.run_local_server(port=8080, access_type='offline', prompt='select_account')
        return googleapiclient.discovery.build(
            API_SERVICE_NAME, API_VERSION, credentials=credentials)
    except googleapiclient.errors.HttpError as e:
        print(f"Error de autenticación: {e}")
        return None
    except Exception as e:
        print(f"Error inesperado durante la autenticación: {e}")
        return None

def get_playlist_videos(youtube, playlist_id):
    """Obtiene todos los videos de una playlist."""
    if not youtube:
        return []  # Retorna una lista vacía si la autenticación falla

    videos = []
    next_page_token = None

    try:
        while True:
            request = youtube.playlistItems().list(
                part="snippet,contentDetails",
                playlistId=playlist_id,
                maxResults=50,
                pageToken=next_page_token
            )
            response = request.execute()

            for item in response['items']:
                video_id = item['contentDetails']['videoId']
                title = item['snippet']['title']
                position = item['snippet']['position']
                videos.append({
                    'id': video_id,
                    'title': title,
                    'position': position,
                    'item_id': item['id']
                })

            next_page_token = response.get('nextPageToken')
            if not next_page_token:
                break

        return videos
    except googleapiclient.errors.HttpError as e:
        print(f"Error al obtener videos de la playlist: {e}")
        return []
    except Exception as e:
        print(f"Error inesperado al obtener videos: {e}")
        return []

def extract_date_from_title(title):
    """Extrae la fecha del título en formato '2024 12 19 18 25 12'."""
    pattern = r'(\d{4})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})'
    match = re.search(pattern, title)

    if match:
        year, month, day, hour, minute, second = map(int, match.groups())
        return datetime(year, month, day, hour, minute, second)
    return None

def sort_videos_by_date(videos):
    """Ordena los videos por fecha, los más antiguos primero."""
    dated_videos = []
    undated_videos = []

    for video in videos:
        date = extract_date_from_title(video['title'])
        if date:
            dated_videos.append((date, video))
        else:
            undated_videos.append(video)

    dated_videos.sort(key=lambda x: x[0])
    return [video for _, video in dated_videos] + undated_videos

def update_playlist_order(youtube, playlist_id, sorted_videos):
    """Actualiza el orden de los videos en la playlist."""
    if not youtube:
        return

    try:
        for position, video in enumerate(sorted_videos):
            request = youtube.playlistItems().update(
                part="snippet",
                body={
                    "id": video['item_id'],
                    "snippet": {
                        "playlistId": playlist_id,
                        "position": position,
                        "resourceId": {
                            "kind": "youtube#video",
                            "videoId": video['id']
                        }
                    }
                }
            )
            response = request.execute()
            print(f"Video '{video['title']}' movido a la posición {position}")
    except googleapiclient.errors.HttpError as e:
        print(f"Error al actualizar la playlist: {e}")
    except Exception as e:
        print(f"Error inesperado al actualizar la playlist: {e}")

def main():
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

    youtube = get_authenticated_service()

    if not youtube:
        print("La autenticación falló. El programa se cerrará.")
        return

    print("Autenticación exitosa. Ahora ingrese el ID de la playlist de YouTube.")  # Añadido para asegurar que el mensaje aparezca

    playlist_id = input("Ingrese el ID de la playlist de YouTube: ")

    videos = get_playlist_videos(youtube, playlist_id)
    if not videos:
        print("No se pudieron obtener los videos de la playlist. El programa se cerrará.")
        return

    sorted_videos = sort_videos_by_date(videos)

    update_playlist_order(youtube, playlist_id, sorted_videos)

    print("¡Proceso completado! Los videos han sido ordenados permanentemente.")

if __name__ == "__main__":
    main()

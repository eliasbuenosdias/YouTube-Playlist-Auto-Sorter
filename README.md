# YouTube-Playlist-Auto-Sorter

Script para ordenar videos de más antiguo a más nuevo con formato:

yy/mm/hh/ss

Example: 2024 12 19 18 25 12

v1: Los cambios desaparecen si deshabilito el script.

Instrucciones:

1. Ir a la playlist: https://www.youtube.com/playlist?list=
2. Ejecutar script con Tampermonkey

v2: Cambios permancen despues de la finalizacion del script. (Api google)

1. Habilitar YouTube Data API v3 (https://console.cloud.google.com)
2. Crear Credenciales
3. Descargar json con los credenciales
4. Renombrar fichero a client_secret.json
5. Guardar el fichero en la carpeta del proyecto
6. ```python
   pip install google-auth google-auth-oauthlib google-api-python-client
   ```
7. Ejecutar script python
8. Se inicia una ventana en el navegador le damos los permisos que pide.
9. En la terminal pedira el id de la playlist: https://www.youtube.com/playlist?list=ID
10. Empieza el funcionamiento..

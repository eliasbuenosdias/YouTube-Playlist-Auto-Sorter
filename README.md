# YouTube-Playlist-Auto-Sorter

🎬 Script para ordenar videos de YouTube desde el más antiguo al más nuevo, utilizando un formato de fecha: yy/mm/dd/hh/mm/ss.

Ejemplo: 2024 12 19 18 25 12

Versiones

v1: 🔄 Los cambios desaparecen si desactivas el script.

v2: ✅ Los cambios permanecen incluso después de finalizar el script, gracias a la integración con la API de Google.

Instrucciones

Versión 1: (Sin API de Google)

Dirígete a tu lista de reproducción en YouTube:
https://www.youtube.com/playlist?list=ID

Ejecuta el script usando Tampermonkey.

Versión 2: (Con API de Google)

Para guardar los cambios de forma permanente, sigue estos pasos:

🌐 Habilita la YouTube Data API v3 en la consola de Google:

https://console.cloud.google.com

🛠️ Crea credenciales en la consola de Google.

📥 Descarga el archivo .json con las credenciales.

✏️ Renombra el archivo descargado a client_secret.json.

📂 Guarda el archivo en la carpeta del proyecto.

🔧 Instala las librerías necesarias con el siguiente comando en tu terminal:

```python
pip install google-auth google-auth-oauthlib google-api-python-client
```

▶️ Ejecuta el script de Python.

🌍 Se abrirá una ventana en el navegador. Acepta los permisos que solicita.

📝 En la terminal, se te pedirá que ingreses el ID de la lista de reproducción (enlace: https://www.youtube.com/playlist?list=ID).

🚀 ¡Listo! El script comenzará a ordenar los videos de la lista de reproducción.

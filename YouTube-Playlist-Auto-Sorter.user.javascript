// ==UserScript==
// @name         YouTube Playlist Auto-Sorter
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Ordena automáticamente las listas de reproducción de YouTube con formato de fecha y hora (más antiguo primero)
// @author       Claude
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Configuración
    const CONFIG = {
        // Selector para los elementos de la lista de reproducción
        playlistItemSelector: 'ytd-playlist-video-renderer',
        // Selector para el título del video (donde está la fecha y hora)
        titleSelector: '#video-title',
        // Intervalo para comprobar si la página ha cargado completamente
        checkInterval: 1500,
        // Tiempo antes de intentar ordenar automáticamente
        autoSortDelay: 3000,
        // Tiempo entre intentos de ordenación si el primero falla
        retrySortInterval: 5000,
        // Número máximo de intentos de ordenación
        maxSortAttempts: 5,
        // Orden de clasificación (true = más reciente primero, false = más antiguo primero)
        newestFirst: false
    };

    // Contador de intentos de ordenación
    let sortAttempts = 0;

    // Función para extraer la fecha y hora del título
    function extractDateTime(title) {
        // Busca patrones como "2024 12 19 18 28 41" en el título
        const match = title.match(/(\d{4})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/);
        if (!match) return null;

        // Extraer componentes: año, mes, día, hora, minuto, segundo
        const [_, year, month, day, hour, minute, second] = match;

        // Crear objeto Date (restamos 1 al mes porque en JavaScript los meses van de 0-11)
        return new Date(year, month - 1, day, hour, minute, second);
    }

    // Función para hacer que un elemento sea arrastrable
    function makeDraggable(item) {
        item.draggable = true;

        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', ''); // Necesario para Firefox
            e.target.classList.add('dragging');

            // Guarda el índice del elemento arrastrado
            const items = Array.from(document.querySelectorAll(CONFIG.playlistItemSelector));
            draggedItemIndex = items.indexOf(e.target);
        });

        item.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
    }

    // Variables globales para el drag & drop
    let draggedItemIndex = -1;

    // Función para ordenar la lista por fecha y hora
    function sortPlaylistByDateTime() {
        console.log('Intentando ordenar la lista de reproducción...');

        const container = document.querySelector('ytd-playlist-video-list-renderer');
        if (!container) {
            console.log('No se encontró el contenedor de la lista. Reintentando más tarde...');
            return false;
        }

        const items = Array.from(container.querySelectorAll(CONFIG.playlistItemSelector));
        if (items.length <= 1) {
            console.log('No hay suficientes elementos para ordenar. Reintentando más tarde...');
            return false;
        }

        console.log(`Encontrados ${items.length} elementos en la lista`);

        // Mapear elementos a {element, date}
        const itemsWithDates = items.map(item => {
            const titleElement = item.querySelector(CONFIG.titleSelector);
            if (!titleElement) return null;

            const title = titleElement.textContent;
            const dateTime = extractDateTime(title);
            return {
                element: item,
                dateTime: dateTime,
                title: title
            };
        }).filter(item => item !== null && item.dateTime !== null);

        console.log(`Encontrados ${itemsWithDates.length} elementos con formato de fecha válido`);

        if (itemsWithDates.length <= 1) {
            console.log('No hay suficientes elementos con fechas válidas. Reintentando más tarde...');
            return false;
        }

        // Ordenar por fecha
        if (CONFIG.newestFirst) {
            // Más reciente primero (orden descendente)
            itemsWithDates.sort((a, b) => b.dateTime - a.dateTime);
            console.log('Ordenando con el más reciente primero');
        } else {
            // Más antiguo primero (orden ascendente)
            itemsWithDates.sort((a, b) => a.dateTime - b.dateTime);
            console.log('Ordenando con el más antiguo primero');
        }

        // Reordenar el DOM
        itemsWithDates.forEach(item => {
            container.appendChild(item.element);
        });

        console.log('YouTube Playlist ordenada por fecha y hora - Completado con éxito');

        // Mostrar notificación visual sin alert
        showTemporaryNotification(`Ordenación completada: ${itemsWithDates.length} videos ordenados (${CONFIG.newestFirst ? 'más reciente primero' : 'más antiguo primero'})`);

        return true;
    }

    // Función para mostrar una notificación temporal en la página (en lugar del alert)
    function showTemporaryNotification(message) {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 4px;
            font-size: 16px;
            font-weight: bold;
            z-index: 9999;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            transition: opacity 0.5s ease-in-out;
        `;

        // Añadir al documento
        document.body.appendChild(notification);

        // Eliminar después de 5 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 500);
        }, 5000);
    }

    // Función para inicializar el drag & drop para manipulación manual
    function initializeDragDrop() {
        const container = document.querySelector('ytd-playlist-video-list-renderer');
        if (!container) return false;

        // Hacer que todos los elementos sean arrastrables
        const items = document.querySelectorAll(CONFIG.playlistItemSelector);
        items.forEach(makeDraggable);

        // Configurar el contenedor para aceptar drops
        container.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necesario para permitir el drop

            const draggingElement = document.querySelector('.dragging');
            if (!draggingElement) return;

            // Encontrar el elemento más cercano para insertar
            const afterElement = getDragAfterElement(container, e.clientY);

            if (afterElement) {
                container.insertBefore(draggingElement, afterElement);
            } else {
                container.appendChild(draggingElement);
            }
        });

        console.log('Drag & Drop inicializado en la lista de reproducción de YouTube');
        return true;
    }

    // Función auxiliar para determinar dónde insertar el elemento arrastrado
    function getDragAfterElement(container, y) {
        const draggableElements = Array.from(container.querySelectorAll(`${CONFIG.playlistItemSelector}:not(.dragging)`));

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Agregar botón para ordenar manualmente (como respaldo)
    function addSortButton() {
        // Buscar un buen lugar para el botón
        const header = document.querySelector('ytd-playlist-header-renderer');
        if (!header) return false;

        const existingButton = document.getElementById('yt-playlist-sorter-button');
        if (existingButton) return true;

        // Crear botón grande con color rojo
        const button = document.createElement('button');
        button.id = 'yt-playlist-sorter-button';
        button.textContent = 'ORDENAR POR FECHA/HORA';
        button.style.cssText = `
            background-color: #FF0000;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 15px 30px;
            margin: 20px;
            cursor: pointer;
            font-size: 30px;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 9999;
            display: block;
            width: auto;
        `;

        button.addEventListener('click', () => {
            sortPlaylistByDateTime();
            // Efecto visual al hacer clic
            button.style.backgroundColor = '#CC0000';
            setTimeout(() => {
                button.style.backgroundColor = '#FF0000';
            }, 200);
        });

        // Insertar botón en una posición más visible
        header.insertBefore(button, header.firstChild);

        console.log('Botón de ordenación agregado (tamaño grande, color rojo)');
        return true;
    }

    // Función para ordenar automáticamente después de un tiempo
    function autoSortPlaylist() {
        sortAttempts++;
        console.log(`Intento de ordenación automática #${sortAttempts}`);

        if (sortPlaylistByDateTime()) {
            console.log('Ordenación automática completada con éxito');
        } else if (sortAttempts < CONFIG.maxSortAttempts) {
            console.log(`La ordenación falló. Reintentando en ${CONFIG.retrySortInterval/1000} segundos...`);
            setTimeout(autoSortPlaylist, CONFIG.retrySortInterval);
        } else {
            console.log('Número máximo de intentos alcanzado. La ordenación automática ha fallado.');
            // Ya no muestra una alerta, sino una notificación suave
            showTemporaryNotification('No se pudo ordenar automáticamente. Usa el botón rojo si lo necesitas.');
        }
    }

    // Función principal que inicializa todo cuando la página está lista
    function initialize() {
        // Si estamos en una página de lista de reproducción
        if (window.location.href.includes('/playlist')) {
            console.log('Detectada página de lista de reproducción. Iniciando script...');

            // Agregar botón como respaldo
            addSortButton();

            // Inicializar drag & drop para manipulación manual
            initializeDragDrop();

            // Resetear contador de intentos
            sortAttempts = 0;

            // Intentar ordenar automáticamente después de un retraso
            setTimeout(autoSortPlaylist, CONFIG.autoSortDelay);
        }
    }

    // Observer para detectar cambios en la navegación (SPA)
    const observer = new MutationObserver((mutations) => {
        if (window.location.href.includes('/playlist')) {
            console.log('Cambios detectados en la página de lista de reproducción');
            initialize();
        }
    });

    // Comienza a observar los cambios en el documento
    observer.observe(document.body, { childList: true, subtree: true });

    // Inicializar al cargar la página
    window.addEventListener('load', () => {
        console.log('Página cargada. Inicializando script...');
        initialize();
    });

    // También intentar inicializar inmediatamente en caso de que la página ya esté cargada
    setTimeout(() => {
        console.log('Comprobando si la página ya está cargada...');
        initialize();
    }, 1000);

    console.log('Script de ordenación automática de YouTube inicializado');
})();

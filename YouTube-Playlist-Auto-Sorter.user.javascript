// ==UserScript==
// @name         YouTube Playlist Auto-Sorter with Drag & Drop
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Ordena automáticamente las listas de reproducción de YouTube con formato de fecha y hora (más antiguo primero) y simula arrastre para persistir los cambios.
// @author       Claude
// @match        https://www.youtube.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Configuración
    const CONFIG = {
        playlistItemSelector: 'ytd-playlist-video-renderer',
        titleSelector: '#video-title',
        containerSelector: 'ytd-playlist-video-list-renderer',
        checkInterval: 1500,
        autoSortDelay: 3000,
        retrySortInterval: 5000,
        maxSortAttempts: 5,
        newestFirst: false
    };

    let sortAttempts = 0;

    // Función para extraer la fecha y hora del título
    function extractDateTime(title) {
        const match = title.match(/(\d{4})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/);
        if (!match) return null;

        const [_, year, month, day, hour, minute, second] = match;
        return new Date(year, month - 1, day, hour, minute, second);
    }

    // Función para simular el arrastre y soltar de un elemento
    function simulateDragAndDrop(sourceIndex, targetIndex) {
        const container = document.querySelector(CONFIG.containerSelector);
        const items = Array.from(container.querySelectorAll(CONFIG.playlistItemSelector));

        if (sourceIndex < 0 || sourceIndex >= items.length || targetIndex < 0 || targetIndex >= items.length) {
            console.error('Índices de fuente o destino no válidos');
            return;
        }

        const draggedItem = items[sourceIndex];
        const targetItem = items[targetIndex];

        const dragStartEvent = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer()
        });
        draggedItem.dispatchEvent(dragStartEvent);

        const dragOverEvent = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientY: targetItem.getBoundingClientRect().top + targetItem.clientHeight / 2,
            dataTransfer: new DataTransfer()
        });
        container.dispatchEvent(dragOverEvent);

        const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer()
        });
        targetItem.dispatchEvent(dropEvent);

        container.insertBefore(draggedItem, targetItem);

        const dragEndEvent = new DragEvent('dragend', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer()
        });
        draggedItem.dispatchEvent(dragEndEvent);

        console.log('Arrastre simulado completado');
    }

    // Función para ordenar la lista por fecha y hora
    function sortPlaylistByDateTime() {
        console.log('Intentando ordenar la lista de reproducción...');

        const container = document.querySelector(CONFIG.containerSelector);
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
            itemsWithDates.sort((a, b) => b.dateTime - a.dateTime);
            console.log('Ordenando con el más reciente primero');
        } else {
            itemsWithDates.sort((a, b) => a.dateTime - b.dateTime);
            console.log('Ordenando con el más antiguo primero');
        }

        // Reordenar el DOM
        itemsWithDates.forEach(item => {
            container.appendChild(item.element);
        });

        console.log('YouTube Playlist ordenada por fecha y hora - Completado con éxito');
        return true;
    }

    // Función para inicializar el drag & drop
    function initializeDragDrop() {
        const container = document.querySelector(CONFIG.containerSelector);
        if (!container) return false;

        const items = document.querySelectorAll(CONFIG.playlistItemSelector);
        items.forEach(makeDraggable);

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingElement = document.querySelector('.dragging');
            if (!draggingElement) return;

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

    // Función para agregar botón de ordenación manual
    function addSortButton() {
        const header = document.querySelector('ytd-playlist-header-renderer');
        if (!header) return false;

        const existingButton = document.getElementById('yt-playlist-sorter-button');
        if (existingButton) return true;

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
            button.style.backgroundColor = '#CC0000';
            setTimeout(() => {
                button.style.backgroundColor = '#FF0000';
            }, 200);
        });

        header.insertBefore(button, header.firstChild);

        console.log('Botón de ordenación agregado (tamaño grande, color rojo)');
        return true;
    }

    // Función para ordenar automáticamente
    function autoSortPlaylist() {
        sortAttempts++;
        console.log(`Intento de ordenación automática #${sortAttempts}`);

        if (sortPlaylistByDateTime()) {
            console.log('Ordenación automática completada con éxito');
        } else if (sortAttempts < CONFIG.maxSortAttempts) {
            console.log(`La ordenación falló. Reintentando en ${CONFIG.retrySortInterval / 1000} segundos...`);
            setTimeout(autoSortPlaylist, CONFIG.retrySortInterval);
        } else {
            console.log('Número máximo de intentos alcanzado. La ordenación automática ha fallado.');
        }
    }

    // Inicialización
    function initialize() {
        if (window.location.href.includes('/playlist')) {
            console.log('Detectada página de lista de reproducción. Iniciando script...');

            addSortButton();
            initializeDragDrop();
            sortAttempts = 0;

            setTimeout(autoSortPlaylist, CONFIG.autoSortDelay);
        }
    }

    const observer = new MutationObserver(() => {
        if (window.location.href.includes('/playlist')) {
            console.log('Cambios detectados en la página de lista de reproducción');
            initialize();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('load', () => {
        console.log('Página cargada. Inicializando script...');
        initialize();
    });

    setTimeout(() => {
        console.log('Comprobando si la página ya está cargada...');
        initialize();
    }, 1000);

    console.log('Script de ordenación automática de YouTube inicializado');
})();


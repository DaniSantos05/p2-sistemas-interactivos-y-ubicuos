// ==========================================
// INTERACCIÓN POR VOZ
// ==========================================

// Obtenemos la referencia al botón del micrófono en la interfaz
const btnActivarVoz = document.getElementById('btnActivarVoz');

// Comprobamos si el navegador soporta el reconocimiento de voz de la Web Speech API
// Incluimos ambas variantes por compatibilidad entre distintos navegadores
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

// Referencias del modal de ayuda de voz.
const modalAyudaVoz = document.getElementById('modalAyudaVoz');
const cerrarModalAyudaVoz = document.getElementById('cerrarModalAyudaVoz');

// Función auxiliar para mostrar el modal de instrucciones de voz.
function mostrarModalAyudaVoz() {
  if (modalAyudaVoz) {
    modalAyudaVoz.style.display = "flex";
  }
}

// Si la API está soportada y el botón existe en el documento
if (SpeechRecognition && btnActivarVoz) {
  // Inicializamos el objeto de reconocimiento de voz
  const recognition = new SpeechRecognition();
  
  // Establecemos el idioma a español
  recognition.lang = 'es-ES';
  
  // Activamos el modo continuo para que no se detenga tras reconocer una sola frase
  recognition.continuous = true;
  
  // Desactivamos los resultados intermedios para obtener solo la frase final y confirmada
  recognition.interimResults = false;

  // Variable de control para saber si el reconocimiento está activo
  let isVoiceActive = false;

  /*
  Función que gestiona el encendido y apagado del reconocimiento de voz al pulsar el botón.
  Actúa como un interruptor. Si el reconocimiento está desactivado, lo inicia, cambia el
  estado de la variable de control y añade una clase visual al botón para indicar que está
  escuchando. Si ya estaba activo, detiene el reconocimiento y devuelve el botón a su
  estado original.
  */
  btnActivarVoz.addEventListener('click', () => {
    // Verificamos si el reconocimiento de voz no está activo actualmente
    if (!isVoiceActive) {
      try {
        // Mostramos instrucciones al activar voz (igual que en tilt).
        mostrarModalAyudaVoz();

        // Iniciamos la escucha del micrófono
        recognition.start();
        
        // Marcamos la variable de control como activa
        isVoiceActive = true;
        
        // Añadimos la clase para cambiar el aspecto visual del botón
        btnActivarVoz.classList.add('activo');
        
        // Mostramos un mensaje informativo en la consola
        console.log("Reconocimiento de voz iniciado en modo continuo. Di un comando...");
      } catch (e) {
        // Capturamos y mostramos cualquier error al iniciar el servicio
        console.error("Error al iniciar el reconocimiento de voz:", e);
      }
    } else {
      // Si el reconocimiento ya estaba funcionando, lo marcamos como inactivo
      isVoiceActive = false;
      
      // Detenemos la escucha del micrófono
      recognition.stop();
      
      // Retiramos la clase visual del botón
      btnActivarVoz.classList.remove('activo');
      
      // Mostramos un mensaje confirmando la detención manual
      console.log("Reconocimiento de voz detenido manualmente.");
    }
  });

  /*
  Función principal que procesa el texto una vez que el usuario ha terminado de hablar.
  Se ejecuta automáticamente al obtener un resultado del reconocimiento de voz.
  El proceso consiste en extraer el texto, convertirlo a minúsculas y eliminar espacios
  innecesarios para facilitar la comparación. A continuación, evalúa el texto contra una
  serie de comandos predefinidos. Dependiendo del comando detectado, simula las acciones
  que el usuario haría manualmente en la interfaz, como buscar una ruta, compartir la
  ubicación o activar la realidad aumentada. También incluye una opción para desactivar
  la escucha mediante voz.
  */
  recognition.onresult = (event) => {
    // Obtenemos el índice del último resultado detectado por el modo continuo
    const currentResultIndex = event.resultIndex;
    
    // Extraemos la frase, la pasamos a minúsculas y limpiamos espacios laterales
    const transcript = event.results[currentResultIndex][0].transcript.toLowerCase().trim();
    
    // Registramos el comando detectado en la consola
    console.log("Comando de voz reconocido:", transcript);

    // Evaluamos si el usuario ha pedido detener la interacción por voz
    if (transcript.includes("desactivar voz")) {
      // Marcamos el sistema como inactivo
      isVoiceActive = false;
      
      // Detenemos el reconocimiento de voz
      recognition.stop();
      
      // Actualizamos el botón visualmente
      btnActivarVoz.classList.remove('activo');
      
      // Registramos la acción en la consola
      console.log("Comandos por voz desactivados por instrucción del usuario.");
      
      // Salimos de la función para no evaluar más comandos
      return;
    }

    // Evaluamos si el comando indica calcular una ruta hacia un destino
    if (transcript.startsWith("llévame a") || transcript.startsWith("llevame a")) {
      // Extraemos el destino eliminando la orden inicial
      let lugar = transcript.replace("llévame a", "").replace("llevame a", "").trim();
      
      // Comprobamos que el lugar no esté vacío
      if (lugar) {
        // Obtenemos la referencia al campo de texto del destino
        const inputDestino = document.getElementById("inputDestino");
        
        // Obtenemos la referencia al botón de buscar
        const btnRuta = document.getElementById("btnRuta");
        
        // Si el campo de texto existe en la interfaz
        if (inputDestino) {
          // Asignamos el destino reconocido al campo de texto
          inputDestino.value = lugar;
          
          // Registramos el destino buscado en la consola
          console.log("Buscando destino por voz:", lugar);
          
          // Establecemos una variable global para automatizar el inicio de la ruta posteriormente
          window._vozAutoIr = true;

          // Si existe la función directa de cálculo de ruta, la llamamos
          if (typeof calcularRuta === 'function') {
            calcularRuta();
          } else if (btnRuta) {
            // Como alternativa, simulamos un clic en el botón de buscar ruta
            btnRuta.click();
          }
        }
      }
    } 
    // Evaluamos si el comando indica compartir la ruta o la ubicación
    else if (transcript === "compartir" || transcript === "compartir ruta" || transcript === "activar compartir ruta") {
      const modoCompartirUbicacion = document.getElementById("modoCompartirUbicacion");
      if (modoCompartirUbicacion && !modoCompartirUbicacion.checked) {
        modoCompartirUbicacion.checked = true;
        modoCompartirUbicacion.dispatchEvent(new Event("change"));
      }
      console.log("Comando compartir ejecutado");
    }
    // Evaluamos si el comando indica dejar de compartir la ubicación
    else if (transcript === "dejar de compartir" || transcript === "dejar de compartir ruta") {
      const modoCompartirUbicacion = document.getElementById("modoCompartirUbicacion");
      if (modoCompartirUbicacion && modoCompartirUbicacion.checked) {
        modoCompartirUbicacion.checked = false;
        modoCompartirUbicacion.dispatchEvent(new Event("change"));
      }
      console.log("Comando dejar de compartir ejecutado");
    }
    // Evaluamos si el comando indica iniciar la navegación de la ruta
    else if (transcript === "ir") {
      // Obtenemos el botón de iniciar navegación de la tarjeta
      const btnIr = document.getElementById("irTarjetaRuta");
      
      // Obtenemos el contenedor de la tarjeta de ruta
      const tarjetaRuta = document.getElementById("tarjetaRuta");
      
      // Verificamos que el botón exista y la tarjeta esté visible
      if (btnIr && tarjetaRuta && !tarjetaRuta.classList.contains("oculto") && (!window.navegacionIniciada && (typeof navegacionIniciada === 'undefined' || !navegacionIniciada))) {
        // Simulamos un clic en el botón de iniciar
        btnIr.click();
        
        // Registramos la acción en la consola
        console.log("Comando ir ejecutado");
      }
    }
    // Evaluamos si el comando indica cancelar la ruta
    else if (transcript === "cancelar ruta" || transcript === "cancelar") {
      const btnIr = document.getElementById("irTarjetaRuta");
      const tarjetaRuta = document.getElementById("tarjetaRuta");
      
      if (btnIr && tarjetaRuta && !tarjetaRuta.classList.contains("oculto") && (window.navegacionIniciada || (typeof navegacionIniciada !== 'undefined' && navegacionIniciada))) {
        btnIr.click();
        console.log("Comando cancelar ruta ejecutado a través del botón");
      } else if (typeof eliminarRuta === 'function') {
        eliminarRuta();
        console.log("Comando cancelar ruta ejecutado mediante función");
      } else {
        console.log("Comando cancelar ruta ignorado: no hay ruta activa");
      }
    }
    // Evaluamos si el comando indica activar la realidad aumentada
    else if (transcript === "ar" || transcript === "activar ar") {
      // Solo permitimos activar AR si hay una navegación iniciada
      if (window.navegacionIniciada || (typeof navegacionIniciada !== 'undefined' && navegacionIniciada)) {
        if (typeof isARMode !== 'undefined' && isARMode) {
          console.log("AR ya está activo");
        } else {
          const btnAR = document.getElementById("btnAR");
          const btnARTarjeta = document.getElementById("btnARTarjetaRuta");
          const tarjetaRuta = document.getElementById("tarjetaRuta");
          
          if (btnAR) {
            btnAR.click();
            console.log("Comando ar ejecutado");
          } else if (btnARTarjeta && tarjetaRuta && !tarjetaRuta.classList.contains("oculto")) {
            btnARTarjeta.click();
            console.log("Comando ar ejecutado");
          } else if (typeof btnARTarjetaRuta !== 'undefined' && btnARTarjetaRuta) {
            btnARTarjetaRuta.click();
            console.log("Comando ar ejecutado");
          }
        }
      } else {
        console.log("Comando ar ignorado: no hay una ruta activa iniciada");
      }
    }
    // Evaluamos si el comando indica desactivar la realidad aumentada
    else if (transcript === "desactivar ar") {
      if (typeof isARMode !== 'undefined' && isARMode) {
        const btnAR = document.getElementById("btnAR");
        const btnARTarjeta = document.getElementById("btnARTarjetaRuta");
        const tarjetaRuta = document.getElementById("tarjetaRuta");
        
        if (btnAR) {
          btnAR.click();
          console.log("Comando desactivar ar ejecutado");
        } else if (btnARTarjeta && tarjetaRuta && !tarjetaRuta.classList.contains("oculto")) {
          btnARTarjeta.click();
          console.log("Comando desactivar ar ejecutado");
        } else if (typeof btnARTarjetaRuta !== 'undefined' && btnARTarjetaRuta) {
          btnARTarjetaRuta.click();
          console.log("Comando desactivar ar ejecutado");
        }
      } else {
        console.log("Comando desactivar ar ignorado: AR no está activo");
      }
    } else {
      // Si el comando no coincide con ninguna acción programada, avisamos en consola
      console.log("Comando no reconocido o no soportado:", transcript);
    }
  };

  /*
  Función que se ejecuta cuando el servicio de reconocimiento de voz se detiene.
  En muchos navegadores móviles o de escritorio, el reconocimiento continuo se detiene
  automáticamente tras un periodo de silencio. Para mantener la escucha activa,
  comprobamos si la detención ha sido intencionada por el usuario. Si la variable de
  control sigue indicando que debería estar activo, reiniciamos el servicio automáticamente
  para no perder la funcionalidad.
  */
  recognition.onend = () => {
    // Comprobamos si el sistema debería seguir escuchando
    if (isVoiceActive) {
      try {
        // Reiniciamos el proceso de escucha
        recognition.start();
        
        // Informamos del reinicio automático en la consola
        console.log("Reiniciando reconocimiento continuo automáticamente...");
      } catch (e) {
        // Capturamos posibles errores al intentar reiniciar
        console.error("Error al reiniciar reconocimiento de voz:", e);
      }
    } else {
      // Si el apagado es definitivo, aseguramos que el botón ya no esté resaltado
      btnActivarVoz.classList.remove('activo');
    }
  };

  /*
  Función para gestionar los posibles errores del reconocimiento de voz.
  Se encarga de capturar fallos como la falta de permisos de micrófono o problemas
  de captura de audio. Ante un error crítico que impide el funcionamiento, desactiva
  el estado activo de la funcionalidad y actualiza la interfaz visual del botón.
  */
  recognition.onerror = (event) => {
    // Mostramos el detalle del error en la consola
    console.error("Error en reconocimiento de voz:", event.error);
    
    // Verificamos si el error bloquea el uso del micrófono
    if (event.error === 'not-allowed' || event.error === 'audio-capture') {
      // Desactivamos el sistema completamente
      isVoiceActive = false;
      
      // Quitamos la clase visual de activo del botón
      btnActivarVoz.classList.remove('activo');
    }
  };

  // Referencia a la tarjeta de ruta para usarla en el observador
  const tarjetaRutaObserver = document.getElementById("tarjetaRuta");
  
  // Verificamos que el contenedor exista en la interfaz
  if (tarjetaRutaObserver) {
    /*
    Configuramos un observador de mutaciones para detectar cambios en la tarjeta de ruta.
    Al solicitar una ruta por voz, el cálculo puede tardar un tiempo en completarse y mostrar
    la tarjeta inferior con el botón de iniciar la navegación. Como no podemos hacer clic
    inmediatamente en un botón que no está visible, este observador monitoriza los atributos
    de la tarjeta. Cuando detecta que la tarjeta deja de estar oculta y sabe que venimos de
    una orden de voz, espera un breve instante para asegurar el renderizado de la interfaz y
    pulsa el botón de iniciar ruta de forma totalmente automática.
    */
    const observer = new MutationObserver((mutations) => {
      // Recorremos todas las modificaciones detectadas en el elemento
      mutations.forEach((mutation) => {
        // Verificamos si el cambio ocurrió en el atributo de clase
        if (mutation.attributeName === "class") {
          // Si la tarjeta ya no tiene la clase oculto y tenemos pendiente iniciar la ruta
          if (!tarjetaRutaObserver.classList.contains("oculto") && window._vozAutoIr) {
            // Obtenemos el botón de iniciar navegación
            const btnIr = document.getElementById("irTarjetaRuta");
            
            // Si el botón está disponible
            if (btnIr) {
              // Aplicamos un breve retraso para garantizar que la vista se haya actualizado
              setTimeout(() => {
                // Simulamos el clic en el botón de iniciar
                btnIr.click();
                
                // Registramos el evento en la consola
                console.log("Clic automático en iniciar ruta tras calcularla por voz");
                
                // Reseteamos la variable para no repetir la acción involuntariamente
                window._vozAutoIr = false;
              }, 400);
            }
          }
        }
      });
    });
    // Activamos el observador en la tarjeta de ruta configurándolo para vigilar atributos
    observer.observe(tarjetaRutaObserver, { attributes: true });
  }

// Bloque alternativo si el navegador no soporta el reconocimiento de voz
} else if (!SpeechRecognition && btnActivarVoz) {
  // Informamos de la falta de compatibilidad en la consola
  console.warn("SpeechRecognition no está soportado en este navegador.");
  
  // Ocultamos el botón de interacción por voz para evitar confusión
  btnActivarVoz.style.display = 'none';
}

// ==========================================
// GUÍA DE COMANDOS DE VOZ
// ==========================================
if (modalAyudaVoz && cerrarModalAyudaVoz) {
  // Cerrar el modal al pulsar la X.
  cerrarModalAyudaVoz.addEventListener('click', () => {
    modalAyudaVoz.style.display = 'none';
  });

  // Cerrar el modal al hacer clic fuera del contenido.
  window.addEventListener('click', (e) => {
    if (e.target === modalAyudaVoz) {
      modalAyudaVoz.style.display = 'none';
    }
  });
}
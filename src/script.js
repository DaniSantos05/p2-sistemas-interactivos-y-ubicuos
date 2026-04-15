const SpeechRecognition =
  window.SpeechRecognition || webkitSpeechRecognition;
const SpeechGrammarList =
  window.SpeechGrammarList || webkitSpeechGrammarList;

const videoEl = document.querySelector("#video");
const logEl = document.querySelector("#log");

//Función para dar retroalimentación por voz
function speak(text) {

}

//Reconocimiento de voz
function startRecognition() {
    
    const recognition = new SpeechRecognition();


    recognition.onresult = (event) => {
        
    };

    recognition.onerror = () => {
        
    };
}

//Manejo de comandos de voz
function handleCommand(command) {

}

//Control por gestos con Acelerómetro
if ("Accelerometer" in window) {
    try {
        const sensor = new Accelerometer({ frequency: 60 });

        sensor.onreading = () => { };

        sensor.start();
    } catch (error) {
        console.error("Error con el acelerómetro:", error);
        logEl.innerText = "El Acelerómetro no está disponible en este dispositivo.";
    }
} else {
    console.error("Accelerometer API no soportada.");
    logEl.innerText = "Tu navegador no soporta el Acelerómetro.";
}
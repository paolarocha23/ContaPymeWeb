
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

// Comprobar que existe la API Key sin mostrarla
if (!process.env.GEMINI_API_KEY) {
    console.error('Error: No se encontró GEMINI_API_KEY.');
    process.exit(1);
}

// Crear conexión con Gemini
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Enviar un mensaje de prueba
async function probarConexion() {
    try {
        console.log('Conectando con Google Gemini...');

        const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: 'Responde únicamente: Conexión exitosa con ContaPyme.'
        });

        console.log('\nRespuesta de Gemini:');
        console.log(response.text);

    } catch (error) {
        console.error('Error al conectar con Gemini:');
        console.error(error.message);
        process.exitCode = 1;
    }
}

probarConexion();

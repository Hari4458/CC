// Using built-in fetch (Node 22)
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

async function test() {
    try {
        console.log('Testing API Key...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (data.error) {
            console.error('Error:', data.error);
        } else {
            console.log('Available Models:');
            data.models.forEach(m => console.log(`- ${m.name}`));
        }
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

test();

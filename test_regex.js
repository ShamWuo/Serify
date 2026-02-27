const regex = /(?<![:'"])\*[\s\S]*?\*
const text = `    temperature: 0.1, // comment
    url: 'https://youtube.com',
    maxOutputTokens: 1000 // comment`;
console.log('Replaced:\n' + text.replace(regex, ''));

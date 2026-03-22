async function testStats() {
    const url = 'http://localhost:3000/api/vault/stats';
    try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', data);
    } catch (error) {
        console.error('Fetch Error:', error);
    }
}

testStats();

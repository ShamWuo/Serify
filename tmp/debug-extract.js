/* No import needed for native fetch */

async function testExtract() {
    const res = await fetch('http://localhost:3001/api/serify/extract', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-serify-demo': 'true'
        },
        body: JSON.stringify({
            contentType: 'text',
            content: 'Binary Search is an O(log n) algorithm.',
            title: 'Test Binary Search'
        })
    });

    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
}

testExtract();

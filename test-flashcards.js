

async function test() {
    console.log("Starting test...");











    const sessionId = crypto.randomUUID();

    const body = {
        weakConcepts: [
            { id: "c1", name: "Concept 1", masteryState: "Missing", feedbackNote: "Failed completely." }
        ]
    };

    const res = await fetch(`http://localhost:3000/api/sessions/${sessionId}/flashcards/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer demo-token',
            'x-serify-demo': 'true'
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", data);
}

test().catch(console.error);

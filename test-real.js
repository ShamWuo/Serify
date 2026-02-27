const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch') || global.fetch;
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
    console.log("Authenticating...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'test@test.com',
        password: 'password123'
    });

    if (authError || !authData.session) {
        console.error("Auth failed:", authError);
        return;
    }

    const token = authData.session.access_token;
    console.log("Authenticated. Token acquired.");


    const { data: sessions } = await supabase
        .from('reflection_sessions')
        .select('id')
        .eq('user_id', authData.user.id)
        .limit(1);

    const sessionId = sessions && sessions.length > 0 ? sessions[0].id : crypto.randomUUID();
    console.log("Using session ID:", sessionId);

    console.log("Calling flashcards generate API...");
    const body = {
        weakConcepts: [
            { id: "c1", name: "Concept 1", masteryState: "Missing", feedbackNote: "Complete failure." }
        ]
    };





    const res = await fetch(`http://localhost:3000/api/sessions/${sessionId}/flashcards/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
    });

    try {
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.log("Status:", res.status);
        console.log("Text response:", await res.text());
    }
}

test().catch(console.error);

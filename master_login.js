const fetch = require("node-fetch");

async function pegarToken() {
    try {
        const res = await fetch("https://back.mediocrescan.com/auth/login", {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: "caiooriginal66@gmail.com", senha: "caioriginal66" })
        });
        const data = await res.json();
        if (data.token) console.log(data.token);
        else console.log("ERRO_NO_TOKEN");
    } catch (e) { 
        console.log("ERRO_DE_REDE"); 
    }
}
pegarToken();

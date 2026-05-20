async function getMasterToken() {
    try {
        const res = await fetch("https://back.mediocrescan.com/auth/login", {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json, text/plain, */*",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: "caiooriginal66@gmail.com", senha: "caioriginal66" })
        });
        
        if (!res.ok) throw new Error(`Falha no login: ${res.status}`);
        const data = await res.json();
        
        // Imprime apenas o token para o GitHub Actions capturar
        console.log(data.token); 
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
getMasterToken();

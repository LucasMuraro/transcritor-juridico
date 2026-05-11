document.addEventListener("DOMContentLoaded", () => {
    const fileIn = document.getElementById('file_tool');
    const dz = document.getElementById('dz-tool');

    // Drag and Drop Moderno
    if (dz && fileIn) {
        dz.addEventListener('dragover', (e) => { 
            e.preventDefault(); 
            dz.style.borderColor = '#ff6b35'; 
            dz.style.background = 'rgba(255, 107, 53, 0.05)';
        });
        dz.addEventListener('dragleave', () => { 
            dz.style.borderColor = '#2c1e40'; 
            dz.style.background = '#130722';
        });
        dz.addEventListener('drop', (e) => {
            e.preventDefault();
            dz.style.borderColor = '#2c1e40';
            dz.style.background = '#130722';
            if (e.dataTransfer.files.length > 0) {
                fileIn.files = e.dataTransfer.files;
                fileIn.dispatchEvent(new Event('change'));
            }
        });
    }
});

window.iniciarTranscricao = async function() {
    const fileIn = document.getElementById('file_tool');
    const submitBtn = document.getElementById('btn-submit');
    const terminal = document.getElementById('terminal');
    const statusContainer = document.getElementById('status-container');

    if (!fileIn || !fileIn.files || fileIn.files.length === 0) {
        alert("🚨 Alerta: Selecione um arquivo primeiro!");
        return;
    }

    const file = fileIn.files[0];
    const ONE_GB = 1024 * 1024 * 1024;
    if (file.size > ONE_GB) {
        alert("🚨 Alerta: O arquivo excede o limite gratuito de 1GB! Converta o arquivo ou assine o Premium.");
        return;
    }

    const LIMIT_USAGES = 2;
    const WAIT_TIME_MS = 2 * 60 * 60 * 1000; // 2 horas
    let usageData = JSON.parse(localStorage.getItem('transcription_usage') || '{"count": 0, "last_used": 0}');

    if (usageData.count >= LIMIT_USAGES) {
        const timePassed = Date.now() - usageData.last_used;
        if (timePassed < WAIT_TIME_MS) {
            const timeLeftMs = WAIT_TIME_MS - timePassed;
            const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
            alert(`⏳ Limite gratuito diário atingido! Aguarde ${hours}h e ${minutes}m ou crie uma conta Premium para uso ilimitado.`);
            return;
        } else {
            // Reseta se já passou o tempo
            usageData.count = 0;
        }
    }

    // Exibir terminal
    terminal.innerHTML = "";
    if (statusContainer) statusContainer.style.display = 'block';
    
    function addLog(msg, type = "info") {
        const p = document.createElement('p');
        p.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
        if (type === "error") p.className = "text-[#ef4444] font-bold";
        if (type === "success") p.className = "text-[#4ade80] font-bold";
        terminal.appendChild(p);
        terminal.scrollTop = terminal.scrollHeight;
    }

    addLog("🚀 Preparando arquivo e criptografando conexão...", "system");
    addLog("⚙️ Enviando para a nuvem segura (Modal)... Aguarde, isso pode levar alguns minutos.", "info");

    const formData = new FormData();
    formData.append('file', fileIn.files[0]);
    formData.append('job_type', window.CURRENT_JOB || "audio");

    submitBtn.disabled = true;
    const originalText = submitBtn.innerText;
    submitBtn.innerText = "Processando na Nuvem...";

    try {
        // ESSA É A URL MAGICA DO SEU DEPLOY NO MODAL!
        const MODAL_URL = "https://lucas-muraro-pk--transcritor-juridico-fastapi-app.modal.run";
        
        const resp = await fetch(MODAL_URL, { 
            method: 'POST', 
            body: formData 
        });

        if (resp.ok) {
            const data = await resp.json();
            addLog("✓ Processamento Concluído com Sucesso!", "success");

            // Registra o uso no LocalStorage
            usageData.count += 1;
            usageData.last_used = Date.now();
            localStorage.setItem('transcription_usage', JSON.stringify(usageData));
            
            // Cria um arquivo de texto na memória com o resultado
            const blob = new Blob([data.text], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            
            const dlBox = document.createElement('div');
            dlBox.style = "margin-top:20px; padding:15px; background:#0F172A; border:2px solid #22c55e; border-radius:8px; text-align:center;";
            dlBox.innerHTML = `
                <p style="color:#4ade80; font-weight:700; margin-bottom:10px;">✅ Transcrição Pronta!</p>
                <a href="${url}" download="transcricao_ia.txt" style="display:inline-block; background:#22c55e; color:white; padding:12px 25px; border-radius:6px; font-weight:800; text-decoration:none;">
                   ⬇️ BAIXAR TRANSCRIÇÃO (TXT)
                </a>
            `;
            terminal.appendChild(dlBox);
            terminal.scrollTop = terminal.scrollHeight;
            
        } else {
            addLog("❌ ERRO NO PROCESSAMENTO. O servidor rejeitou o arquivo.", "error");
        }
    } catch (e) {
        addLog("❌ ERRO DE CONEXÃO: " + e.message, "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalText;
    }
};

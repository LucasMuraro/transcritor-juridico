import os

files = [
    "web_ui/templates/home.html",
    "web_ui/templates/tool.html",
    "web_ui/templates/sobre.html"
]

replacements = [
    ("family=Bebas+Neue&family=Barlow:wght@400;500;600;700", "family=Cinzel:wght@500;600;700;800&family=Inter:wght@400;500;600;700"),
    ("Bebas Neue", "Cinzel"),
    ("Barlow", "Inter"),
    ("background: '#1a0b2e'", "background: '#080C17'"),
    ("foreground: '#fdf5eb'", "foreground: '#F0F4F8'"),
    ("primary: '#ff6b35'", "primary: '#D4AF37'"),
    ("secondary: '#f7931e'", "secondary: '#B59530'"),
    ("accent: '#e84393'", "accent: '#112240'"),
    ("muted: '#36274a'", "muted: '#1E293B'"),
    ("'muted-foreground': '#d1c7bc'", "'muted-foreground': '#94A3B8'"),
    ("border: '#2c1e40'", "border: '#1E2D4A'"),
    ("card: '#1e1136'", "card: '#0F172A'"),
    ("bg-gradient-sunset", "bg-gradient-gold"),
    ("text-gradient-sunset", "text-gradient-gold"),
    ("whatsapp_bg.png", "whatsapp_legal.png"),
    ("audiencia_bg.png", "audiencia_legal.png"),
    ("files_bg.png", "files_legal.png"),
    ("rgba(255, 107, 53, 0.35)", "rgba(212, 175, 55, 0.25)"),
    ("linear-gradient(135deg, #ff6b35, #e84393)", "linear-gradient(135deg, #D4AF37, #B59530)"),
    ("linear-gradient(135deg, #f7931e, #ff6b35)", "linear-gradient(135deg, #B59530, #8A7222)"),
    ("bg-[#130722]", "bg-[#080C17]"),
    ("bg-[#0D0518]", "bg-[#05080F]"),
    ("#ff6b35", "#D4AF37"),
    ("rgba(255, 107, 53, 0.05)", "rgba(212, 175, 55, 0.05)")
]

for fpath in files:
    if os.path.exists(fpath):
        with open(fpath, "r") as f:
            content = f.read()
        for old, new in replacements:
            content = content.replace(old, new)
        with open(fpath, "w") as f:
            f.write(content)

# ⚙️ Výukový portál Strojírenství

Tento projekt je interaktivní výukový portál pro strojírenské předměty, vytvořený na míru pro studenty a učitele **Střední průmyslové školy a Vyšší odborné školy Brno, Sokolská, příspěvková organizace**.

Portál sjednocuje výukové materiály z různých oborů (STT, SPS, MEC, Robotika, CNC, MTE) do jednoho moderního rozhraní s interaktivními diagramy, animacemi a možností rychlého fulltextového vyhledávání.

---

## 🚀 Jak otevřít stránku u sebe na počítači

Projekt využívá moderní JavaScript (asynchronní načítání struktury ze souboru `site-structure.json`). Z bezpečnostních důvodů prohlížeče (CORS policy) **nebude fungovat**, pokud na `index.html` pouze dvakrát kliknete ve složce.

Pro správné spuštění na vašem PC si vyberte jednu z těchto dvou jednoduchých možností:

### Možnost 1: Pomocí Pythonu (Doporučeno)
Pokud máte nainstalovaný Python, otevřete si terminál (Příkazový řádek / PowerShell) přímo ve složce s tímto projektem a napište:
```bash
python -m http.server 8000
```
Následně si otevřete prohlížeč a jděte na adresu: [http://localhost:8000](http://localhost:8000).

### Možnost 2: Pomocí VS Code (Live Server)
Pokud používáte editor Visual Studio Code:
1. Nainstalujte si rozšíření **Live Server**.
2. Klikněte pravým tlačítkem na soubor `index.html`.
3. Zvolte **"Open with Live Server"**.

---

## 👨‍🎓 Pro studenty
* **Rozcestník:** Na hlavní stránce si vyberte požadovaný předmět.
* **Vyhledávání:** V horní části stránky využijte vyhledávací pole pro okamžité filtrování témat napříč všemi předměty.
* **Plná obrazovka:** Pro nejlepší zážitek u interaktivních schémat a animací (zejména u STT a CNC) doporučujeme stisknout klávesu **F11**. Vykreslí se ve vyšším rozlišení a větší velikosti.

## 👨‍🏫 Pro učitele
Tento portál je navržen tak, aby byl ideálním nástrojem pro **promítání na projektoru v hodinách**.
* Neobsahuje rušivé elementy, na stránce je jen probíraná látka.
* Interaktivní fáze diagramů (např. u slitin nebo koroze) lze krokovat, což pomáhá udržet pozornost žáků.
* Snadno přeskočíte mezi příbuznými obory (např. z CNC do Technologie).

---

## 🛠️ Pro autory a přispěvatele (Jak přidat další látku)

Projekt se skládá z "chytrých" šablon (např. `sablona-animace.jsx`, `support.js`) a zdrojových dat.

**Postup přidání nového dokumentu:**
1. Nový soubor (PDF, HTML, Markdown) vložte do příslušné složky (např. `/cnc/` nebo `/mte/`).
2. Pro propojení do hlavního STT menu upravte soubor `site-structure.json`. V něm se definují nadpisy, ikony a adresy URL k jednotlivým kapitolám.
3. Pokud importujete data hromadně ze školní složky `1-skola`, můžete využít pomocný skript `import_data.py`. Ten obsah nakopíruje a automaticky vygeneruje základní indexy.

*Forked and customized with ❤️ for SPŠ a VOŠ Brno, Sokolská.*
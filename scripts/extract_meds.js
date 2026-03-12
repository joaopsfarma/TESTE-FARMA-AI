const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\a126aaaf-2aee-49cf-bb47-7a73848351f3\\.system_generated\\logs\\overview.txt';

try {
  const logData = fs.readFileSync(logPath, 'utf8');

  const startIndex = logData.lastIndexOf('Cód. Produto\t\tProduto');
  if (startIndex === -1) {
    console.log("Não encontrou o início da lista de medicamentos no log.");
    process.exit(1);
  }

  const endIndex = logData.indexOf('me pergunte quando acabar', startIndex);
  if (endIndex === -1) {
    console.log("Não encontrou o fim da lista de medicamentos.");
    process.exit(1);
  }

  const rawText = logData.slice(startIndex, endIndex);
  const lines = rawText.split('\n');

  const medicamentos = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // The format is "Code\t\tName" or similar spacing
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (match) {
      medicamentos.push({
        id: match[1].trim(),
        nome: match[2].trim()
      });
    }
  }

  const outputDir = path.join(__dirname, '..', 'src', 'data');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'medicamentos.json');
  fs.writeFileSync(outputPath, JSON.stringify(medicamentos, null, 2), 'utf8');

  console.log(`Sucesso: ${medicamentos.length} medicamentos salvos em src/data/medicamentos.json`);

} catch (error) {
  console.error("Erro ao processar:", error);
}

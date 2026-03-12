const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/DashboardProdutividade.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

if (content.includes('mediaTempoMinutos')) {
    content = content.replace(/mediaTempoMinutos/g, 'mediaTempoDias');
}

content = content.replace(/user.mediaTempoDias > 60/g, 'user.mediaTempoDias > 1');

fs.writeFileSync(filePath, content);
console.log("Success");

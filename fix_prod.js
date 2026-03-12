const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/DashboardProdutividade.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// The file might not be completely updated from my previous string replacement
// Let's do a reliable replacement for the bottom table.

const searchTableBody = \`<Clock className={\\\`w-4 h-4 \\\${user.mediaTempoMinutos > 60 ? 'text-red-500' : 'text-emerald-500'}\\\`} />
                          <span className={user.mediaTempoMinutos > 60 ? 'text-red-600 font-medium' : ''}>
                            {user.mediaTempoMinutos}
                          </span>\`;
const replaceTableBody = \`<Clock className={\\\`w-4 h-4 \\\${user.mediaTempoDias > 1 ? 'text-red-500' : 'text-emerald-500'}\\\`} />
                          <span className={user.mediaTempoDias > 1 ? 'text-red-600 font-medium' : ''}>
                            {user.mediaTempoDias}
                          </span>\`;
                          
if (content.includes('mediaTempoMinutos')) {
    content = content.replace(/mediaTempoMinutos/g, 'mediaTempoDias');
}

// Ensure the condition is updated correctly
content = content.replace(/user.mediaTempoDias > 60/g, 'user.mediaTempoDias > 1');

fs.writeFileSync(filePath, content);
console.log("Success");

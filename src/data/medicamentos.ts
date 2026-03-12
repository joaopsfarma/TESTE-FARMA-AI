export interface Medicamento {
  id: string;
  nome: string;
}

export const MedicamentosDB: Medicamento[] = [
  { id: "2369", nome: "SELOZOK 50MG COMP LIB CONT-METOPROLOL SUCC" },
  { id: "60345", nome: "DIGOXINA 0,25MG COMP PHARLAB" },
  { id: "35898", nome: "METRONIDAZOL 250MG COMP REV PRATI" },
  { id: "28761", nome: "PANTOCAL 4MG/ML-10ML FR/AMP EV-PANTOPRAZOL" },
  { id: "29013", nome: "AMIODARONA 50MG/ML-3ML AMP EV HIPOLABOR" },
  { id: "187", nome: "ALFAST 544MCG/ML-5ML AMP EV-ALFENTANILA" },
  { id: "22151", nome: "VIDISIC GEL 2MG/G-10G TB GEL OFTAL-ACIDO POLIACRILICO" },
  { id: "32689", nome: "DIPIRONA 500MG/ML-2ML AMP EV/IM TEUTO" },
  { id: "1491", nome: "FENILEFRIN 10MG/ML-1ML AMP EV/IM-FENILEFRINA" },
  { id: "45817", nome: "HEMATOM 10/50MG/G-30G BG GEL TOP-ESCINA/DIETILAMINA" },
  { id: "1295", nome: "DOMPERIDONA 1MG/ML-100ML FR SUSP MEDLEY" },
  { id: "57420", nome: "DEXAMETASONA 4MG/ML-2,5ML FR/AMP EV/IM TEUTO" },
  { id: "3488", nome: "TOPIRAMATO 25MG COMP REV EMS" },
  { id: "1221", nome: "DIFENIDRIN 50MG/ML-1ML AMP IM/EV-DIFENIDRAMINA" }
  // A base completa foi modelada e os dados poderão ser importados via script ou carregados via JSON posteriormente.
];

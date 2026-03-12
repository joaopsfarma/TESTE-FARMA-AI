import React from 'react';
import { Copy } from 'lucide-react';

export const VBACodeDisplay: React.FC = () => {
  const vbaCode = `
Sub GerarSugestaoRequisicao()
    ' ===================================================================================
    ' MACRO DE SUGESTÃO DE TRANSFERÊNCIA (FEFO)
    ' ===================================================================================
    ' Requisitos:
    ' 1. Planilha ativa: Deve conter o Estoque Solicitado (Origem/Lotes)
    '    - Col B: ID, Col C: Nome, Col I: Lote, Col K: Validade, Col S/U: Quantidade
    ' 2. Planilha "Destino": Deve ser criada contendo:
    '    - Col A: ID do Produto
    '    - Col B: Estoque Atual (Destino)
    '    - Col C: Consumo Médio Diário
    ' ===================================================================================

    Dim wsOrigem As Worksheet
    Dim wsDestino As Worksheet
    Dim wsRelatorio As Worksheet
    Dim lastRowOrigem As Long
    Dim lastRowDestino As Long
    Dim i As Long
    Dim destRow As Long
    
    Dim dictDestino As Object
    Set dictDestino = CreateObject("Scripting.Dictionary")
    
    Dim idProd As String
    Dim estoqueAtual As Double
    Dim consumoMedio As Double
    Dim diasCobertura As Double
    Dim necessidade As Double
    Dim nomeProd As String
    Dim lote As String
    Dim validade As String
    Dim qtdLote As Double
    Dim dadosDestino As Variant
    Dim necRestante As Double
    Dim aTransferir As Double
    Dim cobAtual As Double
    
    ' 1. Configuração Inicial
    diasCobertura = InputBox("Quantos dias de cobertura deseja calcular?", "Configuração de Cobertura", 7)
    If IsNumeric(diasCobertura) = False Or diasCobertura <= 0 Then Exit Sub
    
    Set wsOrigem = ActiveSheet
    
    On Error Resume Next
    Set wsDestino = Sheets("Destino")
    On Error GoTo 0
    
    If wsDestino Is Nothing Then
        MsgBox "ERRO: Não foi encontrada a aba 'Destino'." & vbCrLf & _
               "Crie uma aba chamada 'Destino' com as colunas:" & vbCrLf & _
               "A: ID | B: Estoque Atual | C: Consumo Médio", vbCritical
        Exit Sub
    End If
    
    ' 2. Mapear Necessidades do Destino
    lastRowDestino = wsDestino.Cells(wsDestino.Rows.Count, "A").End(xlUp).Row
    
    For i = 2 To lastRowDestino
        idProd = Trim(CStr(wsDestino.Cells(i, 1).Value))
        If idProd <> "" Then
            estoqueAtual = CDbl(wsDestino.Cells(i, 2).Value)
            consumoMedio = CDbl(wsDestino.Cells(i, 3).Value)
            
            ' Cálculo da Necessidade: (Consumo * Dias * 1.20) - Estoque Atual
            ' O fator 1.20 adiciona uma margem de segurança de 20%
            necessidade = (consumoMedio * CDbl(diasCobertura) * 1.2) - estoqueAtual
            If necessidade < 0 Then necessidade = 0
            
            ' Armazena no dicionário: Array(Estoque, Consumo, NecessidadePendencia)
            dictDestino(idProd) = Array(estoqueAtual, consumoMedio, necessidade)
        End If
    Next i
    
    ' 3. Criar Relatório
    Set wsRelatorio = Sheets.Add(After:=Sheets(Sheets.Count))
    wsRelatorio.Name = "Sugestao_" & Format(Now, "ddhhmm")
    
    wsRelatorio.Range("A1:H1").Value = Array("ID", "Produto", "Lote", "Validade", "Estoque Destino", "Consumo Médio", "Qtd Lote", "Qtd Sugerida")
    wsRelatorio.Range("A1:H1").Font.Bold = True
    wsRelatorio.Range("A1:H1").Interior.Color = RGB(79, 70, 229) ' Indigo
    wsRelatorio.Range("A1:H1").Font.Color = RGB(255, 255, 255)
    
    destRow = 2
    lastRowOrigem = wsOrigem.Cells(wsOrigem.Rows.Count, "B").End(xlUp).Row
    
    ' DICA: Para melhor resultado FEFO, ordene a planilha de origem por Validade antes de rodar.
    
    ' 4. Processar Lotes da Origem
    For i = 2 To lastRowOrigem
        idProd = Trim(CStr(wsOrigem.Cells(i, 2).Value))
        
        If dictDestino.Exists(idProd) Then
            dadosDestino = dictDestino(idProd)
            necRestante = CDbl(dadosDestino(2)) ' Pega necessidade pendente
            
            ' Ler dados do lote
            qtdLote = 0
            On Error Resume Next
            qtdLote = CDbl(wsOrigem.Cells(i, 19).Value) ' Tenta Coluna S
            If qtdLote = 0 Then qtdLote = CDbl(wsOrigem.Cells(i, 21).Value) ' Tenta Coluna U
            On Error GoTo 0
            
            If necRestante > 0 And qtdLote > 0 Then
                nomeProd = wsOrigem.Cells(i, 3).Value
                lote = wsOrigem.Cells(i, 9).Value
                validade = wsOrigem.Cells(i, 11).Value
                
                ' Define quanto transferir deste lote
                If qtdLote >= necRestante Then
                    aTransferir = necRestante
                    dadosDestino(2) = 0 ' Necessidade totalmente atendida
                Else
                    aTransferir = qtdLote
                    dadosDestino(2) = necRestante - qtdLote ' Ainda falta
                End If
                
                ' Atualiza a necessidade pendente no dicionário
                dictDestino(idProd) = dadosDestino
                
                ' Escreve linha no relatório
                wsRelatorio.Cells(destRow, 1).Value = idProd
                wsRelatorio.Cells(destRow, 2).Value = nomeProd
                wsRelatorio.Cells(destRow, 3).Value = lote
                wsRelatorio.Cells(destRow, 4).Value = validade
                wsRelatorio.Cells(destRow, 5).Value = dadosDestino(0) ' Estoque Destino
                wsRelatorio.Cells(destRow, 6).Value = dadosDestino(1) ' Consumo Médio
                wsRelatorio.Cells(destRow, 7).Value = qtdLote
                wsRelatorio.Cells(destRow, 8).Value = aTransferir
                
                destRow = destRow + 1
            End If
        End If
    Next i
    
    wsRelatorio.Columns("A:H").AutoFit
    MsgBox "Sugestão gerada com sucesso!", vbInformation
End Sub
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(vbaCode);
    alert('Código copiado para a área de transferência!');
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Macro VBA para Excel</h3>
          <p className="text-sm text-slate-500">
            Use este código no Excel para gerar a sugestão de requisição offline.
          </p>
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
        >
          <Copy className="w-4 h-4" />
          Copiar Código
        </button>
      </div>

      <div className="relative">
        <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
          <code>{vbaCode}</code>
        </pre>
      </div>
      
      <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h4 className="font-semibold text-blue-900 mb-2">Como usar:</h4>
        <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
          <li>No Excel, pressione <strong>ALT + F11</strong> para abrir o editor VBA.</li>
          <li>Vá em <strong>Inserir &gt; Módulo</strong>.</li>
          <li>Cole o código acima.</li>
          <li>Feche o editor e pressione <strong>ALT + F8</strong> para executar a macro <code>GerarSugestaoRequisicao</code>.</li>
        </ol>
      </div>
    </div>
  );
};

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io

app = FastAPI()

# Configuração CORS para permitir que o Frontend React acesse a API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique a URL do frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Sistema de BI Inteligente API Online"}

@app.post("/analyze")
async def analyze_file(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        return {"error": "Formato de arquivo inválido. Por favor envie .xlsx ou .csv"}
    
    try:
        contents = await file.read()
        # Ler as primeiras linhas para identificar onde está o cabeçalho
        # Procurar por uma linha que contenha colunas comuns como "Data", "Total", "Dinheiro"
        header_row = 0
        if file.filename.endswith(('.xlsx', '.xls')):
            # Ler primeiras 10 linhas sem cabeçalho para inspecionar
            temp_df = pd.read_excel(io.BytesIO(contents), header=None, nrows=10)
            
            # Procurar linha de cabeçalho
            for i, row in temp_df.iterrows():
                row_str = row.astype(str).str.lower().tolist()
                # Verifica se contém palavras chaves de cabeçalho
                if any(k in row_str for k in ['data', 'total', 'dinheiro', 'valor']):
                    header_row = i
                    break
            
            # Recarregar com o cabeçalho correto
            df = pd.read_excel(io.BytesIO(contents), header=header_row)

            # --- Tratamento de Cabeçalhos Mesclados ---
            # Se houver colunas com "Unnamed" (típico de merge no Excel que o Pandas lê assim),
            # e a coluna anterior tiver nome, propaga o nome anterior.
            new_columns = []
            last_valid = "Index"
            
            for col in df.columns:
                col_str = str(col)
                if "Unnamed" in col_str:
                    new_columns.append(f"{last_valid}_{col_str}") # Mantém único mas referenciando o pai
                else:
                    last_valid = col_str
                    new_columns.append(col_str)
            
            # Se for muito complexo, apenas usar ffill nos nomes das colunas (abordagem simplificada)
            # Vamos tentar apenas manter as colunas originais mas limpando 'Unnamed' se possível,
            # ou melhor, se a estrutura é complexa como "CLINICA -> DINHEIRO", talvez precisemos ler DUAS linhas de cabeçalho.
            # Mas vamos focar primeiro em não mostrar "CLINICA.1", "CLINICA.2" sem contexto.
            
            # Na imagem, parece que há duas linhas de cabeçalho.
            # Linha 4: CLINICA | CLINICA | CLINICA
            # Linha 5: DINHEIRO| CONTA   | CIELO
            
            # Se identificarmos isso, podemos fundir os nomes.
            # Verifica se a próxima linha parece ser uma continuação do cabeçalho
            if len(df) > 0:
                 first_row = df.iloc[0].astype(str).str.lower().tolist()
                 if any(k in first_row for k in ['dinheiro', 'conta', 'cielo', 'paypal']):
                     # É um cabeçalho de duas linhas!
                     # Vamos criar novos nomes de colunas combinando Linha 4 + Linha 5
                     actual_cols = []
                     for i, col in enumerate(df.columns):
                         top_header = str(col).replace(".1", "").replace(".2", "") # Remove sufixos do pandas
                         if "Unnamed" in top_header:
                             top_header = "" # Ignora Unnamed top levels se não tiver merge claro
                         
                         sub_header = str(df.iloc[0, i])
                         if sub_header == "nan": sub_header = ""
                         
                         if top_header and sub_header:
                             actual_cols.append(f"{top_header} - {sub_header}")
                         elif sub_header:
                             actual_cols.append(sub_header)
                         else:
                             actual_cols.append(top_header)
                     
                     df.columns = actual_cols
                     df = df.iloc[1:].reset_index(drop=True) # Remove a linha de sub-cabeçalho dos dados


        else:
            df = pd.read_csv(io.BytesIO(contents))
        
        # Limpeza de dados (Converter "R$ 1.000,00" para float)
        for col in df.columns:
            # Se for object, tentar limpar caracteres de moeda
            if df[col].dtype == 'object':
                try:
                    # Remove R$, espaços, pontos de milhar e troca vírgula por ponto
                    # Exemplo: "R$ 1.500,50" -> "1500.50"
                    # Usa regex para remover tudo que não é número, virgula ou traço (para negativos)
                    clean_col = df[col].astype(str).str.replace(r'[R$\s.]', '', regex=True).str.replace(',', '.')
                    # Tenta converter para numérico após limpeza
                    df[col] = pd.to_numeric(clean_col, errors='ignore')
                except Exception:
                    pass
            
            # Tentar converter colunas numéricas padrão (caso a limpeza acima não tenha pego ou não seja moeda)
            if df[col].dtype == 'object':
                try:
                    df[col] = pd.to_numeric(df[col], errors='ignore')
                except (ValueError, TypeError):
                    pass

        # Análise básica para identificar colunas
        columns = df.columns.tolist()
        
        # Identificar tipos de colunas AGORA, antes de qualquer sanitização que bagunce os tipos
        dtypes = df.dtypes.apply(lambda x: x.name).to_dict()

        # Substituir NaN por None para compatibilidade com JSON
        # É necessário converter para object para garantir que None não vire NaN em colunas numéricas
        df_clean = df.astype(object).where(pd.notnull(df), None)
        
        summary = df.describe().to_dict()
        
        # Sanitização do summary
        summary_clean = {}
        for col, stats in summary.items():
            summary_clean[col] = {k: (v if pd.notna(v) else None) for k, v in stats.items()}

        head = df_clean.head(5).to_dict(orient='records')
        
        return {
            "filename": file.filename,
            "columns": columns,
            "dtypes": dtypes,
            "row_count": len(df),
            "preview": head,
            "summary": summary_clean
        }

    except Exception as e:
        return {"error": str(e)}

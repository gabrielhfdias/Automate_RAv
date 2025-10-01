import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { aluno_id } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Buscar dados do aluno
    const { data: aluno, error: alunoError } = await supabase
      .from('alunos')
      .select('*')
      .eq('id', aluno_id)
      .single()

    if (alunoError || !aluno) {
      throw new Error('Aluno não encontrado')
    }

    // Buscar configuração do professor
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('professor_id', aluno.professor_id)
      .eq('bimestre', aluno.bimestre)
      .maybeSingle()

    if (configError) {
      console.error('Erro ao buscar configuração:', configError)
    }

    // Gerar HTML estruturado para o documento
    const htmlContent = generateHTMLDocument(aluno, config)
    
    // Salvar como HTML primeiro (mais confiável)
    // Sanitizar nome do arquivo removendo caracteres especiais
    const sanitizedName = aluno.nome.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const sanitizedBimestre = aluno.bimestre.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const fileName = `rav_${sanitizedName}_${sanitizedBimestre}_${Date.now()}.html`
    
    const encoder = new TextEncoder()
    const fileBytes = encoder.encode(htmlContent)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('relatorios-processados')
      .upload(fileName, fileBytes, {
        contentType: 'text/html',
        upsert: false
      })

    if (uploadError) {
      console.error('Erro no upload:', uploadError)
      throw new Error('Erro ao salvar arquivo')
    }

    console.log('Documento HTML gerado com sucesso:', fileName)

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName,
        message: 'Documento gerado com sucesso'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error: any) {
    console.error('Erro na geração do documento:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro interno do servidor' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

function generateHTMLDocument(aluno: any, config: any): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RAV - ${aluno.nome}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: 'Times New Roman', serif;
            font-size: 12pt;
            line-height: 1.5;
            margin: 20px;
            color: #000;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
        }
        
        .header h1 {
            font-size: 14pt;
            font-weight: bold;
            margin: 5px 0;
        }
        
        .header h2 {
            font-size: 12pt;
            font-weight: bold;
            margin: 5px 0;
        }
        
        .section {
            margin: 20px 0;
        }
        
        .section-title {
            font-weight: bold;
            font-size: 12pt;
            margin-bottom: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
        }
        
        .data-row {
            margin: 8px 0;
            display: flex;
            justify-content: space-between;
        }
        
        .data-label {
            font-weight: bold;
        }
        
        .content-area {
            border: 1px solid #000;
            padding: 15px;
            margin: 20px 0;
            min-height: 300px;
            text-align: justify;
        }
        
        .signature-area {
            margin-top: 50px;
            border-top: 1px solid #000;
            padding-top: 20px;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            width: 400px;
            margin: 20px 0;
            padding-bottom: 5px;
            display: inline-block;
        }
        
        @page {
            margin: 2cm;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL</h1>
        <h2>COORDENAÇÃO REGIONAL DE ENSINO ${(config?.coordenacao_regional || 'NÃO INFORMADO').toUpperCase()}</h2>
        <h2>${(config?.unidade_escolar || 'UNIDADE ESCOLAR NÃO INFORMADA').toUpperCase()}</h2>
        
        <div style="margin-top: 20px;">
            <h1>REGISTRO DE AVALIAÇÃO - RAv</h1>
            <p style="font-size: 10pt;">Formulário 1: Descrição do Processo de Aprendizagem do Estudante Ensino Fundamental (Anos Iniciais)</p>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DADOS DO ESTUDANTE</div>
        
        <div class="data-row">
            <span><span class="data-label">Ano Letivo:</span> ${config?.ano_letivo || '2025'}</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Coordenação Regional de Ensino:</span> ${config?.coordenacao_regional || 'Ceilândia'}</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Unidade Escolar:</span> ${config?.unidade_escolar || 'Escola Classe 26'}</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Bloco:</span> ( x ) 1º Bloco (  ) 2º Bloco</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Ano:</span> ${config?.ano || '1º'}</span>
            <span><span class="data-label">Turma:</span> ${config?.turma_config || 'C'}</span>
            <span><span class="data-label">Turno:</span> (  ) Matutino  ( x ) Vespertino  (  ) Integral</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Professor(a) regente da turma:</span> ${config?.professor || 'Não informado'}</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Estudante:</span> ${aluno.nome}</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Apresenta Deficiência ou TEA?</span> ( x ) não ( ) sim</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Houve adequação curricular?</span> ( x ) não ( ) sim</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Estudante indicado para temporalidade?</span> ( x ) não ( ) sim</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Está sendo atendido em Sala de Recursos?</span> ( x ) não ( ) sim</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Estudante do Programa SuperAção "setado" no Sistema de Gestão i-Educar?</span> ( ) não ( ) sim</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Atendimento:</span></span>
        </div>
        <div class="data-row">
            <span>(  ) Classe Comum com atendimento personalizado ( ) Turma SuperAção</span>
        </div>
        <div class="data-row">
            <span>(  ) Turma SuperAção Reduzida</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">Foi aplicada a Organização Curricular específica do Programa Superação?</span> ( ) não (   ) sim ( ) parcialmente</span>
        </div>
        
        <div class="data-row">
            <span><span class="data-label">${aluno.bimestre} - Total de dias letivos:</span> 51</span>
            <span><span class="data-label">Total de Faltas:</span> 01</span>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DESCRIÇÃO DO PROCESSO DE APRENDIZAGEM (COLUNA B)</div>
        
        <div class="content-area">
            ${aluno.coluna_b_gerada ? aluno.coluna_b_gerada.replace(/\n/g, '<br><br>') : 'Descrição não disponível.'}
        </div>
    </div>

    <div class="signature-area">
        <div class="data-row">
            <span><span class="data-label">Local/Data:</span> Brasília - DF, ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>
        
        <br><br>
        
        <div>
            <span class="signature-line"></span><br>
            <span style="font-size: 10pt;">Assinatura/Matrícula do(a) Professor(a): ${config?.professor || ''}</span>
        </div>
    </div>

    <div class="no-print" style="margin-top: 30px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; font-size: 12pt; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Imprimir/Salvar como PDF
        </button>
    </div>
</body>
</html>
`
}
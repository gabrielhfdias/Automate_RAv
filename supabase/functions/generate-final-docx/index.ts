import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  aluno_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { aluno_id }: RequestBody = await req.json()

    console.log('Gerando DOCX final para aluno:', aluno_id)

    // Buscar dados do aluno
    const { data: aluno, error: alunoError } = await supabaseClient
      .from('alunos')
      .select('*')
      .eq('id', aluno_id)
      .single()

    if (alunoError || !aluno) {
      throw new Error(`Aluno não encontrado: ${alunoError?.message}`)
    }

    if (!aluno.coluna_b_gerada) {
      throw new Error('Coluna B não foi gerada ainda')
    }

    // Buscar configurações básicas do professor
    const { data: configBasica } = await supabaseClient
      .from('configuracoes')
      .select('*')
      .eq('professor_id', aluno.professor_id)
      .single()

    // Buscar configurações do professor para obter o template
    const { data: config, error: configError } = await supabaseClient
      .from('configuracoes')
      .select('template_id, templates!inner(arquivo_path)')
      .eq('professor_id', aluno.professor_id)
      .maybeSingle()

    if (configError || !config?.template_id) {
      console.log('Config error:', configError)
      console.log('Config data:', config)
      // Para casos sem template configurado, usar template padrão integrado
      return await generateWithoutTemplate(supabaseClient, aluno, aluno_id, configBasica)
    }

    // Baixar template
    const templatePath = (config.templates as any)?.arquivo_path
    if (!templatePath) {
      throw new Error('Caminho do template não encontrado')
    }

    const { data: templateData, error: downloadError } = await supabaseClient.storage
      .from('templates')
      .download(templatePath)

    if (downloadError) {
      throw new Error(`Erro ao baixar template: ${downloadError.message}`)
    }

    // Converter template para texto e substituir placeholders
    const templateBuffer = await templateData.arrayBuffer()
    const templateText = new TextDecoder().decode(templateBuffer)
    
    // Substituir placeholders no template
    let processedTemplate = templateText
      .replace(/\$\{Professor\}/g, configBasica?.professor || '')
      .replace(/\$\{Aluno\}/g, aluno.nome || '')
      .replace(/\$\{.*?Bimestre\}/g, aluno.bimestre || '')
      .replace(/TEXTO-B DE AVALIAÇÃO GERADO POR IA/g, aluno.coluna_b_gerada || '')
      .replace(/data atual aqui/g, new Date().toLocaleDateString('pt-BR'))
      .replace(/matrícula do professor aqui \d+/g, `matrícula ${configBasica?.matricula || ''}`)
    
    // Criar documento RTF baseado no novo template
    const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
{\\colortbl ;\\red0\\green0\\blue0;}
\\f0\\fs24
{\\qc\\b\\fs28 SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL\\par}
{\\qc\\b\\fs28 SUBSECRETARIA DE EDUCAÇÃO BÁSICA\\par}
\\par
{\\qc\\b\\fs28 REGISTRO DE AVALIAÇÃO - RAv\\par}
\\par
{\\qc\\b\\fs24 Formulário 1: Descrição do Processo de Aprendizagem do Estudante\\par}
{\\qc\\b\\fs24 Ensino Fundamental (Anos Iniciais)\\par}
\\par\\par
{\\b Ano Letivo:} ${configBasica?.ano_letivo || new Date().getFullYear()}\\par
\\par
{\\b Coordenação Regional de Ensino:} ${configBasica?.coordenacao_regional || 'Ceilândia'}\\par
\\par
{\\b Unidade Escolar:} ${configBasica?.unidade_escolar || 'Escola Classe 26'}\\par
\\par
{\\b Bloco:} ( x ) 1º Bloco (  ) 2º Bloco\\par
\\par
{\\b Ano:} ${configBasica?.ano || '1º'}           {\\b Turma:} ${configBasica?.turma_config || 'C'}         {\\b Turno:} (        ) Matutino  ( x ) Vespertino  (  ) Integral\\par
\\par
{\\b Professor(a) regente da turma:} ${configBasica?.professor || ''}\\par
\\par
{\\b Estudante:} ${aluno.nome}\\par
\\par
{\\b Apresenta Deficiência ou TEA?} ( x  ) não ( ) sim\\par
\\par
{\\b Houve adequação curricular?} ( x ) não ( ) sim\\par
\\par
{\\b Estudante indicado para temporalidade?} ( x ) não ( ) sim\\par
\\par
{\\b Está sendo atendido em Sala de Recursos?} ( x ) não ( ) sim\\par
\\par
{\\b Estudante do Programa SuperAção "setado" no Sistema de Gestão i-Educar?} ( ) não ( ) sim\\par
\\par
{\\b Atendimento:}\\par
(  ) Classe Comum com atendimento personalizado ( ) Turma SuperAção\\par
(  ) Turma SuperAção Reduzida\\par
\\par
{\\b Foi aplicada a Organização Curricular específica do Programa Superação?} ( ) não (   ) sim ( ) parcialmente\\par
\\par
{\\b ${aluno.bimestre}} - {\\b Total de dias letivos:} 51 - {\\b Total de Faltas:} 01\\par
\\par\\par
{\\b\\fs26 DESCRIÇÃO DO PROCESSO DE APRENDIZAGEM (COLUNA B):\\par}
\\par
${aluno.coluna_b_gerada.split('\n\n').map((paragrafo: string) => `${paragrafo}\\par\\par`).join('')}
\\par\\par\\par
{\\pard\\page}
{\\qc\\b\\fs28 SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL\\par}
{\\qc\\b\\fs28 SUBSECRETARIA DE EDUCAÇÃO BÁSICA\\par}
\\par\\par
{\\b Local/Data:} Ceilândia – DF, ${new Date().toLocaleDateString('pt-BR')}\\par
\\par\\par
_________________________________________________\\par
{\\b Assinatura/Matrícula do(a) Professor(a):} ${configBasica?.professor || ''} - ${configBasica?.matricula || ''}\\par
\\par\\par
_________________________________________________\\par
{\\b Assinatura/Matrícula do(a) Coordenador(a) Pedagógico}\\par
\\par\\par
_________________________________________________\\par
{\\b Assinatura do(a) Pai/Mãe ou Responsável Legal}\\par
\\par\\par
{\\b\\fs26 Resultado Final (Preencher somente ao final do 4º bimestre)}\\par
\\par
(  ) Cursando\\par
(  ) Progressão Continuada\\par
(  ) Avanço das Aprendizagens- Correção de Fluxo\\par
( ) Aprovado\\par
(  ) Reprovado\\par
(  ) Abandono\\par
\\par
{\\fs10 RAv_ versão 2025}\\par
}`

    // Criar um blob RTF
    const blob = new Blob([rtfContent], { 
      type: 'application/rtf'
    })
    
    // Nome do arquivo final
    const nomeArquivoLimpo = aluno.nome.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const bimestreLimpo = aluno.bimestre.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const fileName = `RAV_${nomeArquivoLimpo}_${bimestreLimpo}.rtf`
    const filePath = `${aluno.professor_id}/${fileName}`

    // Upload do documento final
    const { error: uploadError } = await supabaseClient.storage
      .from('relatorios-processados')
      .upload(filePath, blob, {
        contentType: 'application/rtf',
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Erro ao fazer upload: ${uploadError.message}`)
    }

    // Atualizar aluno com caminho do arquivo processado
    await supabaseClient
      .from('alunos')
      .update({
        arquivo_processado_path: filePath,
        status: 'concluido'
      })
      .eq('id', aluno_id)

    return new Response(JSON.stringify({
      success: true,
      message: 'Documento final gerado com sucesso',
      file_path: filePath
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error('Erro:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// Função auxiliar para gerar documento sem template
async function generateWithoutTemplate(supabaseClient: any, aluno: any, aluno_id: string, configBasica: any) {
  console.log('Gerando documento sem template configurado')
  
  const rtfContent = `{\\rtf1\\ansi\\deff0 {\\fonttbl {\\f0 Times New Roman;}}
{\\colortbl ;\\red0\\green0\\blue0;}
\\f0\\fs24
{\\qc\\b\\fs28 SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL\\par}
{\\qc\\b\\fs28 SUBSECRETARIA DE EDUCAÇÃO BÁSICA\\par}
\\par
{\\qc\\b\\fs28 REGISTRO DE AVALIAÇÃO - RAv\\par}
\\par
{\\qc\\b\\fs24 Formulário 1: Descrição do Processo de Aprendizagem do Estudante\\par}
{\\qc\\b\\fs24 Ensino Fundamental (Anos Iniciais)\\par}
\\par\\par
{\\b Ano Letivo:} ${configBasica?.ano_letivo || new Date().getFullYear()}\\par
\\par
{\\b Coordenação Regional de Ensino:} ${configBasica?.coordenacao_regional || 'Ceilândia'}\\par
\\par
{\\b Unidade Escolar:} ${configBasica?.unidade_escolar || 'Escola Classe 26'}\\par
\\par
{\\b Bloco:} ( x ) 1º Bloco (  ) 2º Bloco\\par
\\par
{\\b Ano:} ${configBasica?.ano || '1º'}           {\\b Turma:} ${configBasica?.turma_config || 'C'}         {\\b Turno:} (        ) Matutino  ( x ) Vespertino  (  ) Integral\\par
\\par
{\\b Professor(a) regente da turma:} ${configBasica?.professor || ''}\\par
\\par
{\\b Estudante:} ${aluno.nome}\\par
\\par
{\\b Apresenta Deficiência ou TEA?} ( x  ) não ( ) sim\\par
\\par
{\\b Houve adequação curricular?} ( x ) não ( ) sim\\par
\\par
{\\b Estudante indicado para temporalidade?} ( x ) não ( ) sim\\par
\\par
{\\b Está sendo atendido em Sala de Recursos?} ( x ) não ( ) sim\\par
\\par
{\\b Estudante do Programa SuperAção "setado" no Sistema de Gestão i-Educar?} ( ) não ( ) sim\\par
\\par
{\\b Atendimento:}\\par
(  ) Classe Comum com atendimento personalizado ( ) Turma SuperAção\\par
(  ) Turma SuperAção Reduzida\\par
\\par
{\\b Foi aplicada a Organização Curricular específica do Programa Superação?} ( ) não (   ) sim ( ) parcialmente\\par
\\par
{\\b ${aluno.bimestre}} - {\\b Total de dias letivos:} 51 - {\\b Total de Faltas:} 01\\par
\\par\\par
{\\b\\fs26 DESCRIÇÃO DO PROCESSO DE APRENDIZAGEM (COLUNA B):\\par}
\\par
${aluno.coluna_b_gerada.split('\n\n').map((paragrafo: string) => `${paragrafo}\\par\\par`).join('')}
\\par\\par\\par
{\\pard\\page}
{\\qc\\b\\fs28 SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL\\par}
{\\qc\\b\\fs28 SUBSECRETARIA DE EDUCAÇÃO BÁSICA\\par}
\\par\\par
{\\b Local/Data:} Ceilândia – DF, ${new Date().toLocaleDateString('pt-BR')}\\par
\\par\\par
_________________________________________________\\par
{\\b Assinatura/Matrícula do(a) Professor(a):} ${configBasica?.professor || ''} - ${configBasica?.matricula || ''}\\par
\\par\\par
_________________________________________________\\par
{\\b Assinatura/Matrícula do(a) Coordenador(a) Pedagógico}\\par
\\par\\par
_________________________________________________\\par
{\\b Assinatura do(a) Pai/Mãe ou Responsável Legal}\\par
\\par\\par
{\\b\\fs26 Resultado Final (Preencher somente ao final do 4º bimestre)}\\par
\\par
(  ) Cursando\\par
(  ) Progressão Continuada\\par
(  ) Avanço das Aprendizagens- Correção de Fluxo\\par
( ) Aprovado\\par
(  ) Reprovado\\par
(  ) Abandono\\par
\\par
{\\fs10 RAv_ versão 2025}\\par
}`
  
  // Criar um blob RTF
  const blob = new Blob([rtfContent], { 
    type: 'application/rtf'
  })
  
  // Nome do arquivo final - removendo caracteres especiais
  const nomeArquivoLimpo = aluno.nome.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
  const bimestreLimpo = aluno.bimestre.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
  const fileName = `RAV_${nomeArquivoLimpo}_${bimestreLimpo}.rtf`
  const filePath = `${aluno.professor_id}/${fileName}`

  // Upload do documento final
  const { error: uploadError } = await supabaseClient.storage
    .from('relatorios-processados')
    .upload(filePath, blob, {
      contentType: 'application/rtf',
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Erro ao fazer upload: ${uploadError.message}`)
  }

  // Atualizar aluno com caminho do arquivo processado
  await supabaseClient
    .from('alunos')
    .update({
      arquivo_processado_path: filePath,
      status: 'concluido'
    })
    .eq('id', aluno_id)

  return new Response(JSON.stringify({
    success: true,
    message: 'Documento final gerado com sucesso',
    file_path: filePath
  }), {
    headers: { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Content-Type': 'application/json' 
    }
  })
}
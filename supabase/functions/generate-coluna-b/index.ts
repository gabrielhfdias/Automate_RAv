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

    console.log('Gerando Coluna B para aluno:', aluno_id)

    // Atualizar status
    await supabaseClient
      .from('alunos')
      .update({ status: 'processando_resposta' })
      .eq('id', aluno_id)

    // Buscar dados do aluno
    const { data: aluno, error: alunoError } = await supabaseClient
      .from('alunos')
      .select('*')
      .eq('id', aluno_id)
      .single()

    if (alunoError || !aluno) {
      throw new Error(`Aluno não encontrado: ${alunoError?.message}`)
    }

    // Buscar respostas do professor
    const { data: respostas, error: respostasError } = await supabaseClient
      .from('rav_answers')
      .select(`
        resposta,
        observacao,
        rav_questions!inner (pergunta)
      `)
      .eq('aluno_id', aluno_id)

    if (respostasError) {
      throw new Error(`Erro ao buscar respostas: ${respostasError.message}`)
    }

    if (!respostas || respostas.length === 0) {
      throw new Error('Nenhuma resposta encontrada para este aluno')
    }

    // Buscar dados do bimestre anterior para comparação
    const bimestreAtual = aluno.bimestre
    let bimestreAnterior = ''
    let dadosBimestreAnterior = ''
    
    // Determinar bimestre anterior
    if (bimestreAtual.includes('2º')) {
      bimestreAnterior = '1º Bimestre'
    } else if (bimestreAtual.includes('3º')) {
      bimestreAnterior = '2º Bimestre'
    } else if (bimestreAtual.includes('4º')) {
      bimestreAnterior = '3º Bimestre'
    }
    
    if (bimestreAnterior) {
      console.log(`Buscando dados do ${bimestreAnterior} para comparação`)
      
      // Buscar aluno do bimestre anterior
      const { data: alunoAnterior } = await supabaseClient
        .from('alunos')
        .select('coluna_b_gerada, evidencias_extraidas')
        .eq('nome', aluno.nome)
        .eq('professor_id', aluno.professor_id)
        .eq('bimestre', bimestreAnterior)
        .single()
      
      if (alunoAnterior?.coluna_b_gerada) {
        dadosBimestreAnterior = alunoAnterior.coluna_b_gerada
        console.log('Dados do bimestre anterior encontrados para comparação')
      } else if (alunoAnterior?.evidencias_extraidas) {
        dadosBimestreAnterior = alunoAnterior.evidencias_extraidas
        console.log('Evidências do bimestre anterior encontradas para comparação')
      }
    }

    // Prompt melhorado para gerar Coluna B original baseada nas respostas
    const systemPrompt = `Você é um especialista em educação que escreve relatórios RAV para a SEEDF.

CRÍTICO: Escreva um texto COMPLETAMENTE ORIGINAL sobre o bimestre atual baseado nas RESPOSTAS ESPECÍFICAS do professor.
- NÃO copie ou reutilize frases dos textos anteriores
- CRIE conteúdo novo e específico baseado apenas nas respostas do professor
- Use textos anteriores apenas como contexto histórico, nunca como modelo

Estrutura obrigatória (3-4 parágrafos):
1º parágrafo: Comportamento, participação e relacionamento interpessoal
2º parágrafo: Desenvolvimento pedagógico e habilidades de aprendizagem específicas
3º parágrafo: Desempenho nas disciplinas (baseado nas respostas específicas)
4º parágrafo: Atividades complementares, coordenação motora e aspectos gerais

Tom: formal, institucional da SEEDF, 3ª pessoa, respeitoso e técnico.`

    const respostasFormatadas = respostas.map((r: any) => `
PERGUNTA: ${r.rav_questions?.pergunta}
RESPOSTA DO PROFESSOR: ${r.resposta}
${r.observacao ? `OBSERVAÇÃO ADICIONAL: ${r.observacao}` : ''}
`).join('\n---\n')

    const userPrompt = `
ESTUDANTE: ${aluno.nome}
BIMESTRE ATUAL: ${bimestreAtual}

${dadosBimestreAnterior ? `HISTÓRICO DO BIMESTRE ANTERIOR (${bimestreAnterior}) - Para contexto histórico apenas, NÃO copie este texto:
${dadosBimestreAnterior.substring(0, 300)}...
` : ''}

RESPOSTAS ESPECÍFICAS DO PROFESSOR (FONTE PRINCIPAL DO NOVO TEXTO):
${respostasFormatadas}

EVIDÊNCIAS COMPLEMENTARES:
${aluno.evidencias_extraidas ? aluno.evidencias_extraidas.substring(0, 500) : 'Nenhuma evidência específica disponível.'}

INSTRUÇÕES CRÍTICAS:
1. Escreva 3-4 parágrafos COMPLETAMENTE ORIGINAIS baseados nas respostas específicas do professor
2. ${dadosBimestreAnterior ? 'Faça comparações com o bimestre anterior apenas quando as respostas indicarem evolução ou mudanças' : 'Foque no desenvolvimento atual evidenciado pelas respostas'}
3. CADA PARÁGRAFO deve ter informações NOVAS baseadas nas respostas específicas do professor
4. NÃO reutilize frases ou estruturas dos textos anteriores
5. Cite aspectos específicos mencionados pelo professor nas respostas
6. Use linguagem técnica pedagógica da SEEDF

Comece com "Ao longo do ${bimestreAtual}..." e retorne APENAS o texto final dos parágrafos.`

    // Chamar Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text()
      console.error('Erro na resposta da API:', aiResponse.status, errorText)
      throw new Error(`Erro na API do Lovable AI: ${aiResponse.status}`)
    }

    const aiResult = await aiResponse.json()
    const colunaB = aiResult.choices[0].message.content.trim()

    console.log('Coluna B gerada:', colunaB)

    // Salvar Coluna B gerada
    await supabaseClient
      .from('alunos')
      .update({
        coluna_b_gerada: colunaB,
        status: 'gerando_documento',
        prompt2_payload: { prompt: userPrompt, response: colunaB }
      })
      .eq('id', aluno_id)

    return new Response(JSON.stringify({
      success: true,
      message: 'Coluna B gerada com sucesso',
      coluna_b: colunaB
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
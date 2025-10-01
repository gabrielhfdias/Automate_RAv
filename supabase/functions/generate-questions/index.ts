import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  aluno_id: string
  prompt_tipo?: string
}

interface Question {
  pergunta: string
  tipo: string
  opcoes?: string[]
  campo_id?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { aluno_id, prompt_tipo } = await req.json() as RequestBody
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Atualizar o status do aluno para 'aguardando_perguntas'
    await supabaseClient
      .from('alunos')
      .update({ status: 'aguardando_perguntas' })
      .eq('id', aluno_id)

    // Buscar dados do aluno
    const { data: aluno, error: alunoError } = await supabaseClient
      .from('alunos')
      .select('*')
      .eq('id', aluno_id)
      .single()

    if (alunoError || !aluno) {
      throw new Error('Aluno não encontrado')
    }

    console.log('Processando aluno:', aluno.nome, 'Bimestre:', aluno.bimestre)

    // Buscar configuração do professor e perguntas fixas
    const { data: config, error: configError } = await supabaseClient
      .from('configuracoes')
      .select('*')
      .eq('professor_id', aluno.professor_id)
      .maybeSingle()

    if (configError) {
      console.error('Erro ao buscar configuração:', configError)
    }

    const { data: perguntasFixas, error: perguntasError } = await supabaseClient
      .from('perguntas_fixas')
      .select('*')
      .eq('professor_id', aluno.professor_id)
      .eq('ativa', true)
      .order('ordem')

    if (perguntasError) {
      console.error('Erro ao buscar perguntas fixas:', perguntasError)
    }

    const promptTipo = prompt_tipo || config?.prompt_tipo || 'fixo'
    const temEvidenciasExtraidas = aluno.evidencias_extraidas && aluno.evidencias_extraidas.trim().length > 0
    const temPerguntasFixas = perguntasFixas && perguntasFixas.length > 0

    console.log('Configuração:', { promptTipo, temEvidenciasExtraidas, temPerguntasFixas })

    // Buscar dados do bimestre anterior para prompt dinâmico
    let bimestreAnteriorData = null
    if (promptTipo === 'dinamico') {
      const { data: alunoAnterior } = await supabaseClient
        .from('alunos')
        .select('coluna_b_gerada, bimestre')
        .eq('nome', aluno.nome)
        .eq('professor_id', aluno.professor_id)
        .neq('bimestre', aluno.bimestre)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (alunoAnterior && alunoAnterior.coluna_b_gerada) {
        bimestreAnteriorData = alunoAnterior
        console.log('Dados do bimestre anterior encontrados para prompt dinâmico:', alunoAnterior.bimestre)
      }
    }

    let questionsToInsert: any[] = []
    let sourceType = ''

    if (promptTipo === 'fixo' && temPerguntasFixas) {
      // Usar apenas perguntas fixas
      console.log('Usando perguntas fixas apenas')
      questionsToInsert = perguntasFixas.map((pergunta, index) => {
        let opcoes = pergunta.opcoes;
        if ((pergunta.tipo === 'multipla_escolha' || pergunta.tipo === 'opcoes') && opcoes && Array.isArray(opcoes)) {
          const hasTodasOpcoes = opcoes.some(op => op.toLowerCase().includes('todas as alternativas'));
          const hasNenhumaOpcoes = opcoes.some(op => op.toLowerCase().includes('nenhuma das alternativas'));
          
          if (!hasTodasOpcoes && !hasNenhumaOpcoes) {
            opcoes = [...opcoes, "Todas as alternativas acima", "Nenhuma das alternativas acima"];
          }
        }
        
        return {
          aluno_id,
          pergunta: pergunta.pergunta,
          tipo: pergunta.tipo,
          opcoes: opcoes,
          campo_id: `pergunta_${index + 1}`,
          ordem: index + 1
        };
      })
      sourceType = 'perguntas_fixas'

    } else if (promptTipo === 'dinamico' && bimestreAnteriorData) {
      // Prompt dinâmico: Analisar bimestre anterior e gerar perguntas sobre evolução
      console.log('Usando prompt dinâmico - analisando bimestre anterior para gerar perguntas de evolução')
      
      const systemPrompt = `Você é um assistente pedagógico especializado em RAV da SEEDF. 
Sua função é analisar a descrição do bimestre anterior e gerar perguntas que ajudem o professor a avaliar a EVOLUÇÃO do aluno comparando o bimestre atual com o anterior.

Foque em:
- Se comportamentos melhoraram, pioraram ou persistem
- Se dificuldades foram superadas ou continuam
- Se pontos positivos se mantiveram ou regrediram
- Aspectos que precisam de acompanhamento continuado`

      const userPrompt = `
Analise a descrição do bimestre anterior e gere perguntas sobre a EVOLUÇÃO do aluno:

ALUNO: ${aluno.nome}
BIMESTRE ANTERIOR: ${bimestreAnteriorData.bimestre}
BIMESTRE ATUAL: ${aluno.bimestre}

DESCRIÇÃO DO BIMESTRE ANTERIOR:
"""
${bimestreAnteriorData.coluna_b_gerada}
"""

Instruções:
1. Gere NO MÁXIMO 9 perguntas baseadas na descrição do bimestre anterior
2. Perguntas devem focar na EVOLUÇÃO/COMPARAÇÃO entre bimestres
3. Use termos como "melhorou", "piorou", "manteve", "persiste", "evoluiu"
4. SEMPRE adicione uma 10ª pergunta: "Quais novos aspectos ou situações ocorreram com o aluno neste bimestre que não foram mencionados anteriormente?"
5. Use "multipla_escolha" para perguntas objetivas e "texto" para descritivas
6. Para múltipla escolha, use opções como: ["Melhorou significativamente", "Melhorou um pouco", "Manteve o mesmo nível", "Piorou um pouco", "Piorou significativamente", "Todas as alternativas acima", "Nenhuma das alternativas acima"]

Retorne APENAS JSON válido:
{
  "perguntas": [
    {
      "pergunta": "Em relação ao [aspecto mencionado no bimestre anterior], como você avalia a evolução do aluno?",
      "tipo": "multipla_escolha", 
      "opcoes": ["Melhorou significativamente", "Melhorou um pouco", "Manteve o mesmo nível", "Piorou um pouco", "Piorou significativamente", "Todas as alternativas acima", "Nenhuma das alternativas acima"],
      "campo_id": "evolucao_aspecto_1"
    },
    {
      "pergunta": "Quais novos aspectos ou situações ocorreram com o aluno neste bimestre que não foram mencionados anteriormente?",
      "tipo": "texto",
      "campo_id": "novos_aspectos_bimestre"
    }
  ]
}
`

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
          ],
        }),
      })

      if (!aiResponse.ok) {
        console.error('Erro na API da IA:', aiResponse.statusText)
        throw new Error(`Erro na API da IA: ${aiResponse.statusText}`)
      }

      const aiData = await aiResponse.json()
      const aiContent = aiData.choices[0].message.content
      
      console.log('Resposta da IA para prompt dinâmico:', aiContent)

      try {
        let cleanedContent = aiContent.trim()
        if (cleanedContent.startsWith('```json')) {
          cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (cleanedContent.startsWith('```')) {
          cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }
        
        const questionsData = JSON.parse(cleanedContent.trim())
        
        questionsToInsert = questionsData.perguntas.map((q: Question, index: number) => ({
          aluno_id,
          pergunta: q.pergunta,
          tipo: q.tipo,
          opcoes: q.opcoes,
          campo_id: q.campo_id,
          ordem: index + 1
        }))

        sourceType = 'dinamico_evolucao'
        
      } catch (parseError) {
        console.error('Erro ao parsear JSON da IA:', parseError)
        throw new Error('Resposta da IA não está em formato JSON válido')
      }

    } else {
      // Fallback para perguntas genéricas
      console.log('Usando perguntas genéricas (fallback)')
      questionsToInsert = [
        {
          aluno_id,
          pergunta: "1 - Compreensão e aplicação: O aluno demonstra compreensão dos conceitos apresentados e consegue aplicá-los em situações práticas?",
          tipo: "multipla_escolha",
          opcoes: ["Ótimo", "Bom", "Regular", "Ruim", "Todas as alternativas acima", "Nenhuma das alternativas acima"],
          campo_id: "compreensao_aplicacao",
          ordem: 1
        },
        {
          aluno_id,
          pergunta: "2 - Resolução de problemas e pensamento crítico: O aluno apresenta evidências de desenvolvimento do pensamento crítico e consegue resolver problemas de forma autônoma?",
          tipo: "multipla_escolha",
          opcoes: ["Ótimo", "Bom", "Regular", "Ruim", "Todas as alternativas acima", "Nenhuma das alternativas acima"],
          campo_id: "pensamento_critico",
          ordem: 2
        },
        {
          aluno_id,
          pergunta: "3 - Participação e engajamento: Como você avalia a participação e o engajamento do aluno nas atividades propostas?",
          tipo: "multipla_escolha",
          opcoes: ["Muito participativo", "Participativo", "Pouco participativo", "Não participativo", "Todas as alternativas acima", "Nenhuma das alternativas acima"],
          campo_id: "participacao",
          ordem: 3
        },
        {
          aluno_id,
          pergunta: "4 - Autonomia na aprendizagem: O aluno demonstra capacidade de aprender de forma independente e buscar soluções?",
          tipo: "multipla_escolha",
          opcoes: ["Muito autônomo", "Autônomo", "Pouco autônomo", "Dependente", "Todas as alternativas acima", "Nenhuma das alternativas acima"],
          campo_id: "autonomia",
          ordem: 4
        },
        {
          aluno_id,
          pergunta: "5 - Deseja incluir alguma observação adicional sobre este bimestre?",
          tipo: "texto",
          campo_id: "observacoes_adicionais",
          ordem: 5
        }
      ]
      sourceType = 'genericas'
    }

    // Inserir perguntas no banco
    const { error: insertError } = await supabaseClient
      .from('rav_questions')
      .insert(questionsToInsert)

    if (insertError) {
      console.error('Erro ao inserir perguntas:', insertError)
      throw new Error('Erro ao salvar perguntas no banco de dados')
    }

    // Atualizar status do aluno para 'aguardando_respostas' e salvar detalhes
    await supabaseClient
      .from('alunos')
      .update({ 
        status: 'aguardando_respostas',
        prompt1_payload: {
          questionsGenerated: questionsToInsert.length,
          sourceType: sourceType,
          timestamp: new Date().toISOString(),
          questionsData: questionsToInsert
        }
      })
      .eq('id', aluno_id)

    console.log(`${questionsToInsert.length} perguntas geradas com sucesso (${sourceType})`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        questionsGenerated: questionsToInsert.length,
        sourceType: sourceType,
        message: 'Perguntas geradas com sucesso'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error: any) {
    console.error('Erro na geração de perguntas:', error)
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
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import mammoth from 'https://esm.sh/mammoth@1.6.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  aluno_id: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { aluno_id }: RequestBody = await req.json()

    console.log('Iniciando extração de dados para aluno:', aluno_id)

    // Atualizar status para extraindo_dados
    await supabaseClient
      .from('alunos')
      .update({ status: 'extraindo_dados' })
      .eq('id', aluno_id)

    // Buscar o aluno
    const { data: aluno, error: alunoError } = await supabaseClient
      .from('alunos')
      .select('*')
      .eq('id', aluno_id)
      .single()

    if (alunoError || !aluno) {
      throw new Error(`Aluno não encontrado: ${alunoError?.message}`)
    }

    // Baixar o arquivo do Storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('documentos-alunos')
      .download(aluno.arquivo_original_path)

    if (downloadError) {
      throw new Error(`Erro ao baixar arquivo: ${downloadError.message}`)
    }

    // Converter para ArrayBuffer para processar
    const arrayBuffer = await fileData.arrayBuffer()
    
    let extractedText = ''
    let evidencias = ''
    
    try {
      // Extrair texto usando mammoth para documentos .docx
      if (aluno.arquivo_original_path.toLowerCase().endsWith('.docx')) {
        console.log('Processando arquivo .docx com mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer })
        extractedText = result.value
        
        // Processar o texto extraído para criar evidências estruturadas
        if (extractedText && extractedText.trim().length > 0) {
          // Tentar extrair o nome do estudante do documento
          let nomeExtraido = null
          
          console.log('Texto para análise (primeiros 1000 chars):', extractedText.substring(0, 1000))
          
          // Padrões mais robustos para capturar o nome completo
          const padroes = [
            /Estudante:\s*([^\r\n\t]+)/i,
            /Nome do estudante:\s*([^\r\n\t]+)/i,
            /Aluno:\s*([^\r\n\t]+)/i,
            /Aluna:\s*([^\r\n\t]+)/i,
            /Student:\s*([^\r\n\t]+)/i
          ]
          
          for (const padrao of padroes) {
            const match = extractedText.match(padrao)
            if (match && match[1]) {
              // Capturar todo o texto após "Estudante:" até quebra de linha
              let nomeCapturado = match[1].trim()
              
              // Limpar caracteres especiais mas manter espaços e letras
              nomeCapturado = nomeCapturado
                .replace(/[^\w\sÀ-ÿ]/g, ' ') // Remove caracteres especiais mas mantém acentos
                .replace(/\s+/g, ' ') // Normaliza espaços múltiplos
                .trim()
              
              // Só aceitar se tiver pelo menos 3 caracteres e parecer um nome
              if (nomeCapturado.length >= 3 && /^[A-ZÀ-Ÿa-zà-ÿ\s]+$/.test(nomeCapturado)) {
                nomeExtraido = nomeCapturado
                console.log('Nome extraído do documento:', nomeExtraido)
                console.log('Tamanho do nome:', nomeExtraido.length)
                break
              } else {
                console.log('Nome rejeitado (muito curto ou caracteres inválidos):', nomeCapturado)
              }
            }
          }
          
          // Se não encontrou nome, tentar buscar em outras partes do texto
          if (!nomeExtraido) {
            console.log('Tentando buscar nome em outras partes do texto...')
            // Buscar por padrões de nome próprio em maiúsculas
            const nomePattern = /\b[A-ZÀ-Ÿ][A-Za-zà-ÿ]+(?:\s+[A-ZÀ-Ÿ][A-Za-zà-ÿ]+)+\b/g
            const nomesEncontrados = extractedText.match(nomePattern)
            
            if (nomesEncontrados && nomesEncontrados.length > 0) {
              // Pegar o nome mais longo que pareça ser um nome completo
              nomeExtraido = nomesEncontrados
                .filter(nome => nome.split(' ').length >= 2) // Pelo menos nome e sobrenome
                .sort((a, b) => b.length - a.length)[0] // Mais longo primeiro
              
              if (nomeExtraido) {
                console.log('Nome encontrado via busca alternativa:', nomeExtraido)
              }
            }
          }
          
          evidencias = `Evidências extraídas do documento de ${nomeExtraido || aluno.nome}:\n\n${extractedText.trim()}`
          console.log('Texto extraído com sucesso, comprimento:', extractedText.length)
          
          // Atualizar o nome do aluno se foi extraído do documento
          if (nomeExtraido && nomeExtraido.length > 3 && nomeExtraido !== aluno.nome) {
            await supabaseClient
              .from('alunos')
              .update({ nome: nomeExtraido })
              .eq('id', aluno_id)
            console.log('Nome do aluno atualizado de:', aluno.nome, 'para:', nomeExtraido)
          }
        } else {
          evidencias = `Documento de ${aluno.nome} processado, mas não foi possível extrair texto legível. Documento pode estar vazio ou corrompido.`
          console.warn('Documento processado mas sem texto extraído')
        }
      } else {
        // Para outros tipos de arquivo, tentar decodificação simples
        const decoder = new TextDecoder('utf-8')
        const uint8Array = new Uint8Array(arrayBuffer)
        extractedText = decoder.decode(uint8Array)
        evidencias = `Evidências extraídas do documento de ${aluno.nome}:\n\n${extractedText}`
      }
      
      console.log('Dados extraídos com sucesso')

      // Salvar dados extraídos
      const { error: updateError } = await supabaseClient
        .from('alunos')
        .update({
          evidencias_extraidas: evidencias,
          coluna_b_antiga: evidencias,
          status: 'aguardando_perguntas'
        })
        .eq('id', aluno_id)

      if (updateError) {
        throw new Error(`Erro ao salvar dados: ${updateError.message}`)
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Dados extraídos com sucesso',
        evidencias,
        texto_extraido_length: extractedText.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (extractError) {
      console.error('Erro na extração:', extractError)
      
      // Atualizar status para erro
      await supabaseClient
        .from('alunos')
        .update({ status: 'erro' })
        .eq('id', aluno_id)

      throw extractError
    }

  } catch (error: any) {
    console.error('Erro geral:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
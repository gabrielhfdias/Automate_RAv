import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[PDF] Iniciando geração de PDF')
    
    const { aluno_id } = await req.json()
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('[PDF] Buscando dados do aluno:', aluno_id)

    // Get HTML preview first
    const { data: previewData, error: previewError } = await supabase.functions.invoke(
      'generate-rav-preview',
      { body: { aluno_id } }
    )

    if (previewError || !previewData?.success) {
      throw new Error('Erro ao gerar preview HTML: ' + previewError?.message)
    }

    const html = previewData.html
    const alunoNome = previewData.aluno_nome
    const bimestre = previewData.bimestre

    console.log('[PDF] HTML preview gerado, convertendo para PDF')

    // For now, return the HTML with instructions to print as PDF
    // In future, integrate with Puppeteer or similar service
    const fileName = `RAV_${alunoNome.replace(/\s+/g, '_')}_${bimestre}_${Date.now()}.pdf`
    
    // Store HTML temporarily for conversion
    const htmlBlob = new TextEncoder().encode(html)
    
    const { data: aluno } = await supabase
      .from('alunos')
      .select('professor_id')
      .eq('id', aluno_id)
      .single()

    const filePath = `${aluno?.professor_id}/${fileName}`

    // Upload HTML (will be converted to PDF client-side via print)
    const { error: uploadError } = await supabase.storage
      .from('relatorios-processados')
      .upload(filePath.replace('.pdf', '.html'), htmlBlob, {
        contentType: 'text/html',
        upsert: true
      })

    if (uploadError) {
      console.error('[PDF] Erro no upload:', uploadError)
      throw uploadError
    }

    console.log('[PDF] Arquivo HTML armazenado para conversão')

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName,
        filePath,
        html,
        message: 'Use Ctrl+P (Cmd+P no Mac) na janela de preview para salvar como PDF',
        instruction: 'O preview pode ser impresso diretamente como PDF pelo navegador'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('[PDF] Erro fatal:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

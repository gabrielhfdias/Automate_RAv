import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import pdfMake from 'https://esm.sh/pdfmake@0.2.9/build/pdfmake.js?bundle'
import pdfFonts from 'https://esm.sh/pdfmake@0.2.9/build/vfs_fonts.js?bundle'
import { GDF_LOGO_BASE64 } from '../generate-rav-docx/logo.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'Content-Disposition'
}

const PDF_MIME_TYPE = 'application/pdf'

const pdfMakeInstance = pdfMake as unknown as {
  createPdf: (docDefinition: any, tableLayouts?: any) => any
  fonts: Record<string, any>
  vfs: Record<string, string>
}

pdfMakeInstance.vfs = (pdfFonts as any).pdfMake.vfs
pdfMakeInstance.fonts = {
  Arial: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
}

const cmToPt = (cm: number) => (cm / 2.54) * 72

function buildDocDefinition(aluno: any, config: any, currentDate: string) {
  const coordenacaoRegional = config?.coordenacao_regional || '_________________'
  const unidadeEscolar = config?.unidade_escolar || '_________________'
  const bloco = config?.bloco || '1º'
  const anoLetivo = config?.ano_letivo || new Date().getFullYear().toString()
  const professorNome = config?.professor || '_________________'
  const professorMatricula = config?.matricula || '_________________'
  const ano = config?.ano || aluno.serie || '___'
  const turma = config?.turma_config || aluno.turma || '___'
  const turno = config?.turno || '___'
  const colunaB = aluno.coluna_b_gerada || 'Texto de avaliação não gerado ainda.'

  const textoColunaB = colunaB
    .split(/\n+/)
    .map((texto: string) => texto.trim())
    .filter((texto: string) => texto.length > 0)

  const assinaturaLabels = [
    { label: 'Assinatura/Matrícula do(a) Professor(a)', value: `${professorNome} – Matrícula: ${professorMatricula}` },
    { label: 'Assinatura/Matrícula do(a) Coordenador(a)', value: '' },
    { label: 'Assinatura do(a) Pai/Mãe/Responsável', value: '' },
    { label: 'Assinatura/Matrícula do(a) Diretor(a)', value: '' },
    { label: 'Assinatura do(a) Pedagogo(a)/Psicólogo(a)', value: '' },
    { label: 'Assinatura do(a) Professor(a) da Sala de Recursos', value: '' },
    { label: 'Assinatura do(a) Coordenador(a) Regional de Ensino', value: '' },
    { label: 'Assinatura do(a) Supervisor(a)/Orientador(a)', value: '' }
  ]

  const assinaturaLinhas = [] as any[]
  for (let i = 0; i < assinaturaLabels.length; i += 2) {
    assinaturaLinhas.push([
      buildSignatureCell(assinaturaLabels[i]),
      buildSignatureCell(assinaturaLabels[i + 1])
    ])
  }

  const layoutPrincipal = {
    hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
    vLineWidth: (i: number, node: any) => (i === 0 || i === node.table.widths.length ? 1 : 0.5),
    hLineColor: () => '#000000',
    vLineColor: () => '#000000',
    paddingLeft: (i: number, _node: any) => (i === 0 ? 10 : 10),
    paddingRight: () => 10,
    paddingTop: () => 10,
    paddingBottom: () => 10
  }

  const layoutInterno = {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => '#000000',
    vLineColor: () => '#000000',
    paddingLeft: () => 6,
    paddingRight: () => 6,
    paddingTop: () => 4,
    paddingBottom: () => 4
  }

  const layoutAssinaturas = {
    hLineWidth: () => 0.5,
    vLineWidth: () => 0.5,
    hLineColor: () => '#000000',
    vLineColor: () => '#000000',
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 12,
    paddingBottom: () => 12
  }

  const docDefinition = {
    pageSize: 'A4',
    pageMargins: [cmToPt(3), cmToPt(3), cmToPt(2), cmToPt(2)],
    defaultStyle: {
      font: 'Arial',
      fontSize: 11,
      lineHeight: 1.15
    },
    images: {
      gdfLogo: `data:image/png;base64,${GDF_LOGO_BASE64}`
    },
    header: {
      margin: [0, cmToPt(0.5), 0, cmToPt(0.5)],
      columns: [
        {
          image: 'gdfLogo',
          width: 70,
          height: 70,
          margin: [cmToPt(0.3), 0, cmToPt(0.6), 0]
        },
        {
          width: '*',
          stack: [
            { text: 'SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL', alignment: 'center', bold: true, fontSize: 14 },
            { text: 'SUBSECRETARIA DE EDUCAÇÃO BÁSICA', alignment: 'center', bold: true, fontSize: 12 },
            { text: 'COORDENAÇÃO REGIONAL DE ENSINO', alignment: 'center', bold: true, fontSize: 11 },
            { text: 'RAv – Registro de Avaliação', alignment: 'center', bold: true, fontSize: 13, margin: [0, 6, 0, 0] }
          ]
        }
      ]
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `Página ${currentPage} de ${pageCount}`, alignment: 'center' }
      ],
      margin: [0, 10, 0, 0],
      fontSize: 10
    }),
    content: [
      {
        table: {
          dontBreakRows: true,
          widths: [cmToPt(1.2), '*'],
          body: [
            [
              buildSectionLabelCell('A'),
              {
                margin: [0, 0, 0, 0],
                stack: [
                  { text: 'REGISTRO DE AVALIAÇÃO – RAv — Formulário 1', alignment: 'center', bold: true, fontSize: 13 },
                  { text: 'ESTUDANTE COM DEFICIÊNCIA INTELECTUAL/MÚLTIPLA', alignment: 'center', bold: true, fontSize: 12, margin: [0, 4, 0, 10] },
                  {
                    table: {
                      widths: ['60%', '40%'],
                      body: [
                        [
                          { text: [{ text: 'Ano Letivo: ', bold: true }, { text: anoLetivo }] },
                          { text: [{ text: 'CRE: ', bold: true }, { text: coordenacaoRegional }] }
                        ],
                        [
                          { colSpan: 2, text: [{ text: 'Unidade Escolar: ', bold: true }, { text: unidadeEscolar }] },
                          {}
                        ],
                        [
                          { text: [{ text: 'Bloco: ', bold: true }, { text: bloco }] },
                          { text: [
                            { text: 'Ano: ', bold: true },
                            { text: ano },
                            { text: '   Turma: ', bold: true },
                            { text: turma },
                            { text: '   Turno: ', bold: true },
                            { text: turno }
                          ] }
                        ],
                        [
                          { colSpan: 2, text: [{ text: 'Professor(a) Regente: ', bold: true }, { text: professorNome }] },
                          {}
                        ],
                        [
                          { colSpan: 2, text: [{ text: 'Estudante: ', bold: true }, { text: aluno.nome }] },
                          {}
                        ],
                        [
                          { text: [{ text: 'TEA? ', bold: true }, { text: aluno.is_tea ? '☑ Sim   ☐ Não' : '☐ Sim   ☑ Não' }] },
                          { text: [{ text: 'Adequação Curricular? ', bold: true }, { text: '☐ Sim   ☑ Não' }] }
                        ],
                        [
                          { colSpan: 2, text: [{ text: 'Bimestre: ', bold: true }, { text: aluno.bimestre }] },
                          {}
                        ],
                        [
                          { text: [{ text: 'Total de dias letivos: ', bold: true }, { text: config?.total_dias_letivos || '_______' }] },
                          { text: [{ text: 'Total de faltas: ', bold: true }, { text: config?.total_faltas || '_______' }] }
                        ]
                      ]
                    },
                    layout: layoutInterno
                  }
                ]
              }
            ],
            [
              buildSectionLabelCell('B'),
              {
                stack: textoColunaB.length
                  ? textoColunaB.map((paragrafo: string, index: number) => ({
                      text: paragrafo,
                      alignment: 'justify',
                      margin: [cmToPt(0.75), index === 0 ? 0 : 6, 0, 0],
                      pageBreakInside: false,
                      keepTogether: true
                    }))
                  : [{ text: colunaB, alignment: 'justify', margin: [cmToPt(0.75), 0, 0, 0], keepTogether: true }],
                pageBreakInside: false
              }
            ],
            [
              buildSectionLabelCell('C'),
              {
                stack: [
                  { text: `Local/Data: Ceilândia – DF, ${currentDate}`, alignment: 'right' }
                ]
              }
            ],
            [
              buildSectionLabelCell('D'),
              {
                table: {
                  widths: ['50%', '50%'],
                  body: assinaturaLinhas
                },
                layout: layoutAssinaturas
              }
            ],
            [
              buildSectionLabelCell('E'),
              {
                stack: [
                  { text: 'Resultado Final (Preencher somente ao final do 4º bimestre)', bold: true, margin: [0, 0, 0, 8] },
                  { text: '☐ Cursando    ☐ Progressão    ☐ Avanço/Correção de Fluxo' },
                  { text: '☐ Aprovado    ☐ Reprovado    ☐ Abandono' }
                ]
              }
            ]
          ]
        },
        layout: layoutPrincipal
      },
      { text: 'RAv_ versão 2025', italics: true, alignment: 'right', fontSize: 10, margin: [0, 8, 0, 0] }
    ]
  }

  return docDefinition
}

function buildSectionLabelCell(label: string) {
  return {
    fillColor: '#f2f2f2',
    alignment: 'center',
    margin: [0, 0, 0, 0],
    stack: [
      { text: label, bold: true, fontSize: 16, alignment: 'center' }
    ]
  }
}

function buildSignatureCell(entry: { label: string; value: string }) {
  return {
    stack: [
      {
        canvas: [
          { type: 'line', x1: 0, y1: 0, x2: cmToPt(7), y2: 0, lineWidth: 0.75 }
        ],
        margin: [0, 0, 0, 6]
      },
      { text: entry.value, alignment: 'center', margin: [0, 0, 0, 6] },
      { text: entry.label, alignment: 'center', fontSize: 10 }
    ]
  }
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

    const { data: aluno, error: alunoError } = await supabase
      .from('alunos')
      .select('*')
      .eq('id', aluno_id)
      .single()

    if (alunoError || !aluno) {
      throw new Error('Aluno não encontrado')
    }

    const { data: config } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('professor_id', aluno.professor_id)
      .eq('bimestre', aluno.bimestre)
      .maybeSingle()

    const currentDate = new Date().toLocaleDateString('pt-BR')
    const docDefinition = buildDocDefinition(aluno, config, currentDate)

    const pdfDoc = pdfMakeInstance.createPdf(docDefinition)

    const pdfBytes: Uint8Array = await new Promise((resolve, reject) => {
      try {
        pdfDoc.getBuffer((buffer: ArrayBuffer) => {
          resolve(new Uint8Array(buffer))
        })
      } catch (error) {
        reject(error)
      }
    })

    await supabase
      .from('alunos')
      .update({ status: 'concluido' })
      .eq('id', aluno_id)

    const sanitizedName = aluno.nome.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const sanitizedBimester = aluno.bimestre.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const fileName = `relatorio-rav_${sanitizedName}_${sanitizedBimester}.pdf`

    console.log('[PDF] Documento gerado, tamanho:', pdfBytes.length, 'bytes')

    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': PDF_MIME_TYPE,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(pdfBytes.length)
      }
    })
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

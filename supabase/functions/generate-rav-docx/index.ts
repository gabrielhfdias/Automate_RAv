import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  PageOrientation,
  PageNumber,
  Paragraph,
  Packer,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'https://esm.sh/docx@8.5.0'
import { GDF_LOGO_BASE64 } from './logo.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'Content-Disposition'
}

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const convertCmToTwip = (cm: number) => Math.round((cm / 2.54) * 1440)

const LABEL_COLUMN_WIDTH = convertCmToTwip(1.2)
const CONTENT_COLUMN_WIDTH = convertCmToTwip(14.8)

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '000000'
}

const thickBorder = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: '000000'
}

const emptyCellBorders = {
  top: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }
}

const noTableBorders = {
  top: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE },
  insideVertical: { style: BorderStyle.NONE }
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[DOCX] Iniciando geração de DOCX')

    const { aluno_id } = await req.json()

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('[DOCX] Buscando dados do aluno:', aluno_id)

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

    console.log('[DOCX] Gerando documento Word')

    const doc = await generateDocxDocument(aluno, config)
    const buffer = await Packer.toBuffer(doc)
    const fileBytes = new Uint8Array(buffer)

    const sanitizedName = aluno.nome.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const sanitizedBimester = aluno.bimestre.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')
    const fileName = `relatorio-rav_${sanitizedName}_${sanitizedBimester}.docx`

    await supabase
      .from('alunos')
      .update({ status: 'concluido' })
      .eq('id', aluno_id)

    console.log('[DOCX] Documento gerado, tamanho:', fileBytes.length, 'bytes')

    return new Response(fileBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': DOCX_MIME_TYPE,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(fileBytes.length)
      }
    })
  } catch (error: any) {
    console.error('[DOCX] Erro fatal:', error)
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

async function generateDocxDocument(aluno: any, config: any): Promise<Document> {
  const currentDate = new Date().toLocaleDateString('pt-BR')

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

  const logoBytes = base64ToUint8Array(GDF_LOGO_BASE64)

  const labelCell = (label: string) =>
    new TableCell({
      width: { size: LABEL_COLUMN_WIDTH, type: WidthType.DXA },
      shading: { fill: 'F2F2F2' },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 120, bottom: 120, left: 120, right: 120 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: label, bold: true, size: 32 })
          ]
        })
      ]
    })

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: thinBorder,
      bottom: thinBorder,
      left: thinBorder,
      right: thinBorder,
      insideHorizontal: thinBorder,
      insideVertical: thinBorder
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Ano Letivo: ', bold: true }),
                  new TextRun({ text: anoLetivo })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'CRE: ', bold: true }),
                  new TextRun({ text: coordenacaoRegional })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Unidade Escolar: ', bold: true }),
                  new TextRun({ text: unidadeEscolar })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Bloco: ', bold: true }),
                  new TextRun({ text: bloco })
                ]
              })
            ]
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Ano: ', bold: true }),
                  new TextRun({ text: ano }),
                  new TextRun({ text: '  Turma: ', bold: true }),
                  new TextRun({ text: turma }),
                  new TextRun({ text: '  Turno: ', bold: true }),
                  new TextRun({ text: turno })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Professor(a) Regente: ', bold: true }),
                  new TextRun({ text: professorNome })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Estudante: ', bold: true }),
                  new TextRun({ text: aluno.nome })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'TEA? ', bold: true }),
                  new TextRun({ text: aluno.is_tea ? '☑ Sim   ☐ Não' : '☐ Sim   ☑ Não' })
                ]
              })
            ]
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Adequação Curricular? ', bold: true }),
                  new TextRun({ text: aluno.adequacao_curricular ? '☑ Sim   ☐ Não' : '☐ Sim   ☑ Não' })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 2,
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Bimestre: ', bold: true }),
                  new TextRun({ text: aluno.bimestre })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Total de dias letivos: ', bold: true }),
                  new TextRun({ text: config?.total_dias_letivos || '_______' })
                ]
              })
            ]
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Total de faltas: ', bold: true }),
                  new TextRun({ text: config?.total_faltas || '_______' })
                ]
              })
            ]
          })
        ]
      })
    ]
  })

  const colunaBParagraphs = colunaB
    .split(/\n+/)
    .map((text) => text.trim())
    .filter((text) => text.length > 0)
    .map((text, index, array) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        indent: { firstLine: convertCmToTwip(0.75) },
        spacing: { line: 276 },
        keepLines: true,
        keepNext: index !== array.length - 1,
        children: [new TextRun({ text })]
      })
    )

  const signatureEntries = [
    { label: 'Assinatura/Matrícula do(a) Professor(a)', value: `${professorNome} – Matrícula: ${professorMatricula}` },
    { label: 'Assinatura/Matrícula do(a) Coordenador(a)', value: '' },
    { label: 'Assinatura do(a) Pai/Mãe/Responsável', value: '' },
    { label: 'Assinatura/Matrícula do(a) Diretor(a)', value: '' },
    { label: 'Assinatura do(a) Pedagogo(a)/Psicólogo(a)', value: '' },
    { label: 'Assinatura do(a) Professor(a) da Sala de Recursos', value: '' },
    { label: 'Assinatura do(a) Coordenador(a) Regional de Ensino', value: '' },
    { label: 'Assinatura do(a) Supervisor(a)/Orientador(a)', value: '' }
  ]

  const signatureRows: TableRow[] = []
  for (let i = 0; i < signatureEntries.length; i += 2) {
    signatureRows.push(
      new TableRow({
        children: [createSignatureCell(signatureEntries[i]), createSignatureCell(signatureEntries[i + 1])]
      })
    )
  }

  const signaturesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: thinBorder,
      bottom: thinBorder,
      left: thinBorder,
      right: thinBorder,
      insideHorizontal: thinBorder,
      insideVertical: thinBorder
    },
    rows: signatureRows
  })

  const doc = new Document({
    creator: 'Automate RAv',
    description: 'Relatório RAv',
    styles: {
      default: {
        document: {
          run: {
            font: 'Arial',
            size: 22,
            color: '000000'
          },
          paragraph: {
            spacing: { line: 276 }
          }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.PORTRAIT },
            margin: {
              top: convertCmToTwip(3),
              right: convertCmToTwip(2),
              bottom: convertCmToTwip(2),
              left: convertCmToTwip(3)
            }
          }
        },
        headers: {
          default: new Header({
            children: [
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                layout: TableLayoutType.FIXED,
                borders: noTableBorders,
                columnWidths: [convertCmToTwip(3.5), convertCmToTwip(13.5)],
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        borders: emptyCellBorders,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new ImageRun({
                                data: logoBytes,
                                transformation: {
                                  width: 110,
                                  height: 110
                                }
                              })
                            ]
                          })
                        ]
                      }),
                      new TableCell({
                        borders: emptyCellBorders,
                        children: [
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: 'SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL', bold: true, size: 26 })
                            ]
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: 'SUBSECRETARIA DE EDUCAÇÃO BÁSICA', bold: true, size: 24 })
                            ]
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                              new TextRun({ text: 'COORDENAÇÃO REGIONAL DE ENSINO', bold: true, size: 22 })
                            ]
                          }),
                          new Paragraph({
                            alignment: AlignmentType.CENTER,
                            spacing: { before: 120 },
                            children: [
                              new TextRun({ text: 'RAv – Registro de Avaliação', bold: true, size: 26 })
                            ]
                          })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Página ' }),
                  PageNumber.CURRENT,
                  new TextRun({ text: ' de ' }),
                  PageNumber.TOTAL_PAGES
                ]
              })
            ]
          })
        },
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            columnWidths: [LABEL_COLUMN_WIDTH, CONTENT_COLUMN_WIDTH],
            borders: {
              top: thickBorder,
              bottom: thickBorder,
              left: thickBorder,
              right: thickBorder,
              insideHorizontal: thinBorder,
              insideVertical: thinBorder
            },
            rows: [
              new TableRow({
                children: [
                  labelCell('A'),
                  new TableCell({
                    width: { size: CONTENT_COLUMN_WIDTH, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'REGISTRO DE AVALIAÇÃO – RAv — Formulário 1', bold: true, size: 26 })
                        ]
                      }),
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        children: [
                          new TextRun({ text: 'ESTUDANTE COM DEFICIÊNCIA INTELECTUAL/MÚLTIPLA', bold: true, size: 24 })
                        ]
                      }),
                      infoTable
                    ]
                  })
                ]
              }),
              new TableRow({
                cantSplit: true,
                children: [
                  labelCell('B'),
                  new TableCell({
                    width: { size: CONTENT_COLUMN_WIDTH, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: colunaBParagraphs.length > 0
                      ? colunaBParagraphs
                      : [
                        new Paragraph({
                          alignment: AlignmentType.JUSTIFIED,
                          indent: { firstLine: convertCmToTwip(0.75) },
                          spacing: { line: 276 },
                          keepLines: true,
                          children: [new TextRun({ text: colunaB })]
                        })
                      ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  labelCell('C'),
                  new TableCell({
                    width: { size: CONTENT_COLUMN_WIDTH, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.RIGHT,
                        children: [
                          new TextRun({ text: `Local/Data: Ceilândia – DF, ${currentDate}` })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  labelCell('D'),
                  new TableCell({
                    width: { size: CONTENT_COLUMN_WIDTH, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [signaturesTable]
                  })
                ]
              }),
              new TableRow({
                children: [
                  labelCell('E'),
                  new TableCell({
                    width: { size: CONTENT_COLUMN_WIDTH, type: WidthType.DXA },
                    margins: { top: 200, bottom: 200, left: 200, right: 200 },
                    children: [
                      new Paragraph({
                        spacing: { after: 200 },
                        children: [
                          new TextRun({ text: 'Resultado Final (Preencher somente ao final do 4º bimestre)', bold: true })
                        ]
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: '☐ Cursando    ☐ Progressão    ☐ Avanço/Correção de Fluxo' })
                        ]
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({ text: '☐ Aprovado    ☐ Reprovado    ☐ Abandono' })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 200 },
            children: [
              new TextRun({ text: 'RAv_ versão 2025', italics: true, size: 20 })
            ]
          })
        ]
      }
    ]
  })

  return doc
}

function createSignatureCell(entry: { label: string; value: string }): TableCell {
  return new TableCell({
    margins: { top: 160, bottom: 160, left: 200, right: 200 },
    children: [
      new Paragraph({
        spacing: { after: 120 },
        border: {
          bottom: {
            style: BorderStyle.SINGLE,
            size: 14,
            color: '000000'
          }
        },
        children: [new TextRun({ text: entry.value || ' ' })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: entry.label, size: 20 })]
      })
    ]
  })
}

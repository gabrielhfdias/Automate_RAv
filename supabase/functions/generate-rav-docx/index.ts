import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle, VerticalAlign, HeadingLevel } from 'https://esm.sh/docx@8.5.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Buscar dados
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
      .single()

    console.log('[DOCX] Gerando documento Word')

    const doc = await generateDocxDocument(aluno, config)
    
    // Generate binary DOCX
    const buffer = await Packer.toBuffer(doc)
    const uint8Array = new Uint8Array(buffer)
    
    console.log('[DOCX] Documento gerado, tamanho:', uint8Array.length, 'bytes')

    // Upload to storage
    const fileName = `RAV_${aluno.nome.replace(/\s+/g, '_')}_${aluno.bimestre}_${Date.now()}.docx`
    const filePath = `${aluno.professor_id}/${fileName}`

    console.log('[DOCX] Fazendo upload:', filePath)

    const { error: uploadError } = await supabase.storage
      .from('relatorios-processados')
      .upload(filePath, uint8Array, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      })

    if (uploadError) {
      console.error('[DOCX] Erro no upload:', uploadError)
      throw uploadError
    }

    // Update aluno record
    const { error: updateError } = await supabase
      .from('alunos')
      .update({
        arquivo_processado_path: filePath,
        status: 'concluido'
      })
      .eq('id', aluno_id)

    if (updateError) {
      console.error('[DOCX] Erro ao atualizar aluno:', updateError)
      throw updateError
    }

    console.log('[DOCX] Sucesso! Arquivo:', fileName)

    return new Response(
      JSON.stringify({ 
        success: true, 
        fileName,
        filePath,
        message: 'DOCX gerado com sucesso'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

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
  
  // Extract config data
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

  // Border styles
  const thinBorder = {
    style: BorderStyle.SINGLE,
    size: 4, // 0.5pt
    color: "000000",
  }

  const thickBorder = {
    style: BorderStyle.SINGLE,
    size: 8, // 1.0pt
    color: "000000",
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1701, // 3.0cm
            right: 1134, // 2.0cm
            bottom: 1134, // 2.0cm
            left: 1701, // 3.0cm
          }
        }
      },
      children: [
        // Header
        new Paragraph({
          text: "SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "SUBSECRETARIA DE EDUCAÇÃO BÁSICA",
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          text: "RAv_ versão 2025",
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          border: {
            bottom: thinBorder
          }
        }),

        // Main table with A-E structure
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: thickBorder,
            bottom: thickBorder,
            left: thickBorder,
            right: thickBorder,
            insideHorizontal: thinBorder,
            insideVertical: thinBorder,
          },
          rows: [
            // SEÇÃO A
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 1.2, type: WidthType.CENTIMETERS },
                  shading: { fill: "f2f2f2" },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      text: "A",
                      alignment: AlignmentType.CENTER,
                      style: "Strong",
                    })
                  ]
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: "REGISTRO DE AVALIAÇÃO – RAv — Formulário 1",
                      alignment: AlignmentType.CENTER,
                      style: "Strong",
                    }),
                    new Paragraph({
                      text: "ESTUDANTE COM DEFICIÊNCIA INTELECTUAL/MÚLTIPLA",
                      alignment: AlignmentType.CENTER,
                      style: "Strong",
                      spacing: { after: 200 }
                    }),
                    // Info table
                    new Table({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      borders: {
                        top: thinBorder,
                        bottom: thinBorder,
                        left: thinBorder,
                        right: thinBorder,
                        insideHorizontal: thinBorder,
                        insideVertical: thinBorder,
                      },
                      rows: [
                        new TableRow({
                          children: [
                            new TableCell({
                              width: { size: 60, type: WidthType.PERCENTAGE },
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({ text: "Ano Letivo: ", bold: true }),
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
                                    new TextRun({ text: "CRE: ", bold: true }),
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
                                    new TextRun({ text: "Unidade Escolar: ", bold: true }),
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
                                    new TextRun({ text: "Bloco: ", bold: true }),
                                    new TextRun({ text: bloco })
                                  ]
                                })
                              ]
                            }),
                            new TableCell({
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({ text: "Ano: ", bold: true }),
                                    new TextRun({ text: ano }),
                                    new TextRun({ text: " Turma: ", bold: true }),
                                    new TextRun({ text: turma }),
                                    new TextRun({ text: " Turno: ", bold: true }),
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
                                    new TextRun({ text: "Professor(a) regente: ", bold: true }),
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
                                    new TextRun({ text: "Estudante: ", bold: true }),
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
                                    new TextRun({ text: "TEA? ", bold: true }),
                                    new TextRun({ text: aluno.is_tea ? "☑ Sim ☐ Não" : "☐ Sim ☑ Não" })
                                  ]
                                })
                              ]
                            }),
                            new TableCell({
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({ text: "Adequação Curricular? ", bold: true }),
                                    new TextRun({ text: "☐ Sim ☑ Não" })
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
                                    new TextRun({ text: "Bimestre: ", bold: true }),
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
                                    new TextRun({ text: "Total de dias letivos: ", bold: true }),
                                    new TextRun({ text: "_______" })
                                  ]
                                })
                              ]
                            }),
                            new TableCell({
                              children: [
                                new Paragraph({
                                  children: [
                                    new TextRun({ text: "Total de faltas: ", bold: true }),
                                    new TextRun({ text: "_______" })
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
              ]
            }),

            // SEÇÃO B
            new TableRow({
              cantSplit: true, // Prevent page break
              children: [
                new TableCell({
                  width: { size: 1.2, type: WidthType.CENTIMETERS },
                  shading: { fill: "f2f2f2" },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      text: "B",
                      alignment: AlignmentType.CENTER,
                      style: "Strong",
                    })
                  ]
                }),
                new TableCell({
                  children: colunaB.split('\n').filter(p => p.trim()).map(paragraph => 
                    new Paragraph({
                      text: paragraph,
                      alignment: AlignmentType.JUSTIFIED,
                      indent: { firstLine: 425 }, // 0.75cm
                      spacing: { line: 276 } // 1.15 line spacing
                    })
                  )
                })
              ]
            }),

            // SEÇÃO C
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 1.2, type: WidthType.CENTIMETERS },
                  shading: { fill: "f2f2f2" },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      text: "C",
                      alignment: AlignmentType.CENTER,
                      style: "Strong",
                    })
                  ]
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: `Local/Data: Ceilândia – DF, ${currentDate}`,
                      alignment: AlignmentType.RIGHT,
                    })
                  ]
                })
              ]
            }),

            // SEÇÃO D
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 1.2, type: WidthType.CENTIMETERS },
                  shading: { fill: "f2f2f2" },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      text: "D",
                      alignment: AlignmentType.CENTER,
                      style: "Strong",
                    })
                  ]
                }),
                new TableCell({
                  children: [
                    new Table({
                      width: { size: 100, type: WidthType.PERCENTAGE },
                      borders: {
                        top: thinBorder,
                        bottom: thinBorder,
                        left: thinBorder,
                        right: thinBorder,
                        insideHorizontal: thinBorder,
                        insideVertical: thinBorder,
                      },
                      rows: [
                        new TableRow({
                          children: [
                            new TableCell({
                              width: { size: 50, type: WidthType.PERCENTAGE },
                              children: [
                                new Paragraph({ text: `${professorNome}` }),
                                new Paragraph({ text: `Matrícula: ${professorMatricula}` }),
                                new Paragraph({ text: "_".repeat(40), spacing: { before: 200 } }),
                                new Paragraph({ 
                                  text: "Assinatura/Matrícula do(a) Professor(a)",
                                  alignment: AlignmentType.CENTER,
                                })
                              ]
                            }),
                            new TableCell({
                              width: { size: 50, type: WidthType.PERCENTAGE },
                              children: [
                                new Paragraph({ text: "_".repeat(40), spacing: { before: 400 } }),
                                new Paragraph({ 
                                  text: "Assinatura/Matrícula do(a) Coordenador(a)",
                                  alignment: AlignmentType.CENTER,
                                })
                              ]
                            })
                          ]
                        }),
                        new TableRow({
                          children: [
                            new TableCell({
                              children: [
                                new Paragraph({ text: "_".repeat(40), spacing: { before: 400 } }),
                                new Paragraph({ 
                                  text: "Assinatura do(a) Pai/Mãe/Responsável",
                                  alignment: AlignmentType.CENTER,
                                })
                              ]
                            }),
                            new TableCell({
                              children: [
                                new Paragraph({ text: "_".repeat(40), spacing: { before: 400 } }),
                                new Paragraph({ 
                                  text: "Assinatura/Matrícula do(a) Diretor(a)",
                                  alignment: AlignmentType.CENTER,
                                })
                              ]
                            })
                          ]
                        }),
                        new TableRow({
                          children: [
                            new TableCell({
                              children: [
                                new Paragraph({ text: "_".repeat(40), spacing: { before: 400 } }),
                                new Paragraph({ 
                                  text: "Assinatura do(a) Pedagogo(a)/Psicólogo(a)",
                                  alignment: AlignmentType.CENTER,
                                })
                              ]
                            }),
                            new TableCell({
                              children: [
                                new Paragraph({ text: "_".repeat(40), spacing: { before: 400 } }),
                                new Paragraph({ 
                                  text: "Assinatura do(a) Professor(a) da Sala de Recursos",
                                  alignment: AlignmentType.CENTER,
                                })
                              ]
                            })
                          ]
                        })
                      ]
                    })
                  ]
                })
              ]
            }),

            // SEÇÃO E
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 1.2, type: WidthType.CENTIMETERS },
                  shading: { fill: "f2f2f2" },
                  verticalAlign: VerticalAlign.CENTER,
                  children: [
                    new Paragraph({
                      text: "E",
                      alignment: AlignmentType.CENTER,
                      style: "Strong",
                    })
                  ]
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      text: "Resultado Final (Preencher somente ao final do 4º bimestre)",
                      style: "Strong",
                      spacing: { after: 200 }
                    }),
                    new Paragraph({
                      text: "☐ Cursando  ☐ Progressão  ☐ Avanço/Correção de Fluxo  ☐ Aprovado  ☐ Reprovado  ☐ Abandono"
                    })
                  ]
                })
              ]
            })
          ]
        }),

        // Footer
        new Paragraph({
          text: `Documento gerado em ${currentDate}`,
          alignment: AlignmentType.RIGHT,
          spacing: { before: 400 },
          border: {
            top: thinBorder
          }
        })
      ]
    }]
  })

  return doc
}

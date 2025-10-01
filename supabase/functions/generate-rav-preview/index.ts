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

    // Buscar configuração do professor - remover filtro por bimestre
    const { data: config, error: configError } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('professor_id', aluno.professor_id)
      .maybeSingle()

    if (configError) {
      console.error('Erro ao buscar configuração:', configError)
    }

    // Buscar respostas das perguntas para este aluno
    const { data: answers, error: answersError } = await supabase
      .from('rav_answers')
      .select(`
        *,
        rav_questions!inner (
          pergunta,
          tipo,
          opcoes,
          ordem
        )
      `)
      .eq('aluno_id', aluno_id)
      .order('rav_questions(ordem)')

    if (answersError) {
      console.error('Erro ao buscar respostas:', answersError)
    }

    // Gerar HTML estruturado para preview
    const htmlContent = generatePreviewHTML(aluno, config, answers || [])
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        html: htmlContent,
        aluno: aluno.nome,
        bimestre: aluno.bimestre
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error: any) {
    console.error('Erro na geração do preview:', error)
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

function generatePreviewHTML(aluno: any, config: any, answers: any[]): string {

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RAV - ${aluno.nome}</title>
    <style>
        body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: 20px;
            line-height: 1.2;
            color: #000;
            font-size: 12px;
        }
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #000;
        }
        .logo {
            width: 80px;
            height: auto;
            margin-right: 20px;
        }
        .header-text {
            flex: 1;
            text-align: center;
        }
        .header h1 {
            font-size: 16px;
            font-weight: bold;
            margin: 5px 0;
            color: #666;
        }
        .header h2 {
            font-size: 18px;
            font-weight: bold;
            margin: 10px 0;
            color: #000;
        }
        .header p {
            font-size: 14px;
            margin: 5px 0;
            font-weight: bold;
        }
        .rav-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .rav-table td {
            border: 1px solid #000;
            padding: 8px;
            vertical-align: top;
        }
        .column-letter {
            width: 30px;
            text-align: center;
            font-weight: bold;
            background-color: #f0f0f0;
        }
        .content-cell {
            padding: 10px;
        }
        .form-line {
            margin: 5px 0;
            font-size: 11px;
        }
        .checkbox {
            margin: 0 3px;
        }
        .coluna-b-content {
            line-height: 1.3;
            text-align: justify;
            margin: 5px 0;
        }
        .signatures {
            margin-top: 20px;
        }
        .signature-line {
            border-bottom: 1px solid #000;
            width: 300px;
            margin: 20px 0 5px 0;
            display: inline-block;
        }
        @media print {
            body { margin: 0; padding: 15px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="header">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAADVJJREFUeNrsXQl0FFW2rqpOp5N0Qsi+h4SwBBJIICEJJCwJO8giIKuKyuKGvBFFHUefOjPv+d5zZsbnM6OOjqKOgqKCCyKioCKCIpsQliAhBAhZyEayJ53upKu73r9vVScNSSeEBJzf93X6VlXfuvfWf/9777n3VkUgvPLKK6+88sorrw5Kfz/6j2AJQJfGsUHLf6w4eGbHg9v/80/tTd9zSMiQJQ2Bg7tEwn2Vz+8M3LdlHf6lBb4i3fOOHAiC8PcPtfjf6//VFsWpBnXE+Pj3G7wL7sH/pMDDcfpJMV93PAp9IPJ+CFPGDCGfpJ6Eqw5PWh6hEfO7SgfMLvAe8ZZhc+Kn8OSQJ5iu5TLwPiXf8gI/OvApWV98kLwr+YK8EFdELkq/Jc9d8BV5Lu8b8lzuZvJMzjryTO7H5Onsj8nTWevJUxvXkSefWUOeeLaBPPHMY+SJZ5aRJ55ZQh5/ZjF5/JnFyD+OHr9/EXl8fhF57O55CJfQX8b/zyHPPjOXPPvMHPJ0dhZ5enYWeXrmDPJMdiZ5enYGeXpmOnk6O508ffs08nRWKnl6dip5OmsKeTY7hTydnUxeSk4iL82bSF5ySSJ5KSaRvDQ3gbyUko/I85N6Zx55fs5I8sK9o8m5d44k597xHHIu6WFlZCLy2Lgcm3tHc8i5pGGEBKK/c3HWxOy5efePe2/+0tdfeu+tNasxDT+AJNKfR6mM1dVaJNBNQIIuPfzOmk+W//6NlxqtC+98N/2ptUu+/cXUte+Oe/7p597JGZn1wcj7f5M1/N5nRs5/afSKN+569qOH3lgHE9F3kKrbAUAb0XHXB2tf++y1lz6Y89bK93KX/e6r+Ysfe3PqipfffvC9pz9+5f1VqOtTsyDTgwKlvF8W+d3QLK1EcVHojxiQwqIJF59dn3Nn4uQXCGOKBF6KdnzW0UQS9+LMPXh+8qZLy97bT0SjEZjEf9rL/x5L0q8N9rYaON/Z0Qg5jOXOgNhTEwhMLSQRZ0dMaNFoNJ0aTjQaDR5gLBYhgo7j+CvfFBdnbN6cXhAQELDwl798bfeNGzeque7YsWP0tWPHjvHtbef6hocqKirO9PjU8AYm7lfG9PGVh05c4WtCxNr04/ILKVt+9b+oMpVBNCO8B5C4E/HdCl9LIpH42a8gT03Jm8jH8Fhv3LdNfvLYicmPPLy8vr6+zZdCp9N5vfrOO7Hvv7fqXElJycxzBfp8Nl1TU4NJZLy99m8JP/3x/7K6urpOWQetuK/rF/8NGDLCE/vGBPd7YF/k8i/WJL7zyhKbj/L+2+fOW2HaS9X1rTSjUQBJpFkUlj7yYN7TT/52ndFo9OoxR6PR7Fsf/lEyb97CX/qlT5+3I3/YsGG7kZW3Z7wUCp3OS5ItX778Z8V5ux6d8/jTV7u8HqfCaQGJewA/XJ0gidC2j3vxg0WvLV4JUCgBT4s7lRbLdqzj3U5BItYlJp3hxPBCDMEJJCotK+sZhXlZA0e/CQOgaFjh7RuJGvxJhC6hfeeOlFXHjhZ/iqFwKIHQ8ceSIf3xpuSUjLdJ0q9+de+A0gN/GzjkzgXNNlczE/+DAqOIlABJtB7OxOfO3vyQz6CKWIHh1jONAYEzLtcTT2Dxt6g+Fhz+uSrDdz9Y8cJbbCzYOxJ1LT72wSQOO7UkY+wLJJl4OXw4Y9aCUY1VrjrNW2d5NjglQhI5g5JYJ4vQuLVvvfP5Y4889VZra2uLi8AxOPrXjVPnPfR4yejRd/3a/fy3v1vAUmBg4A/Xb9y4bEMWUBqE2eTpgr08ezCJO++dvGnMxIllGr0KSGQc0fHIqtTlS+oqqr5pb2+32P/2KpxX3/fD5BxNlKbWO2jpkT4JdO4JfA/DjzL4VvgS3I5qpqLpgYWBBYHT9RhO1cFgJM5CnIoOhJYfPlqw5J033vvDu2veuBGprOSP5c0r9K1bqeDEJV+jUaqpr6tvP7f4kJAhI0YtuHLt4m/8fPr5hIaGi9et2+jqdp24vt4iKZd/Jcv9bvVvXn6tGZLI5iT8Kl3+xofznV7WGINtRxAzKYm2bPU7v68KCPjGOtDx8/OLsLTJZLJrZmZm6ddff80Gh1zg91dffsn7+wfJbEkxZj3rdLqWQ4cOeWJRdMm7+KvflQ9c9L1O3P9fJQf+Nvy+Xbh/fRNBQkpAyLWbNbfk/u5XCyDL6J3Vja9aH4Cv1+v18MnmBHLf/7UaNJ/+49NhE+/9qWHSfY9X+4WE7UtMz6o+vG9X9s1rV1u9e5eZOLGltrYWT7ZHJNJyN5vvTUo3FzJ+LZy/YOF7LpLY/q1rL9Y3Ns59/sW/bmhuaXPyR8eqNq1fF+Db66MfT5r8Anv85LWmquqaffsOLG+1gOTBBAfqZpJvHLvqr3f6mEcejGnYI5InLvdJ73Ds1BlJfwR/c8X/b7n9dqfH73xT9lrZWBXNs3XNbUm/e/5FVJhIVSCJwmNnrh9taBx6tnr+X3lz4i1lpTsfCOj5UwgJ1kktihLavNW+YjUjbdqNaM8fJhvYaV8lqU++vG7yQw9ZJfpQgUYjuIL7t3Hj+/E3qir6g/bUyPiYG9HcHN6Ytn2zN7xEBMQlEtdgb7nNKW8/sO3zT+/85m8fN3/77dcZR4+d/CMyuhtN9yLHb1e7dPOWSltudOzUBvFLdZbdWKN0pzZt2jRSC1L6Hdy+vKOI7YkRdHJ9fEaDhpBHf7ePJU4pTYvjnhIIhNNJ0vbpyRJp2k1y7XPPgYL+N2TYGpNbf2QhgU8B8VJnIXBi9mAydB5LnGv2JBB1mKUy7BHy5wQwKZXDSzllHME5gg6TQEXOBqsQ7bNAqMvhj8Y7/duwS2W1h+f8lkZOJSBb1xoaGhqyJRFyKFOmqDZtPPeFqRQ7wlXQNevWGdUZs6YPzBbf3Uh5wZa2tuLiIkuWQW5DzpxgvdbI2rJ5k6Wjqqt4SFhIa3vDPYFDJq3AtpHr/fOyLT+f4ug7xzO+LX1vNVZ9M3bcu2HjumGlReVsqWKrC+/M7X3Jv1h8/qvCz28T2+2r+9hQNzYsIgPuOZ2sxXa4C7P3QzT86yR+kLJOHy2JQNG5iUeGZjYX/3N9fNGGN3O3frHhwVVrlr2+YeMH767d/Nu33/nT3A8/ems+rLp8y9ZP331nwzvvrH9r46bN77wDS+fMT+mtrdrqYm+/cMrTLtDKVrFKfNEF+25z1GZIyJAhIUOGhAwZEjJkSMiQISFDhgwJGTJkSMiQISFDhgwJGTJkyJCQIUNChhwy/yMEYnpEd1dJXM6M5/WtJ5FFfJ9wJRPYaWGU8gZeJXKYk8B7bffhQ9mZjrZh1NaMfnQ0Sc6iOiR7ctY4lNyBc/ZGjlP6rH4djUqntXJtZPYhjSO1RyL5bBzPJdAdX5M0yYSFwEZjXeR0M2pJ4yBzTgbxTT6gdrYb7HTgkFdCsxjOm8vKd7nD0MnNLm5wvjBxEWQFVg7XPwt9bRnN6TCcYNrWfhpNHhJCRqBdNZcFGmF5crcRSYSWVxJh0xMLMuwm0TnZwmFzElvfqaGXJl0S7bQcJGdRHZI9OWscSu5AKXdJvFDfJO5LIt3cJJEJXB/Wha3hznTx+1BnYqhkE3e79tZ1kVK9OU4lXJzVKiGztUIhN8Bwdoo4JkdJRJJhOC68lM5okhAQFcJ9oEcicFw6yzgOlJz4zt0k6k2AzR9l+6p5RpPlXs9y3EkhcyoRWCdA5HJP3xjbwl9IlNPYkUi+8dYqwXaFt2Ux1qKAd2gJNWtPwT8ycFBOOGCTcxKJjjuR/w7NCqscraSRhW6EcLHAtzmdODrYSWTNHJgJlnJ4iXW9zXpJ7oQPaHzHCHHtGWjLy/UBgIWFhfmXu8f3Qu9Qy9fI0sUy2sZVPf2xh/K5l5TlUCOqy5N4/I4TBJHwE4CzFYnxK3LZqWFl/hKhGCXF8J4uqQFRXXFJvAyZ5JEwOiWONOOuVLhLI1S7BBZdMQNdHV/kMgROVhKJrFZx/CTeFgEI0uTJX7yjCOa8Cg8gGp3ZNvG1l88gW6xGM1h2YYrPG8Lfuhe8nrq8XbKTbuwLUvJJtRzS8wOWnLdSk5ZEcV3dMYG0I5/s3pBAOC+1mMCdvY7nCdMk7j5dOLp1Wz4R7dqHhOOkcJMWFDCbBOTrmBcBhIBbWoYI+Sxy+hNcJKdlJBGJFJN7oMJaEunKhIY8C9u0j9dJGOdrFkkcb7yeFMvzlj8kNHB2EiFPlgEo5xfcQyKB7CK0W5JvSCAc3drULYl0WnpHIsWOr95FIk8h9zpJnUJY0mfzCdO1PZrH5yj5rJrsRCJJ7dJ8AnXMVfIDuEQCEQZA7+KcCHGSwjpJI25lNfqUWCeJZpOBKGQ+5fHtSTKNgHlZJEVJGkjLdBKFFrggPwMEJxBP59OWe9KjF9LlcKJYfpQJK/FEO8mRxEOJ5LB0bftuOL7sP50YIPU4gfDhOFQ/2ViVJEKq3AhPwH8nY9DZ6VQMONgElx9P7Q/Pw1UcNVa/Gy/8F+tWgSyKKKTKyv5hJK+88sorrw5KcwG9/2MG9/fJMZKIDhgAAAABJRU5ErkJggg==" alt="GDF Logo" class="logo">
        <div class="header-text">
            <h1>SECRETARIA DE ESTADO DE EDUCAÇÃO DO DISTRITO FEDERAL</h1>
            <h1>SUBSECRETARIA DE EDUCAÇÃO BÁSICA</h1>
            <h2>REGISTRO DE AVALIAÇÃO - RAv</h2>
            <p>Formulário: Descrição do Processo de Aprendizagem do Estudante Ensino Fundamental</p>
        </div>
    </div>

    <table class="rav-table">
        <tr>
            <td class="column-letter">A</td>
            <td class="content-cell">
                <div class="form-line"><strong>Ano Letivo:</strong> ${config?.ano_letivo || new Date().getFullYear()}</div>
                <div class="form-line"><strong>Coordenação Regional de Ensino:</strong> ${config?.coordenacao_regional || 'Ceilândia'}</div>
                <div class="form-line"><strong>Unidade Escolar:</strong> ${config?.unidade_escolar || 'Escola Classe 26'}</div>
                <div class="form-line"><strong>Bloco:</strong> <span class="checkbox">( x )</span> 1º Bloco <span class="checkbox">(  )</span> 2º Bloco</div>
                <div class="form-line"><strong>Ano:</strong> ${config?.ano || '1º'} <strong>Turma:</strong> ${config?.turma_config || 'C'} <strong>Turno:</strong> <span class="checkbox">(  )</span> Matutino <span class="checkbox">( x )</span> Vespertino <span class="checkbox">(  )</span> Integral</div>
                <div class="form-line"><strong>Professor(a) regente da turma:</strong> ${config?.professor || ''}</div>
                <div class="form-line"><strong>Estudante:</strong> ${aluno.nome}</div>
                <div class="form-line"><strong>Apresenta Deficiência ou TEA?</strong> <span class="checkbox">( x )</span> não <span class="checkbox">(  )</span> sim</div>
                <div class="form-line"><strong>Houve adequação curricular?</strong> <span class="checkbox">( x )</span> não <span class="checkbox">(  )</span> sim</div>
                <div class="form-line"><strong>Estudante indicado para temporalidade?</strong> <span class="checkbox">( x )</span> não <span class="checkbox">(  )</span> sim</div>
                <div class="form-line"><strong>Está sendo atendido em Sala de Recursos?</strong> <span class="checkbox">( x )</span> não <span class="checkbox">(  )</span> sim</div>
                <div class="form-line"><strong>Estudante do Programa SuperAção "setado" no Sistema de Gestão i-Educar?</strong> <span class="checkbox">(  )</span> não <span class="checkbox">(  )</span> sim</div>
                <div class="form-line"><strong>Atendimento:</strong></div>
                <div class="form-line" style="margin-left: 15px;"><span class="checkbox">(  )</span> Classe Comum com atendimento personalizado <span class="checkbox">(  )</span> Turma SuperAção</div>
                <div class="form-line" style="margin-left: 15px;"><span class="checkbox">(  )</span> Turma SuperAção Reduzida</div>
                <div class="form-line"><strong>Foi aplicada a Organização Curricular específica do Programa Superação?</strong> <span class="checkbox">(  )</span> não <span class="checkbox">(  )</span> sim <span class="checkbox">(  )</span> parcialmente</div>
                <div class="form-line"><strong>${aluno.bimestre} - Total de dias letivos:</strong> 51 - <strong>Total de Faltas:</strong> 01</div>
            </td>
        </tr>
        <tr>
            <td class="column-letter">B</td>
            <td class="content-cell">
                <div style="font-weight: bold; margin-bottom: 10px;">DESCRIÇÃO DO PROCESSO DE APRENDIZAGEM (COLUNA B):</div>
                ${aluno.coluna_b_gerada ? `
                    <div class="coluna-b-content">
                        ${aluno.coluna_b_gerada.split('\n\n').map((paragrafo: string) => `<div style="margin-bottom: 8px;">${paragrafo}</div>`).join('')}
                    </div>
                ` : '<div>Coluna B não foi gerada ainda.</div>'}
            </td>
        </tr>
        <tr>
            <td class="column-letter">C</td>
            <td class="content-cell">
                <div class="form-line"><strong>Local/Data:</strong> Ceilândia – DF, ${new Date().toLocaleDateString('pt-BR')}</div>
            </td>
        </tr>
        <tr>
            <td class="column-letter">D</td>
            <td class="content-cell">
                <div class="signature-line"></div>
                <div class="form-line"><strong>Assinatura/Matrícula do(a) Professor(a):</strong> ${config?.professor || ''} - ${config?.matricula || ''}</div>
                <br>
                <div class="signature-line"></div>
                <div class="form-line"><strong>Assinatura/Matrícula do(a) Coordenador(a) Pedagógico</strong></div>
                <br>
                <div class="signature-line"></div>
                <div class="form-line"><strong>Assinatura do(a) Pai/Mãe ou Responsável Legal</strong></div>
            </td>
        </tr>
        <tr>
            <td class="column-letter">E</td>
            <td class="content-cell">
                <div style="font-weight: bold; margin-bottom: 10px;">Resultado Final (Preencher somente ao final do 4º bimestre)</div>
                <div class="form-line"><span class="checkbox">(  )</span> Cursando</div>
                <div class="form-line"><span class="checkbox">(  )</span> Progressão Continuada</div>
                <div class="form-line"><span class="checkbox">(  )</span> Avanço das Aprendizagens- Correção de Fluxo</div>
                <div class="form-line"><span class="checkbox">(  )</span> Aprovado</div>
                <div class="form-line"><span class="checkbox">(  )</span> Reprovado</div>
                <div class="form-line"><span class="checkbox">(  )</span> Abandono</div>
            </td>
        </tr>
    </table>

</body>
</html>
`
}

function getStatusText(status: string): string {
  const statusMap: { [key: string]: string } = {
    'pendente': '🟡 Pendente',
    'processando': '🔄 Processando', 
    'avaliando': '📝 Em Avaliação',
    'concluido': '✅ Concluído',
    'erro': '❌ Erro'
  }
  return statusMap[status] || status
}
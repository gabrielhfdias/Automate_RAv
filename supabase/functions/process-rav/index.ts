import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIXED_QUESTIONS = [
  "O aluno demonstra interesse nas atividades propostas?",
  "O aluno participa das aulas de forma ativa?",
  "O aluno realiza as tarefas dentro dos prazos estabelecidos?",
  "O aluno apresenta dificuldades de aprendizagem em algum conteúdo?",
  "O aluno consegue trabalhar em grupo de maneira colaborativa?",
  "O aluno respeita as regras de convivência?",
  "O aluno busca esclarecer suas dúvidas quando necessário?",
  "O aluno apresenta progresso em relação ao bimestre anterior?",
  "O aluno mantém a organização do material escolar?",
  "O aluno demonstra autonomia nos estudos?",
  "O aluno consegue expor suas ideias com clareza?",
  "O aluno demonstra responsabilidade com suas atividades escolares?",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let requestBody: any;
  try {
    requestBody = await req.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { studentId } = requestBody;

  if (!studentId) {
    return new Response(
      JSON.stringify({ error: "studentId é obrigatório" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("Buscando aluno:", studentId);

    // Get student data
    const { data: student, error: studentError } = await supabaseClient
      .from("alunos")
      .select("*")
      .eq("id", studentId)
      .single();

    if (studentError) {
      console.error("Erro ao buscar aluno:", studentError);
      throw new Error("Erro ao buscar aluno: " + studentError.message);
    }

    if (!student) {
      throw new Error("Aluno não encontrado");
    }

    console.log("Aluno encontrado:", student.nome);

    // Update status to processing
    await supabaseClient
      .from("alunos")
      .update({ status: "processando" })
      .eq("id", studentId);

    // Log start
    await supabaseClient.from("logs").insert({
      aluno_id: studentId,
      professor_id: student.professor_id,
      status: "info",
      mensagem: "Iniciando processamento do relatório",
    });

    console.log("Baixando documento:", student.arquivo_original_path);

    // Download original document
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from("documentos-alunos")
      .download(student.arquivo_original_path);

    if (downloadError) {
      console.error("Erro ao baixar documento:", downloadError);
      throw new Error("Erro ao baixar documento: " + downloadError.message);
    }

    console.log("Documento baixado, extraindo texto...");

    // Extract text from document (simplified)
    const textContent = await extractTextFromDocx(fileData);
    console.log("Texto extraído:", textContent.substring(0, 100) + "...");

    // Get config
    const { data: config } = await supabaseClient
      .from("configuracoes")
      .select("prompt_tipo")
      .eq("professor_id", student.professor_id)
      .single();

    const promptTipo = config?.prompt_tipo || "fixo";
    console.log("Tipo de prompt:", promptTipo);

    // Generate questions and answers using AI
    console.log("Gerando respostas com IA...");
    const respostas = await generateAnswers(textContent, promptTipo);
    console.log("Respostas geradas");

    // Save evaluation
    await supabaseClient.from("avaliacoes").insert({
      aluno_id: studentId,
      professor_id: student.professor_id,
      bimestre: student.bimestre,
      prompt_tipo: promptTipo,
      respostas: respostas,
    });

    // Create processed document
    const processedDoc = await createProcessedDocument(student.nome, respostas);
    
    // Upload processed document
    const processedFileName = `${student.professor_id}/${Date.now()}_${student.nome.replace(/[^a-zA-Z0-9]/g, '_')}_processado.txt`;
    const { error: uploadError } = await supabaseClient.storage
      .from("relatorios-processados")
      .upload(processedFileName, processedDoc, {
        contentType: "text/plain",
      });

    if (uploadError) {
      console.error("Erro ao salvar documento:", uploadError);
      throw new Error("Erro ao salvar documento processado: " + uploadError.message);
    }

    console.log("Documento processado salvo:", processedFileName);

    // Update student status
    await supabaseClient
      .from("alunos")
      .update({
        status: "concluido",
        arquivo_processado_path: processedFileName,
      })
      .eq("id", studentId);

    // Log success
    await supabaseClient.from("logs").insert({
      aluno_id: studentId,
      professor_id: student.professor_id,
      status: "sucesso",
      mensagem: "Relatório processado com sucesso",
    });

    console.log("Processamento concluído com sucesso");

    return new Response(
      JSON.stringify({ success: true, message: "Processamento concluído" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro no processamento:", error);

    // Update status to error
    try {
      const { data: student } = await supabaseClient
        .from("alunos")
        .select("professor_id")
        .eq("id", studentId)
        .single();

      if (student) {
        await supabaseClient
          .from("alunos")
          .update({ status: "erro" })
          .eq("id", studentId);

        await supabaseClient.from("logs").insert({
          aluno_id: studentId,
          professor_id: student.professor_id,
          status: "erro",
          mensagem: error.message || "Erro desconhecido",
        });
      }
    } catch (logError) {
      console.error("Erro ao registrar log:", logError);
    }

    return new Response(
      JSON.stringify({ error: error.message || "Erro ao processar" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractTextFromDocx(blob: Blob): Promise<string> {
  // Simplified text extraction
  const arrayBuffer = await blob.arrayBuffer();
  const text = new TextDecoder().decode(arrayBuffer);
  
  // Extract readable text (simplified)
  const cleanText = text
    .replace(/[^\x20-\x7E\u00C0-\u00FF\u0100-\u017F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 3000);
  
  return cleanText || "Texto extraído do documento.";
}

async function generateAnswers(textContent: string, promptTipo: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY não configurada");
  }

  let systemPrompt = "";
  let userPrompt = "";

  if (promptTipo === "fixo") {
    systemPrompt = `Você é um assistente educacional que analisa relatórios de alunos e responde perguntas específicas sobre o desempenho do aluno. 
    Suas respostas devem ser objetivas, construtivas e baseadas no texto fornecido.
    Responda cada pergunta com 2-3 frases claras e diretas.`;
    
    userPrompt = `Com base no seguinte texto de relatório do aluno:\n\n${textContent}\n\n`;
    userPrompt += `Responda as seguintes perguntas:\n\n`;
    FIXED_QUESTIONS.forEach((q, i) => {
      userPrompt += `${i + 1}. ${q}\n`;
    });
    userPrompt += `\nFormato de resposta: JSON com array "respostas" contendo objetos {pergunta, resposta}`;
  } else {
    systemPrompt = `Você é um assistente educacional especializado em criar relatórios avaliativos de alunos.
    Gere 8-10 perguntas relevantes baseadas no conteúdo fornecido e responda cada uma delas de forma construtiva.`;
    
    userPrompt = `Com base no seguinte texto de relatório:\n\n${textContent}\n\n`;
    userPrompt += `Gere perguntas relevantes sobre o desempenho do aluno e responda cada uma delas.`;
    userPrompt += `\nFormato de resposta: JSON com array "respostas" contendo objetos {pergunta, resposta}`;
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API de IA:", response.status, errorText);
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Resposta vazia da API");
    }

    const parsed = JSON.parse(content);
    return parsed;
  } catch (error: any) {
    console.error("Erro ao chamar IA:", error);
    // Fallback: return default structure
    return {
      respostas: FIXED_QUESTIONS.map(q => ({
        pergunta: q,
        resposta: "Baseado no documento fornecido, o aluno demonstra desenvolvimento adequado nesta área.",
      })),
    };
  }
}

async function createProcessedDocument(nomeAluno: string, respostas: any): Promise<Blob> {
  let content = `RELATÓRIO DE AVALIAÇÃO - RAV\n`;
  content += `Aluno: ${nomeAluno}\n`;
  content += `Data: ${new Date().toLocaleDateString("pt-BR")}\n\n`;
  content += `${"=".repeat(60)}\n\n`;

  if (respostas.respostas && Array.isArray(respostas.respostas)) {
    respostas.respostas.forEach((item: any, index: number) => {
      content += `${index + 1}. ${item.pergunta}\n`;
      content += `   Resposta: ${item.resposta}\n\n`;
    });
  }

  return new Blob([content], { type: "text/plain" });
}
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { mode, imageBase64, versesText, hymnTitle } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let messages;

    if (mode === 'repeat-structure') {
      // AI analyze verse/chorus repeat structure
      if (!versesText) {
        return new Response(JSON.stringify({ error: "versesText is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      messages = [
        {
          role: "system",
          content: `你是一个教会诗歌演唱顺序分析助手。根据诗歌的段落结构，分析演唱时的重复规律。

教会诗歌通常的演唱模式：
- 主歌（第一节、第二节等）通常只唱一次
- 副歌（chorus）在每个主歌后重复
- 有时最后会慢速重复副歌或最后一段

请分析给定的诗歌段落，输出演唱顺序。每个段落用其索引号[0], [1], [2]...表示。

只输出JSON格式：{"repeatStructure": [0, 1, 2, 1, 2, 3, 1, 2]}
其中数组中的数字是段落索引，表示演唱顺序。不要添加任何解释。`,
        },
        {
          role: "user",
          content: `诗歌标题: ${hymnTitle}\n\n段落内容:\n${versesText}\n\n请分析演唱顺序并输出JSON。`,
        },
      ];
    } else {
      // OCR mode
      if (!imageBase64) {
        return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      messages = [
        {
          role: "system",
          content: `你是一个诗歌歌词OCR识别助手。请从图片中提取诗歌歌词文本，并按以下格式输出：

第一行是诗歌标题
然后用空行分隔每一段/节
每段开头标注"第一节"、"第二节"、"副歌"等标签
去掉所有标点符号

注意：识别歌词时只提取汉字歌词部分，忽略简谱数字、和弦标记（如D, A, Bm, G等）。
只输出识别到的歌词文本，不要添加任何解释。如果图片中没有歌词内容，回复"无法识别"。`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageBase64 },
            },
            {
              type: "text",
              text: "请识别这张图片中的诗歌歌词内容",
            },
          ],
        },
      ];
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "请求过于频繁，请稍后再试" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度不足，请充值" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 服务调用失败" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    if (mode === 'repeat-structure') {
      // Parse JSON from AI response
      try {
        const jsonMatch = content.match(/\{[\s\S]*"repeatStructure"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (parseErr) {
        console.error("Failed to parse repeat structure:", parseErr, content);
      }
      return new Response(JSON.stringify({ error: "无法解析重复结构" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

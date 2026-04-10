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
          content: `你是一个教会诗歌歌词OCR识别专家。请从图片中提取诗歌歌词。

图片可能是以下两种格式之一：

**格式A：简谱（数字谱）**
结构：上面一行是简谱数字（如 5 3 4 | 5 - - -），下面紧跟歌词行。
歌词行前的 1. 2. 3. 表示不同段落。

**格式B：五线谱**
结构：五线谱音符在上方，歌词写在五线谱下方。
- 标注 1. 的行为第一段歌词
- 之后每组五线谱下方，第一行（无编号）仍属于第一段
- 第二行属于第二段，第三行属于第三段
- 即：同一组五线谱下方可能有多行歌词，按行序分别归属不同段落

**通用识别方法：**
1. 先判断图片是简谱还是五线谱
2. 找到所有歌词行，按段落编号归类
3. 将同一段号的所有歌词行按从左到右、从上到下的顺序拼成完整段落
4. 找到副歌部分（标记为"副歌"、"(副歌)"或 chorus）

**五线谱示例（弗兰西斯的祷告）：**
第一组五线谱下方有三行：
1. 使 我 作 祢 和 平 之 子
   使 我 作 祢 和 平 之 子
   使 我 作 祢 和 平 之 子
第二组五线谱下方有三行（无编号，按行序归段）：
   在 怨 恨 之 处 使 用 祢 的 爱
   在 失 望 之 处 带 出 祢 盼 望
   在 宽 恕 别 人 好 像 祢 宽 怨
→ 第一段：使我作祢和平之子 在怨恨之处使用祢的爱 在忧伤之中传送祢宽恕 在怀疑之中显出祢信实
→ 第二段：使我作祢和平之子 在失望之处带出祢盼望 在罪恶黑暗发出祢的光 在难过心灵播得永远生
→ 第三段：使我作祢和平之子 在宽恕别人好像祢宽怨 在施与别人好像祢施与 在燃烧生命得永远生命

**输出格式：**
第一行是诗歌标题
然后用空行分隔每一段
每段开头标注"第一节"、"第二节"、"副歌"等标签
去掉所有标点符号

**注意：**
- 只提取汉字歌词，忽略所有音符、简谱数字、节拍符号、和弦标记、五线谱符号
- 歌词行前的 1. 2. 3. 是段落编号，不是歌词内容
- 每段歌词要完整，把同一段号下所有行拼在一起
- 如果图片中没有歌词内容，回复"无法识别"
- 不要添加任何解释，只输出歌词`,
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
              text: "请识别这张简谱图片中的诗歌歌词，按照段落编号分别提取每一节和副歌的完整歌词",
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

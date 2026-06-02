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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
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

**关键规则：按行号归段**

许多简谱每行乐谱下方有多行歌词，这些歌词**必须按行号（行序）归段**，而不是按乐谱行归段：

每行简谱下方：
- 第1行歌词 → 属于第一节
- 第2行歌词 → 属于第二节
- 第3行歌词 → 属于第三节（如有）
- 标注为"副歌"的行 → 属于副歌

**示例：因他活着**

[简谱行1]
第1行歌词：神差爱子人称祂耶稣
第2行歌词：生命为赎我罪过
第3行歌词：墓证明我救主今活着

[简谱行2]
第1行歌词：何等甘美抱新生婴孩
第2行歌词：信仰这幼小生命
第3行歌词：未可知明天只因主活活着

[简谱行3]
第1行歌词：当我走完人生的路程
第2行歌词：我对付死亡我战胜了死亡
第3行歌词：我能面对在荣光中我见救主祂是活着

[副歌]
因他活着我能面对明天因他活着不再惧怕
我深知道他掌管明天生命充满了希望只因他活着

**归段结果：**
第一节 = 所有第1行按顺序拼接：神差爱子人称祂耶稣 何等甘美抱新生婴孩 当我走完人生的路程
第二节 = 所有第2行按顺序拼接：生命为赎我罪过 信仰这幼小生命 我对付死亡我战胜了死亡
第三节 = 所有第3行按顺序拼接：墓证明我救主今活着 未可知明天只因主活活着 我能面对在荣光中我见救主祂是活着
副歌 = 因他活着我能面对明天因他活着不再惧怕 我深知道他掌管明天生命充满了希望只因他活着

**通用识别方法：**
1. 找到所有歌词行，忽略简谱数字、五线谱符号、节拍符号、和弦标记
2. 判断每行歌词的行号（是每行乐谱下的第1行、第2行还是第3行）
3. 按行号归类：所有第1行拼成第一节，所有第2行拼成第二节，所有第3行拼成第三节
4. 副歌单独提取（通常标注"副歌"或 chorus，只有一行）
5. 按从上到下、从左到右的顺序拼接同一段的所有歌词行

**输出格式：**
第一行是诗歌标题
然后用空行分隔每一段
每段开头标注"第一节"、"第二节"、"副歌"等标签
去掉所有标点符号和空格

**注意事项：**
- 只提取汉字歌词，忽略音符、数字、符号
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

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
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

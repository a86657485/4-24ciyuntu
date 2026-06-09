import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const STAGE_META = [
  { id: 1, name: "初始流程图", shortName: "初始流程图" },
  { id: 2, name: "分词", shortName: "分词" },
  { id: 3, name: "去废词", shortName: "去废词" },
  { id: 4, name: "算词频", shortName: "算词频" },
  { id: 5, name: "合并同义词", shortName: "合并同义词" },
  { id: 6, name: "生成", shortName: "生成" },
  { id: 7, name: "实战演练", shortName: "实战演练" },
  { id: 8, name: "终极测验", shortName: "终极测验" },
] as const;

type StageId = (typeof STAGE_META)[number]["id"];
type AnyRecord = Record<string, any>;

const STAGE_MAX_SCORE: Record<StageId, number> = {
  1: 30,
  2: 112,
  3: 70,
  4: 30,
  5: 56,
  6: 20,
  7: 50,
  8: 150,
};

const TOTAL_MAX_SCORE = Object.values(STAGE_MAX_SCORE).reduce((total, current) => total + current, 0);

type RawRow = {
  id: number;
  playerName: string;
  stage: number;
  score: number;
  failCount: number;
  details: string | null;
  timestamp: string;
};

type ParsedRow = Omit<RawRow, "details"> & {
  details: any;
};

const stageNameMap = Object.fromEntries(STAGE_META.map((item) => [item.id, item.name])) as Record<number, string>;
const stageShortNameMap = Object.fromEntries(STAGE_META.map((item) => [item.id, item.shortName])) as Record<number, string>;

const safeJsonParse = (value: string | null) => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const toParsedRows = (rows: RawRow[]): ParsedRow[] => {
  return rows.map((row) => ({
    ...row,
    details: safeJsonParse(row.details),
  }));
};

const sum = (values: number[]) => values.reduce((total, current) => total + current, 0);

const getTopWords = (entries: { text: string; count: number }[], limit = 4) => {
  return entries
    .filter((item) => item && item.text)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

const getQuizSummary = (details: any) => {
  const records = Array.isArray(details) ? details : [];
  const total = records.length;
  const correct = records.filter((item) => item?.isCorrect).length;
  return {
    total,
    correct,
    wrong: Math.max(0, total - correct),
    accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
  };
};

const extractArticleParts = (details: AnyRecord = {}) => {
  const rawTextFull = typeof details?.rawTextFull === "string" ? details.rawTextFull.trim() : "";
  const articleTitleField = typeof details?.articleTitle === "string" ? details.articleTitle.trim() : "";
  const articleBodyField = typeof details?.articleBody === "string" ? details.articleBody.trim() : "";

  if (articleTitleField || articleBodyField) {
    return {
      articleTitle: articleTitleField,
      articleBody: articleBodyField,
      rawTextFull: rawTextFull || [articleTitleField, articleBodyField].filter(Boolean).join("\n"),
    };
  }

  if (!rawTextFull) {
    return {
      articleTitle: "",
      articleBody: "",
      rawTextFull: "",
    };
  }

  const lines = rawTextFull
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    articleTitle: lines[0] || rawTextFull.slice(0, 18),
    articleBody: lines.slice(1).join("\n") || lines[0] || rawTextFull,
    rawTextFull,
  };
};

const getStage6Detail = (details: AnyRecord = {}) => {
  const article = extractArticleParts(details);

  return {
    sourceLabel: typeof details?.sourceLabel === "string" ? details.sourceLabel : "",
    articleTitle: article.articleTitle,
    articleBody: article.articleBody,
    rawTextFull: article.rawTextFull,
    articlePreview: typeof details?.rawTextPreview === "string"
      ? details.rawTextPreview
      : article.articleBody.slice(0, 180),
    segmentedWords: Array.isArray(details?.segmentedWords) ? details.segmentedWords : [],
    cleanedWords: Array.isArray(details?.cleanedWords) ? details.cleanedWords : [],
    finalWordFreq: Array.isArray(details?.finalWordFreq) ? details.finalWordFreq : [],
    wordCloudImage: typeof details?.wordCloudImage === "string" ? details.wordCloudImage : "",
  };
};

const looksLikeStage6Detail = (details: any) => {
  return Boolean(
    details &&
    typeof details === "object" &&
    !Array.isArray(details) &&
    (
      details.articleBody ||
      details.rawTextFull ||
      details.wordCloudImage ||
      Array.isArray(details.finalWordFreq)
    )
  );
};

const getRowMaxScore = (row: ParsedRow) => {
  if (row.stage === 6 && looksLikeStage6Detail(row.details)) {
    return STAGE_MAX_SCORE[7];
  }
  return STAGE_MAX_SCORE[row.stage as StageId] || 0;
};

const clampScore = (score: number, maxScore: number) => {
  if (maxScore <= 0) return 0;
  return Math.min(Math.max(Number(score) || 0, 0), maxScore);
};

const toPercentScore = (score: number, maxScore: number) => {
  if (maxScore <= 0) return 0;
  return Math.round((clampScore(score, maxScore) / maxScore) * 100);
};

const getQuizRecords = (details: any) => {
  return Array.isArray(details) ? details : [];
};

const getStageStatusLabel = (failCount: number) => {
  if (failCount <= 0) return "表现流畅";
  if (failCount <= 2) return "有少量试错";
  if (failCount <= 4) return "需要提示修正";
  return "需要重点支持";
};

const buildStageInsight = (row: ParsedRow) => {
  const details = row.details;

  if (row.stage === 1) {
    const failCounts = details?.failCounts || {};
    const totalFails = sum(Object.values(failCounts).map((value) => Number(value) || 0));
    const selected = Array.isArray(details?.finalQ2Selection) ? details.finalQ2Selection.length : 0;
    return {
      tags: ["词云概念", `多选完成 ${selected} 项`],
      note: totalFails > 0
        ? `完成词云概念辨析，经历 ${totalFails} 次概念试错后完成判断。`
        : "完成词云基础概念辨析，能快速理解词云与词频之间的关系。",
      rawSummary: { failCounts, finalQ2Selection: details?.finalQ2Selection || [] },
    };
  }

  if (row.stage === 2) {
    const slices = Array.isArray(details?.sliceDetails) ? details.sliceDetails : [];
    const totalAttempts = sum(slices.map((item) => Number(item?.failCount) || 0));
    const finishedLevels = slices.length;
    return {
      tags: [`完成 ${finishedLevels} 轮分词`, `分词失误 ${totalAttempts} 次`],
      note: finishedLevels > 0
        ? `完成 ${finishedLevels} 轮句子切分练习，分词边界理解 ${totalAttempts <= 1 ? "较稳定" : "仍有反复修正"}。`
        : "已提交分词关卡记录，但缺少分词明细。",
      rawSummary: { sliceDetails: slices },
    };
  }

  if (row.stage === 3) {
    const classifyFails = Number(details?.failCountClassify) || row.failCount || 0;
    return {
      tags: ["去废词完成", `分类失误 ${classifyFails} 次`],
      note: classifyFails > 0
        ? `完成停用词筛选，经历 ${classifyFails} 次分类修正后保留有效关键词。`
        : "完成停用词筛选，能较顺畅地区分停用词和有效词。",
      rawSummary: details,
    };
  }

  if (row.stage === 4) {
    const frequencies = details?.wordFrequencies || {};
    const topWord = Object.entries(frequencies).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    return {
      tags: [`统计词数 ${Object.keys(frequencies).length} 个`, `词频失误 ${row.failCount} 次`],
      note: topWord
        ? `完成词频统计，当前最高频词为“${topWord[0]}”，出现 ${topWord[1]} 次。`
        : "完成词频统计关卡，但未找到词频结果。",
      rawSummary: details,
    };
  }

  if (row.stage === 5) {
    const validWords = Object.entries(details || {}).filter(([key, value]) => !key.startsWith("failCount") && typeof value === "number");
    const topWord = validWords.sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    return {
      tags: [`合并词项 ${validWords.length} 个`, `同义词失误 ${Number(details?.failCountSynonyms) || 0} 次`],
      note: topWord
        ? `完成同义词合并，归并后的最高频词为“${topWord[0]}”，出现 ${topWord[1]} 次。`
        : "完成同义词合并关卡，但未找到合并后的词频结果。",
      rawSummary: details,
    };
  }

  if (row.stage === 6) {
    if (looksLikeStage6Detail(details)) {
      const stage6 = getStage6Detail(details);
      const words = stage6.finalWordFreq;
      const topWords = getTopWords(words, 5);
      return {
        tags: [`旧实战词项 ${words.length} 个`, stage6.articleTitle ? `文章：${stage6.articleTitle}` : "自主分析"],
        note: topWords.length > 0
          ? `旧编号实战记录：最终高频词为 ${topWords.map((item) => item.text).join("、")}。`
          : "旧编号实战记录已保留，但词频结果较少。",
        rawSummary: stage6,
      };
    }

    const words = Array.isArray(details) ? details : [];
    const topWords = getTopWords(words, 5);
    return {
      tags: [`词云词项 ${words.length} 个`, ...topWords.slice(0, 2).map((item) => item.text)],
      note: topWords.length > 0
        ? `成功生成词云草图，核心词集中在 ${topWords.map((item) => item.text).join("、")}。`
        : "完成词云生成关卡，但未记录词云词项。",
      rawSummary: { words },
    };
  }

  if (row.stage === 7) {
    const stage6 = getStage6Detail(details);
    const words = stage6.finalWordFreq;
    const topWords = getTopWords(words, 5);
    return {
      tags: [`实战词项 ${words.length} 个`, stage6.articleTitle ? `文章：${stage6.articleTitle}` : "自主分析"],
      note: topWords.length > 0
        ? `完成自主文本实战，${stage6.articleTitle ? `围绕《${stage6.articleTitle}》` : ""}最终高频词为 ${topWords.map((item) => item.text).join("、")}。`
        : "进入实战演练并完成词云生成，但词频结果较少。",
      rawSummary: stage6,
    };
  }

  if (row.stage === 8) {
    const quizSummary = getQuizSummary(details);
    return {
      tags: [`正确率 ${quizSummary.accuracy}%`, `答对 ${quizSummary.correct}/${quizSummary.total}`],
      note: quizSummary.total > 0
        ? `完成知识测验，共答对 ${quizSummary.correct} 题，正确率 ${quizSummary.accuracy}%。`
        : "已提交知识测验记录，但缺少题目作答明细。",
      rawSummary: { records: details, quizSummary },
    };
  }

  return {
    tags: [],
    note: "暂无阶段评价。",
    rawSummary: details,
  };
};

const buildStudentEvaluation = (stageMap: Map<number, ParsedRow>, totalScore: number, totalFails: number) => {
  const completedStages = Array.from(stageMap.keys()).length;
  const quizSummary = stageMap.get(8) ? getQuizSummary(stageMap.get(8)?.details) : null;
  const stage7Details = stageMap.get(7)?.details;
  const legacyStage6Details = stageMap.get(6)?.details;
  const stage6Words = Array.isArray(stage7Details?.finalWordFreq)
    ? stage7Details.finalWordFreq
    : Array.isArray(legacyStage6Details?.finalWordFreq)
      ? legacyStage6Details.finalWordFreq
      : [];
  const topWords = getTopWords(stage6Words, 3);

  const processText = completedStages >= STAGE_META.length
    ? "学习路径完整，已经完成从词云认知到自主实战再到知识测验的完整闭环。"
    : `当前已完成 ${completedStages} 个阶段，学习过程仍在推进中，建议继续补齐后续关卡以形成完整能力链。`;

  const operationText = totalFails <= 3
    ? "过程操作较稳定，遇到任务规则时能较快理解并完成。"
    : totalFails <= 8
      ? "存在一定试错，但能够在提示后持续修正，说明具备调整能力。"
      : "过程试错较多，建议在分词边界判断和词语归类规则上增加示范练习。";

  const masteryText = quizSummary && quizSummary.total > 0
    ? quizSummary.accuracy >= 85
      ? "知识测验表现优秀，说明对词云制作原理、停用词处理和词频统计已经形成较清晰理解。"
      : quizSummary.accuracy >= 60
        ? "知识测验基础达标，建议针对易错题继续巩固“数据说话”和“停用词过滤”这些关键概念。"
        : "知识测验正确率偏低，建议在完成实战后回到概念题进行针对性复盘。"
    : "尚未完成知识测验，可结合前面各关过程表现继续观察概念掌握程度。";

  const applicationText = topWords.length > 0
    ? `在实战文本处理中，学生已经能够提炼出 ${topWords.map((item) => item.text).join("、")} 等核心词，具备基础文本分析能力。`
    : "暂未产出完整实战词云结果，可继续关注学生在真实文本处理中的迁移应用能力。";

  return [processText, operationText, masteryText, applicationText];
};

const aggregateDashboardData = (rows: ParsedRow[]) => {
  const byStudent = new Map<string, ParsedRow[]>();

  for (const row of rows) {
    const key = row.playerName || "未知学生";
    if (!byStudent.has(key)) {
      byStudent.set(key, []);
    }
    byStudent.get(key)!.push(row);
  }

  const students = Array.from(byStudent.entries()).map(([playerName, studentRows]) => {
    const sortedRows = [...studentRows].sort((a, b) => a.id - b.id);
    const latestStageMap = new Map<number, ParsedRow>();

    for (const row of sortedRows) {
      latestStageMap.set(row.stage, row);
    }

    const rawTotalScore = sum(Array.from(latestStageMap.values()).map((row) => row.score));
    const weightedScore = sum(Array.from(latestStageMap.values()).map((row) => clampScore(row.score, getRowMaxScore(row))));
    const totalScore = TOTAL_MAX_SCORE > 0 ? Math.round((weightedScore / TOTAL_MAX_SCORE) * 100) : 0;
    const totalFails = sum(Array.from(latestStageMap.values()).map((row) => row.failCount));
    const latestRow = sortedRows[sortedRows.length - 1];
    const completedStages = latestStageMap.size;
    const stageTimeline = STAGE_META.map((stage) => {
      const row = latestStageMap.get(stage.id);
      if (!row) {
        return {
          stageId: stage.id,
          stageName: stage.name,
          shortName: stage.shortName,
          status: "未完成",
          score: 0,
          scorePercent: 0,
          rawScore: 0,
          maxScore: STAGE_MAX_SCORE[stage.id],
          failCount: 0,
          timestamp: "",
          note: "该阶段暂无提交记录。",
          tags: [],
          details: null,
        };
      }

      const insight = buildStageInsight(row);
      const maxScore = getRowMaxScore(row);
      const scorePercent = toPercentScore(row.score, maxScore);

      return {
        stageId: stage.id,
        stageName: stage.name,
        shortName: stage.shortName,
        status: getStageStatusLabel(row.failCount),
        score: scorePercent,
        scorePercent,
        rawScore: row.score,
        maxScore,
        failCount: row.failCount,
        timestamp: row.timestamp,
        note: insight.note,
        tags: insight.tags,
        details: row.details,
      };
    });

    const stage7 = latestStageMap.get(7);
    const stage8 = latestStageMap.get(8);
    const quizSummary = stage8 ? getQuizSummary(stage8.details) : { total: 0, correct: 0, wrong: 0, accuracy: 0 };
    const legacyStage6 = latestStageMap.get(6);
    const stage6Detail = stage7 && looksLikeStage6Detail(stage7.details)
      ? getStage6Detail(stage7.details)
      : legacyStage6 && looksLikeStage6Detail(legacyStage6.details)
        ? getStage6Detail(legacyStage6.details)
        : getStage6Detail({});
    const stage6Words = stage6Detail.finalWordFreq;
    const stage7Records = stage8 ? getQuizRecords(stage8.details) : [];

    return {
      playerName,
      submissionCount: sortedRows.length,
      completedStages,
      totalScore,
      rawTotalScore: weightedScore,
      actualRawTotalScore: rawTotalScore,
      maxTotalScore: TOTAL_MAX_SCORE,
      totalFails,
      latestTimestamp: latestRow?.timestamp || "",
      latestStage: latestRow?.stage || 0,
      latestStageName: stageNameMap[latestRow?.stage || 0] || "暂无阶段",
      progressPercent: Math.round((completedStages / STAGE_META.length) * 100),
      evaluation: buildStudentEvaluation(latestStageMap, totalScore, totalFails),
      quizSummary,
      stageTimeline,
      wordCloudImage: stage6Detail.wordCloudImage,
      textPreview: stage6Detail.articlePreview,
      articleTitle: stage6Detail.articleTitle,
      sourceLabel: stage6Detail.sourceLabel,
      topWords: getTopWords(stage6Words, 8),
      stage6Detail,
      stage7Detail: {
        summary: quizSummary,
        records: stage7Records,
      },
      rawStageCount: latestStageMap.size,
    };
  }).sort((a, b) => {
    if (b.completedStages !== a.completedStages) return b.completedStages - a.completedStages;
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.latestTimestamp.localeCompare(a.latestTimestamp);
  });

  const completedStudents = students.filter((student) => student.completedStages === STAGE_META.length).length;
  const avgScore = students.length > 0 ? Math.round(sum(students.map((item) => item.totalScore)) / students.length) : 0;
  const avgFails = students.length > 0 ? Math.round(sum(students.map((item) => item.totalFails)) / students.length) : 0;
  const avgAccuracyCandidates = students.filter((student) => student.quizSummary.total > 0);
  const avgAccuracy = avgAccuracyCandidates.length > 0
    ? Math.round(sum(avgAccuracyCandidates.map((item) => item.quizSummary.accuracy)) / avgAccuracyCandidates.length)
    : 0;

  const stageStats = STAGE_META.map((stage) => {
    const count = students.filter((student) => student.rawStageCount >= stage.id).length;
    return {
      stageId: stage.id,
      stageName: stage.name,
      shortName: stage.shortName,
      count,
      percent: students.length > 0 ? Math.round((count / students.length) * 100) : 0,
    };
  });

  return {
    metrics: {
      totalStudents: students.length,
      totalRecords: rows.length,
      completedStudents,
      avgScore,
      avgFails,
      avgAccuracy,
    },
    stageStats,
    students,
  };
};

// Wrap for Netlify: read from single blob, parse details, aggregate
export default async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders, status: 204 });
  try {
    const store = getStore({ name: "learning-records" });
    let rows: any[] = [];
    try {
      const data = await store.get("all-records", { type: "json" });
      if (Array.isArray(data)) rows = data;
    } catch { /* empty */ }

    const parsed = rows.map((r: any) => ({ ...r, details: safeJsonParse(r.details) }));
    const result = aggregateDashboardData(parsed);

    // Strip heavy fields from list response (detail loads on demand via /api/student-detail)
    result.students = result.students.map((s: any) => {
      const hasWordCloud = !!(s.wordCloudImage || s.stage6Detail?.wordCloudImage);
      const hasArticle = !!(s.stage6Detail?.articleBody);
      const hasArticleContent = !!(s.stage6Detail?.articleBody || s.stage6Detail?.rawTextFull);
      const hasQuizRecords = !!(s.stage7Detail?.records?.length);
      return {
        playerName: s.playerName,
        completedStages: s.completedStages,
        totalScore: s.totalScore,
        totalFails: s.totalFails,
        latestTimestamp: s.latestTimestamp,
        progressPercent: s.progressPercent,
        quizSummary: s.quizSummary || { total: 0, correct: 0, wrong: 0, accuracy: 0 },
        hasWordCloud,
        hasArticle,
        hasArticleContent,
        hasQuizRecords,
        stage6Detail: { hasArticle, hasArticleContent },
        stage7Detail: { summary: s.stage7Detail?.summary || { total: 0, correct: 0, wrong: 0, accuracy: 0 }, records: [] },
      };
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

export const config: Config = { path: "/api/dashboard-data" };
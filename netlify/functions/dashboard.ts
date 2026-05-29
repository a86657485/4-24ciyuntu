import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const STAGE_META = [
  { id: 1, name: "初始流程图", shortName: "初始流程图" },
  { id: 2, name: "分词", shortName: "分词" },
  { id: 3, name: "去废语", shortName: "去废语" },
  { id: 4, name: "算词频", shortName: "算词频" },
  { id: 5, name: "合并同义词", shortName: "合并同义词" },
  { id: 6, name: "生成", shortName: "生成" },
  { id: 7, name: "实战演练", shortName: "实战演练" },
  { id: 8, name: "终极测验", shortName: "终极测验" },
] as const;

const STAGE_MAX_SCORE: Record<number, number> = { 1: 30, 2: 112, 3: 70, 4: 30, 5: 56, 6: 20, 7: 50, 8: 150 };
const TOTAL_MAX_SCORE = Object.values(STAGE_MAX_SCORE).reduce((a, b) => a + b, 0);
const stageNameMap: Record<number, string> = Object.fromEntries(STAGE_META.map((s) => [s.id, s.name]));

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

const safeJsonParse = (value: any) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
};

const looksLikeStage6Detail = (details: any) => {
  return details && typeof details === "object" && !Array.isArray(details) &&
    (details.articleBody || details.rawTextFull || details.wordCloudImage || Array.isArray(details.finalWordFreq));
};

const getRowMaxScore = (row: any) => {
  return STAGE_MAX_SCORE[row.stage] || 0;
};

const clampScore = (score: number, maxScore: number) => {
  if (maxScore <= 0) return 0;
  return Math.min(Math.max(Number(score) || 0, 0), maxScore);
};

const getQuizSummary = (details: any) => {
  const records = Array.isArray(details) ? details : [];
  const total = records.length;
  const correct = records.filter((r: any) => r?.isCorrect).length;
  return { total, correct, wrong: Math.max(0, total - correct), accuracy: total > 0 ? Math.round((correct / total) * 100) : 0 };
};

const getTopWords = (entries: any[], limit = 4) => {
  if (!Array.isArray(entries)) return [];
  return entries.filter((e) => e && e.text).sort((a: any, b: any) => b.count - a.count).slice(0, limit);
};

const getStageStatusLabel = (failCount: number) => {
  if (failCount <= 0) return "表现流畅";
  if (failCount <= 2) return "有少量试错";
  if (failCount <= 4) return "需要提示修正";
  return "需要重点支持";
};

const buildStageInsight = (row: any) => {
  const details = safeJsonParse(row.details);
  if (row.stage === 6 && looksLikeStage6Detail(details)) {
    const words = details.finalWordFreq || [];
    const topWords = getTopWords(words, 5);
    return { tags: ["旧实战词项 " + words.length + " 个"], note: topWords.length > 0 ? "最终高频词为" + topWords.map((w: any) => w.text).join("、") : "旧编号实战记录已保留" };
  }
  return { tags: ["阶段 " + row.stage], note: "已完成" };
};

const aggregateDashboardData = (rows: any[]) => {
  const byStudent = new Map<string, any[]>();
  for (const row of rows) {
    const key = row.playerName || "未知学生";
    if (!byStudent.has(key)) byStudent.set(key, []);
    byStudent.get(key)!.push(row);
  }

  const students = Array.from(byStudent.entries()).map(([playerName, studentRows]) => {
    const sortedRows = [...studentRows].sort((a, b) => a.id - b.id);
    const latestStageMap = new Map<number, any>();
    for (const row of sortedRows) latestStageMap.set(row.stage, row);

    const weightedScore = sum(Array.from(latestStageMap.values()).map((r) => clampScore(r.score, getRowMaxScore(r))));
    const totalScore = TOTAL_MAX_SCORE > 0 ? Math.round((weightedScore / TOTAL_MAX_SCORE) * 100) : 0;
    const totalFails = sum(Array.from(latestStageMap.values()).map((r) => r.failCount));
    const latestRow = sortedRows[sortedRows.length - 1];
    const completedStages = latestStageMap.size;

    const stageTimeline = STAGE_META.map((stage) => {
      const row = latestStageMap.get(stage.id);
      if (!row) return { stageId: stage.id, stageName: stage.name, shortName: stage.shortName, status: "未完成", score: 0, scorePercent: 0, rawScore: 0, maxScore: STAGE_MAX_SCORE[stage.id], failCount: 0, timestamp: "", note: "该阶段暂无提交记录。", tags: [], details: null };
      const insight = buildStageInsight(row);
      const maxScore = getRowMaxScore(row);
      const rawScore = row.score || 0;
      return {
        stageId: stage.id, stageName: stage.name, shortName: stage.shortName,
        status: getStageStatusLabel(row.failCount || 0),
        score: maxScore > 0 ? Math.round((clampScore(rawScore, maxScore) / maxScore) * 100) : 0,
        scorePercent: maxScore > 0 ? Math.round((clampScore(rawScore, maxScore) / maxScore) * 100) : 0,
        rawScore, maxScore, failCount: row.failCount || 0,
        timestamp: row.timestamp, note: insight.note, tags: insight.tags, details: row.details,
      };
    });

    // Extract wordCloudImage from stage 7 (实战演练) or legacy stage 6 records
    const stage7 = latestStageMap.get(7);
    const legacyStage6 = latestStageMap.get(6);
    let wordCloudImage = "";
    let topWords: any[] = [];
    let articleTitle = "";

    if (stage7) {
      const d7 = safeJsonParse(stage7.details);
      if (looksLikeStage6Detail(d7)) {
        wordCloudImage = typeof d7.wordCloudImage === "string" ? d7.wordCloudImage : "";
        topWords = getTopWords(d7.finalWordFreq || [], 8);
        articleTitle = d7.articleTitle || "";
      }
    } else if (legacyStage6) {
      const d6 = safeJsonParse(legacyStage6.details);
      if (looksLikeStage6Detail(d6)) {
        wordCloudImage = typeof d6.wordCloudImage === "string" ? d6.wordCloudImage : "";
        topWords = getTopWords(d6.finalWordFreq || [], 8);
        articleTitle = d6.articleTitle || "";
      }
    }

    const stage8 = latestStageMap.get(8);
    const quizSummary = stage8 ? getQuizSummary(safeJsonParse(stage8.details)) : { total: 0, correct: 0, wrong: 0, accuracy: 0 };

    return {
      playerName, submissionCount: sortedRows.length, completedStages, totalScore,
      rawTotalScore: weightedScore, maxTotalScore: TOTAL_MAX_SCORE, totalFails,
      latestTimestamp: latestRow?.timestamp || "",
      latestStage: latestRow?.stage || 0,
      latestStageName: stageNameMap[latestRow?.stage || 0] || "暂无阶段",
      progressPercent: Math.round((completedStages / STAGE_META.length) * 100),
      evaluation: [],
      quizSummary, stageTimeline,
      wordCloudImage, topWords, articleTitle,
      stage6Detail: {}, stage7Detail: { summary: quizSummary, records: [] },
      rawStageCount: latestStageMap.size,
    };
  }).sort((a, b) => {
    if (b.completedStages !== a.completedStages) return b.completedStages - a.completedStages;
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.latestTimestamp.localeCompare(a.latestTimestamp);
  });

  const completedStudents = students.filter((s) => s.completedStages === STAGE_META.length).length;
  const avgScore = students.length > 0 ? Math.round(sum(students.map((s) => s.totalScore)) / students.length) : 0;
  const avgFails = students.length > 0 ? Math.round(sum(students.map((s) => s.totalFails)) / students.length) : 0;
  const avgAccuracyCandidates = students.filter((s) => s.quizSummary.total > 0);
  const avgAccuracy = avgAccuracyCandidates.length > 0 ? Math.round(sum(avgAccuracyCandidates.map((s) => s.quizSummary.accuracy)) / avgAccuracyCandidates.length) : 0;

  const stageStats = STAGE_META.map((stage) => {
    const count = students.filter((s) => s.rawStageCount >= stage.id).length;
    return { stageId: stage.id, stageName: stage.name, shortName: stage.shortName, count, percent: students.length > 0 ? Math.round((count / students.length) * 100) : 0 };
  });

  return { metrics: { totalStudents: students.length, totalRecords: rows.length, completedStudents, avgScore, avgFails, avgAccuracy }, stageStats, students };
};

export default async (_req: Request) => {
  try {
    const store = getStore({ name: "learning-records", consistency: "strong" });
    const { blobs } = await store.list({ prefix: "r:" });
    const rows: any[] = [];
    for (const blob of blobs) {
      const data = await store.get(blob.key, { type: "json" });
      if (data) rows.push(data);
    }
    rows.sort((a, b) => a.id - b.id);
    return new Response(JSON.stringify(aggregateDashboardData(rows)), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};

export const config: Config = { path: "/api/dashboard-data" };

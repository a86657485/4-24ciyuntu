import express from "express";
import Database from "better-sqlite3";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

const db = new Database("learning_records.sqlite", { verbose: console.log });

db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playerName TEXT NOT NULL,
    stage INTEGER NOT NULL,
    score INTEGER NOT NULL,
    failCount INTEGER DEFAULT 0,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

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

const adminHtml = () => `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>词云图闯关数据中心</title>
  <style>
    :root {
      --bg: #050c18;
      --paper: rgba(10, 20, 38, 0.82);
      --paper-strong: rgba(7, 15, 28, 0.96);
      --ink: #e9f6ff;
      --muted: #81a0bf;
      --line: rgba(114, 211, 255, 0.14);
      --accent: #33d1ff;
      --accent-deep: #8fe7ff;
      --gold: #7ef7d4;
      --green: #78ffb1;
      --red: #ff7b91;
      --shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      font-family: "SF Pro Display", "PingFang SC", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(circle at 0% 0%, rgba(51, 209, 255, 0.18), transparent 24%),
        radial-gradient(circle at 100% 10%, rgba(126, 247, 212, 0.14), transparent 22%),
        radial-gradient(circle at 50% 100%, rgba(34, 76, 125, 0.22), transparent 26%),
        linear-gradient(180deg, #040914 0%, #071222 48%, #050b17 100%);
    }
    body.modal-open { overflow: hidden; }
    .shell {
      max-width: 1440px;
      margin: 0 auto;
      padding: 22px 18px 40px;
    }
    .panel {
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 24px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
    }
    .toolbar {
      display: grid;
      grid-template-columns: 1.1fr 1.2fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .toolbar-main, .toolbar-side {
      padding: 18px 20px;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    h1 {
      margin: 0;
      font-size: clamp(28px, 4vw, 42px);
      line-height: 1.08;
      font-weight: 900;
    }
    .subline {
      margin-top: 8px;
      font-size: 13px;
      color: var(--muted);
    }
    .toolbar-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 999px;
      border: 1px solid rgba(114, 211, 255, 0.16);
      background: rgba(10, 28, 48, 0.78);
      font-size: 12px;
      color: var(--accent-deep);
    }
    .controls {
      display: grid;
      grid-template-columns: 1fr 180px auto;
      gap: 10px;
      align-items: center;
    }
    .input, .select {
      width: 100%;
      border: 1px solid rgba(114, 211, 255, 0.16);
      background: rgba(7, 18, 34, 0.92);
      border-radius: 14px;
      padding: 12px 14px;
      font-size: 14px;
      color: var(--ink);
    }
    button {
      cursor: pointer;
      border: 0;
      border-radius: 14px;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 800;
      background: linear-gradient(135deg, #22b8ff, #1267ff);
      color: white;
      box-shadow: 0 10px 24px rgba(18, 103, 255, 0.26);
    }
    .danger-btn {
      background: linear-gradient(135deg, #ff7b91, #c94b55);
      box-shadow: 0 10px 24px rgba(201, 75, 85, 0.24);
    }
    .danger-btn[disabled] {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      margin-bottom: 18px;
    }
    .metric-card {
      padding: 16px 18px;
      min-width: 140px;
      flex: 1 1 0;
    }
    .metric-label {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 900;
      margin-bottom: 4px;
    }
    .metric-note {
      color: rgba(233, 246, 255, 0.58);
      font-size: 12px;
    }
    .stage-strip {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .stage-card {
      padding: 14px;
    }
    .stage-card b {
      display: block;
      font-size: 22px;
      margin: 8px 0 6px;
    }
    .stage-title {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.4;
    }
    .progress-line {
      height: 8px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(255, 255, 255, 0.08);
      margin-top: 10px;
    }
    .progress-line span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #7ef7d4, #33d1ff);
    }
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .section-title {
      font-size: 22px;
      font-weight: 900;
    }
    .section-note {
      font-size: 12px;
      color: var(--muted);
    }
    .list-shell {
      overflow: hidden;
    }
    .students {
      display: grid;
      gap: 10px;
      padding: 12px;
    }
    .list-head, .student-row {
      display: grid;
      grid-template-columns: 1.4fr 96px 88px 88px 120px 108px 108px;
      gap: 10px;
      align-items: center;
    }
    .list-head {
      padding: 0 12px 10px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
    }
    .student-row {
      width: 100%;
      border: 1px solid rgba(114, 211, 255, 0.12);
      border-radius: 18px;
      background:
        linear-gradient(180deg, rgba(10, 21, 39, 0.94), rgba(8, 17, 30, 0.88));
      padding: 10px 12px;
      min-height: 84px;
    }
    .student-name {
      font-size: 20px;
      font-weight: 900;
      line-height: 1.15;
    }
    .student-name-button {
      appearance: none;
      border: 0;
      background: transparent;
      box-shadow: none;
      padding: 0;
      color: var(--ink);
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .student-name-button:hover {
      color: var(--accent-deep);
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    .mini {
      font-size: 12px;
      color: var(--muted);
      line-height: 1.45;
      margin-top: 4px;
    }
    .progress-badge, .metric-badge {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      min-height: 34px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(51, 209, 255, 0.14);
      color: var(--accent-deep);
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .chip {
      padding: 7px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      background: rgba(31, 41, 55, 0.05);
      color: var(--ink);
      border: 1px solid rgba(114, 211, 255, 0.10);
    }
    .thumb-btn {
      width: 96px;
      height: 58px;
      border-radius: 14px;
      overflow: hidden;
      padding: 0;
      border: 1px solid rgba(114, 211, 255, 0.18);
      background: rgba(5, 16, 29, 0.9);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03);
    }
    .thumb-btn img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      background: white;
    }
    .thumb-btn-empty {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      font-size: 11px;
      color: var(--muted);
      line-height: 1.3;
      padding: 6px;
    }
    .ghost-btn {
      width: 100%;
      padding: 10px 12px;
      border-radius: 12px;
      background: rgba(51, 209, 255, 0.10);
      color: var(--accent-deep);
      box-shadow: none;
    }
    .ghost-btn[disabled], .thumb-btn[disabled] {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .empty {
      padding: 42px 18px;
      text-align: center;
      border-radius: 22px;
      border: 1px dashed rgba(114, 211, 255, 0.16);
      color: var(--muted);
      background: rgba(8, 20, 36, 0.82);
    }
    .loading {
      padding: 56px 0;
      text-align: center;
      color: var(--muted);
      font-size: 15px;
    }
    .modal-shell {
      position: fixed;
      inset: 0;
      display: none;
      z-index: 60;
    }
    .modal-shell.show { display: block; }
    .modal-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(2, 8, 18, 0.72);
      backdrop-filter: blur(10px);
    }
    .modal-panel {
      position: relative;
      z-index: 1;
      max-width: 1120px;
      height: calc(100vh - 40px);
      margin: 20px auto;
      border-radius: 30px;
      background: var(--paper-strong);
      border: 1px solid rgba(114, 211, 255, 0.14);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.40);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .modal-scroll {
      overflow: auto;
      padding: 22px;
    }
    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 3;
      width: 44px;
      height: 44px;
      padding: 0;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: rgba(51, 209, 255, 0.10);
      color: var(--accent-deep);
      box-shadow: none;
    }
    .modal-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .modal-title {
      font-size: 28px;
      font-weight: 900;
      line-height: 1.1;
    }
    .detail-section {
      border-radius: 22px;
      border: 1px solid var(--line);
      background: rgba(9, 21, 38, 0.82);
      padding: 18px;
    }
    .detail-copy {
      color: rgba(31, 41, 55, 0.78);
      line-height: 1.72;
      font-size: 14px;
    }
    .detail-section h3 {
      margin: 0 0 12px;
      font-size: 20px;
    }
    .detail-section h4 {
      margin: 0 0 10px;
      font-size: 15px;
    }
    .article-box, .word-box, .quiz-box {
      border-radius: 20px;
      border: 1px solid rgba(114, 211, 255, 0.10);
      background: rgba(7, 18, 34, 0.9);
      padding: 16px;
    }
    .article-body {
      white-space: pre-wrap;
      line-height: 1.78;
      color: #ffffff;
      font-size: 15px;
      font-weight: 500;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
    }
    .cloud-large {
      display: flex;
      align-items: center;
      justify-content: center;
      width: min(100%, 820px);
      height: clamp(220px, 44vh, 360px);
      margin: 14px auto 0;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid rgba(114, 211, 255, 0.12);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 250, 255, 0.96));
      box-shadow: inset 0 0 0 1px rgba(4, 14, 28, 0.05), 0 18px 42px rgba(0, 0, 0, 0.22);
    }
    .cloud-large img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain;
      display: block;
      border-radius: 12px;
    }
    .word-box {
      min-height: 120px;
      margin-top: 12px;
    }
    .word-stream {
      line-height: 1.8;
      color: rgba(31, 41, 55, 0.82);
      font-size: 13px;
      word-break: break-word;
    }
    .freq-table {
      display: grid;
      gap: 8px;
      margin-top: 8px;
    }
    .freq-row {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 10px;
      align-items: center;
      padding: 10px 12px;
      border-radius: 14px;
      background: rgba(51, 209, 255, 0.06);
      font-size: 13px;
    }
    .freq-rank {
      color: var(--gold);
      font-weight: 800;
    }
    .compact-list {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }
    .compact-item {
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(114, 211, 255, 0.10);
      background: rgba(7, 18, 34, 0.9);
      font-size: 13px;
      line-height: 1.65;
    }
    .stage-detail-grid {
      display: grid;
      gap: 12px;
      margin-top: 12px;
    }
    .stage-detail-card {
      border-radius: 18px;
      border: 1px solid rgba(114, 211, 255, 0.12);
      background: rgba(7, 18, 34, 0.9);
      padding: 14px;
    }
    .stage-detail-card.pending {
      opacity: 0.68;
    }
    .stage-detail-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }
    .stage-detail-title {
      font-size: 17px;
      font-weight: 900;
      line-height: 1.35;
    }
    .stage-status {
      flex: 0 0 auto;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(126, 247, 212, 0.10);
      color: var(--gold);
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }
    .stage-detail-card.pending .stage-status {
      background: rgba(129, 160, 191, 0.12);
      color: var(--muted);
    }
    .stage-detail-metrics, .stage-tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .stage-note {
      color: rgba(233, 246, 255, 0.74);
      font-size: 13px;
      line-height: 1.72;
    }
    .quiz-list {
      display: grid;
      gap: 12px;
    }
    .quiz-box {
      padding: 14px;
    }
    .quiz-title {
      font-weight: 800;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    .quiz-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }
    .quiz-chip {
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      background: rgba(51, 209, 255, 0.08);
      color: var(--ink);
    }
    .quiz-chip.correct {
      background: rgba(47, 143, 102, 0.10);
      color: var(--green);
    }
    .quiz-chip.wrong {
      background: rgba(201, 75, 85, 0.10);
      color: var(--red);
    }
    .quiz-answer {
      font-size: 13px;
      color: rgba(31, 41, 55, 0.76);
      line-height: 1.6;
    }
    @media (max-width: 1260px) {
      .toolbar { grid-template-columns: 1fr; }
      .stage-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .list-head, .student-row {
        grid-template-columns: 1.4fr 96px 88px 88px 120px 108px 108px;
        min-width: 820px;
      }
      .list-shell { overflow-x: auto; }
    }
    @media (max-width: 860px) {
      .controls, .stage-strip { grid-template-columns: 1fr; }
      .modal-panel { height: calc(100vh - 16px); margin: 8px; }
      .toolbar-main, .toolbar-side, .modal-scroll { padding: 16px; }
      .metrics { display: grid; grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <section class="toolbar">
      <div class="panel toolbar-main">
        <div class="title-row">
          <h1>词云图闯关数据中心</h1>
          <div class="toolbar-actions">
            <button id="refreshBtn">刷新</button>
            <button id="clearAllBtn" class="danger-btn" type="button">清除所有数据</button>
          </div>
        </div>
        <div class="subline">按姓名查找、按姓名排序，点击词云图或文章按钮查看详细内容。</div>
      </div>
      <div class="panel toolbar-side">
        <div class="controls">
          <input id="searchInput" class="input" type="text" placeholder="搜索学生姓名" />
          <select id="sortSelect" class="select">
            <option value="name-asc">姓名 A-Z</option>
            <option value="name-desc">姓名 Z-A</option>
            <option value="progress-desc">进度从高到低</option>
          </select>
          <div class="toolbar-actions">
            <div class="pill">本地库</div>
            <div class="pill" id="lastUpdatedPill">加载中</div>
          </div>
        </div>
      </div>
    </section>

    <section id="metrics" class="metrics">
      <div class="panel metric-card loading">正在整理学生目录...</div>
    </section>

    <section id="stageStats" class="stage-strip"></section>

    <section>
      <div class="section-head">
        <div>
          <div class="section-title">学生列表</div>
          <div class="section-note">科技风列表目录，点击入口查看详情。</div>
        </div>
      </div>
      <div class="panel list-shell">
        <div class="list-head">
          <div>学生姓名</div>
          <div>词云图</div>
          <div>进度</div>
          <div>总分（百分制）</div>
          <div>测验正确率</div>
          <div>文章内容</div>
          <div>测验明细</div>
        </div>
        <div id="students" class="students"></div>
      </div>
    </section>
  </div>

  <div id="studentModal" class="modal-shell">
    <div class="modal-backdrop" data-close-modal="1"></div>
    <div class="modal-panel">
      <button id="closeModalBtn" class="modal-close" type="button">×</button>
      <div id="studentModalBody" class="modal-scroll"></div>
    </div>
  </div>

  <script>
    const pageState = { students: [], filteredStudents: [] };

    const escapeHtml = function(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const formatDate = function(value) {
      if (!value) return '暂无记录';
      const date = new Date(String(value).replace(' ', 'T'));
      if (Number.isNaN(date.getTime())) return String(value);
      return new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    };

    const setEmpty = function(id, text) {
      document.getElementById(id).innerHTML = '<div class="empty">' + escapeHtml(text) + '</div>';
    };

    const renderMetrics = function(metrics) {
      const items = [
        { label: '学生人数', value: metrics.totalStudents, note: '按姓名聚合' },
        { label: '完整通关', value: metrics.completedStudents, note: '完成 8 关' },
        { label: '平均总分', value: (metrics.avgScore || 0) + '分', note: '百分制总分' },
        { label: '平均试错', value: metrics.avgFails, note: '全流程' },
        { label: '平均测验正确率', value: metrics.avgAccuracy + '%', note: '已测验学生' }
      ];

      document.getElementById('metrics').innerHTML = items.map(function(item) {
        return '<div class="panel metric-card">' +
          '<div class="metric-label">' + escapeHtml(item.label) + '</div>' +
          '<div class="metric-value">' + escapeHtml(item.value) + '</div>' +
          '<div class="metric-note">' + escapeHtml(item.note) + '</div>' +
        '</div>';
      }).join('');
    };

    const renderStageStats = function(items) {
      if (!items.length) {
        setEmpty('stageStats', '暂无阶段统计数据。');
        return;
      }

      document.getElementById('stageStats').innerHTML = items.map(function(item) {
        return '<div class="panel stage-card">' +
          '<div class="stage-title">第 ' + escapeHtml(item.stageId) + ' 关</div>' +
          '<b>' + escapeHtml(item.count) + '</b>' +
          '<div class="stage-title">' + escapeHtml(item.shortName) + ' · ' + escapeHtml(item.percent) + '%</div>' +
          '<div class="progress-line"><span style="width:' + escapeHtml(item.percent) + '%"></span></div>' +
        '</div>';
      }).join('');
    };

    const sortStudents = function(students) {
      const sortValue = document.getElementById('sortSelect').value;
      return [...students].sort(function(a, b) {
        if (sortValue === 'name-desc') return String(b.playerName).localeCompare(String(a.playerName), 'zh-Hans-CN');
        if (sortValue === 'progress-desc') {
          if (b.completedStages !== a.completedStages) return b.completedStages - a.completedStages;
          return String(a.playerName).localeCompare(String(b.playerName), 'zh-Hans-CN');
        }
        return String(a.playerName).localeCompare(String(b.playerName), 'zh-Hans-CN');
      });
    };

    const filterAndRenderStudents = function() {
      const keyword = document.getElementById('searchInput').value.trim().toLowerCase();
      const filtered = pageState.students.filter(function(student) {
        return !keyword || String(student.playerName || '').toLowerCase().includes(keyword);
      });
      pageState.filteredStudents = sortStudents(filtered);
      renderStudents(pageState.filteredStudents);
    };

    const openStudentStagesModal = function(student) {
      const timeline = Array.isArray(student.stageTimeline) ? student.stageTimeline : [];
      const evaluation = Array.isArray(student.evaluation) ? student.evaluation : [];
      const evaluationHtml = evaluation.length
        ? evaluation.map(function(text) {
            return '<div class="compact-item">' + escapeHtml(text) + '</div>';
          }).join('')
        : '<div class="empty">暂无学习评价。</div>';
      const stageRows = timeline.length
        ? timeline.map(function(stage) {
            const isCompleted = !!stage.details;
            const tags = Array.isArray(stage.tags) && stage.tags.length
              ? '<div class="stage-tag-list">' + stage.tags.map(function(tag) {
                  return '<span class="quiz-chip">' + escapeHtml(tag) + '</span>';
                }).join('') + '</div>'
              : '';

            return '<div class="stage-detail-card' + (isCompleted ? '' : ' pending') + '">' +
              '<div class="stage-detail-head">' +
                '<div>' +
                  '<div class="stage-detail-title">第 ' + escapeHtml(stage.stageId) + ' 关 · ' + escapeHtml(stage.stageName || stage.shortName || '') + '</div>' +
                  '<div class="mini">提交时间 ' + escapeHtml(formatDate(stage.timestamp)) + '</div>' +
                '</div>' +
                '<span class="stage-status">' + escapeHtml(isCompleted ? stage.status : '未完成') + '</span>' +
              '</div>' +
              '<div class="stage-detail-metrics">' +
                '<span class="metric-badge">分数 ' + escapeHtml(stage.score || 0) + '分</span>' +
                '<span class="metric-badge">原始 ' + escapeHtml(stage.rawScore || 0) + '/' + escapeHtml(stage.maxScore || 0) + '</span>' +
                '<span class="metric-badge">试错 ' + escapeHtml(stage.failCount || 0) + ' 次</span>' +
              '</div>' +
              tags +
              '<div class="stage-note">' + escapeHtml(stage.note || '暂无阶段记录。') + '</div>' +
            '</div>';
          }).join('')
        : '<div class="empty">暂无关卡学习数据。</div>';

      const bodyHtml =
        '<div class="modal-title-row">' +
          '<div class="modal-title">' + escapeHtml(student.playerName) + ' · 全部关卡学习数据</div>' +
          '<div class="pill">最近更新 ' + escapeHtml(formatDate(student.latestTimestamp)) + '</div>' +
        '</div>' +
        '<section class="detail-section">' +
          '<div class="toolbar-actions">' +
            '<div class="pill">完成 ' + escapeHtml(student.completedStages || 0) + '/7 关</div>' +
            '<div class="pill">总分 ' + escapeHtml(student.totalScore || 0) + '分</div>' +
            '<div class="pill">原始分 ' + escapeHtml(student.rawTotalScore || 0) + '/' + escapeHtml(student.maxTotalScore || 0) + '</div>' +
            '<div class="pill">总试错 ' + escapeHtml(student.totalFails || 0) + ' 次</div>' +
            '<div class="pill">测验正确率 ' + escapeHtml(student.quizSummary && student.quizSummary.accuracy ? student.quizSummary.accuracy : 0) + '%</div>' +
          '</div>' +
        '</section>' +
        '<section class="detail-section" style="margin-top:14px;">' +
          '<h3>学习评价</h3>' +
          '<div class="compact-list">' + evaluationHtml + '</div>' +
        '</section>' +
        '<section class="detail-section" style="margin-top:14px;">' +
          '<h3>关卡明细</h3>' +
          '<div class="stage-detail-grid">' + stageRows + '</div>' +
        '</section>';

      document.getElementById('studentModalBody').innerHTML = bodyHtml;
      document.getElementById('studentModal').classList.add('show');
      document.body.classList.add('modal-open');
    };

    const openWordCloudModal = function(student) {
      const stage6 = student.stage6Detail || {};
      const freqRows = Array.isArray(stage6.finalWordFreq) && stage6.finalWordFreq.length
        ? stage6.finalWordFreq.map(function(item, idx) {
            return '<div class="freq-row">' +
              '<div><span class="freq-rank">TOP ' + escapeHtml(idx + 1) + '</span> ' + escapeHtml(item.text) + '</div>' +
              '<div>词频</div>' +
              '<div><b>' + escapeHtml(item.count) + '</b></div>' +
            '</div>';
          }).join('')
        : '<div class="empty">暂无词频统计数据。</div>';

      const bodyHtml =
        '<div class="modal-title-row">' +
          '<div class="modal-title">' + escapeHtml(student.playerName) + ' · 词云图详情</div>' +
          '<div class="pill">更新 ' + escapeHtml(formatDate(student.latestTimestamp)) + '</div>' +
        '</div>' +
        '<section class="detail-section">' +
          '<h3>词云图</h3>' +
          (stage6.wordCloudImage
            ? '<div class="cloud-large"><img src="' + stage6.wordCloudImage + '" alt="完整词云图" /></div>'
            : '<div class="empty">该学生还没有词云图。</div>') +
        '</section>' +
        '<section class="detail-section" style="margin-top:14px;">' +
          '<h3>词频统计</h3>' +
          '<div class="freq-table">' + freqRows + '</div>' +
        '</section>' +
        '<section class="detail-section" style="margin-top:14px;">' +
          '<h3>处理过程</h3>' +
          '<div class="compact-list">' +
            '<div class="compact-item"><b>分词结果</b><br />' + escapeHtml(Array.isArray(stage6.segmentedWords) && stage6.segmentedWords.length ? stage6.segmentedWords.join(' / ') : '暂无分词数据') + '</div>' +
            '<div class="compact-item"><b>清洗结果</b><br />' + escapeHtml(Array.isArray(stage6.cleanedWords) && stage6.cleanedWords.length ? stage6.cleanedWords.join(' / ') : '暂无清洗数据') + '</div>' +
          '</div>' +
        '</section>';

      document.getElementById('studentModalBody').innerHTML = bodyHtml;
      document.getElementById('studentModal').classList.add('show');
      document.body.classList.add('modal-open');
    };

    const openArticleModal = function(student) {
      const stage6 = student.stage6Detail || {};
      const bodyHtml =
        '<div class="modal-title-row">' +
          '<div class="modal-title">' + escapeHtml(student.playerName) + ' · 生成文章</div>' +
          '<div class="pill">更新 ' + escapeHtml(formatDate(student.latestTimestamp)) + '</div>' +
        '</div>' +
        '<section class="detail-section">' +
          '<h3>' + escapeHtml(stage6.articleTitle || '暂无文章题目') + '</h3>' +
          '<div class="article-box">' +
            '<div class="article-body">' + escapeHtml(stage6.articleBody || stage6.rawTextFull || '当前记录没有保存文章内容。') + '</div>' +
          '</div>' +
        '</section>';

      document.getElementById('studentModalBody').innerHTML = bodyHtml;
      document.getElementById('studentModal').classList.add('show');
      document.body.classList.add('modal-open');
    };

    const openQuizModal = function(student) {
      const stage7 = student.stage7Detail || { summary: { total: 0, correct: 0, wrong: 0, accuracy: 0 }, records: [] };
      const quizRows = Array.isArray(stage7.records) && stage7.records.length
        ? stage7.records.map(function(item, idx) {
            return '<div class="quiz-box">' +
              '<div class="quiz-title">第 ' + escapeHtml(idx + 1) + ' 题 · ' + escapeHtml(item.questionText || '未记录题目') + '</div>' +
              '<div class="quiz-meta">' +
                '<span class="quiz-chip ' + (item.isCorrect ? 'correct' : 'wrong') + '">' + (item.isCorrect ? '答对' : '答错') + '</span>' +
                '<span class="quiz-chip">选择：' + escapeHtml(item.selectedOptionText || '未记录') + '</span>' +
              '</div>' +
            '</div>';
          }).join('')
        : '<div class="empty">该学生还没有提交终极测验。</div>';

      const bodyHtml =
        '<div class="modal-title-row">' +
          '<div class="modal-title">' + escapeHtml(student.playerName) + ' · 测验明细</div>' +
          '<div class="pill">正确率 ' + escapeHtml(stage7.summary.accuracy || 0) + '%</div>' +
        '</div>' +
        '<section class="detail-section">' +
          '<div class="toolbar-actions" style="margin-bottom:12px;">' +
            '<div class="pill">共 ' + escapeHtml(stage7.summary.total || 0) + ' 题</div>' +
            '<div class="pill">答对 ' + escapeHtml(stage7.summary.correct || 0) + ' 题</div>' +
            '<div class="pill">答错 ' + escapeHtml(stage7.summary.wrong || 0) + ' 题</div>' +
          '</div>' +
          '<div class="quiz-list">' + quizRows + '</div>' +
        '</section>';

      document.getElementById('studentModalBody').innerHTML = bodyHtml;
      document.getElementById('studentModal').classList.add('show');
      document.body.classList.add('modal-open');
    };

    const renderStudents = function(students) {
      if (!students.length) {
        setEmpty('students', '没有匹配的学生。');
        return;
      }

      document.getElementById('students').innerHTML = students.map(function(student, index) {
        const thumb = student.wordCloudImage
          ? '<button type="button" class="thumb-btn" data-action="wordcloud" data-index="' + index + '"><img src="' + student.wordCloudImage + '" alt="词云图缩略图" /></button>'
          : '<button type="button" class="thumb-btn" disabled><div class="thumb-btn-empty">暂无词云</div></button>';

        return '<div class="student-row">' +
          '<div>' +
            '<button type="button" class="student-name student-name-button" data-action="student" data-index="' + index + '">' + escapeHtml(student.playerName) + '</button>' +
            '<div class="mini">最近更新 ' + escapeHtml(formatDate(student.latestTimestamp)) + '</div>' +
          '</div>' +
          '<div>' + thumb + '</div>' +
          '<div><span class="progress-badge">' + escapeHtml(student.completedStages) + '/7</span></div>' +
          '<div><span class="metric-badge">' + escapeHtml(student.totalScore) + '分</span></div>' +
          '<div><span class="metric-badge">' + escapeHtml(student.quizSummary.accuracy) + '%</span></div>' +
          '<div><button type="button" class="ghost-btn" data-action="article" data-index="' + index + '"' + (student.stage6Detail && (student.stage6Detail.articleBody || student.stage6Detail.rawTextFull) ? '' : ' disabled') + '>查看文章</button></div>' +
          '<div><button type="button" class="ghost-btn" data-action="quiz" data-index="' + index + '"' + (student.stage7Detail && student.stage7Detail.records && student.stage7Detail.records.length ? '' : ' disabled') + '>查看测验</button></div>' +
        '</div>';
      }).join('');

      document.querySelectorAll('[data-action="student"]').forEach(function(el) {
        el.addEventListener('click', function() {
          openStudentStagesModal(pageState.filteredStudents[Number(el.getAttribute('data-index'))]);
        });
      });
      document.querySelectorAll('[data-action="wordcloud"]').forEach(function(el) {
        el.addEventListener('click', function() {
          openWordCloudModal(pageState.filteredStudents[Number(el.getAttribute('data-index'))]);
        });
      });
      document.querySelectorAll('[data-action="article"]').forEach(function(el) {
        el.addEventListener('click', function() {
          openArticleModal(pageState.filteredStudents[Number(el.getAttribute('data-index'))]);
        });
      });
      document.querySelectorAll('[data-action="quiz"]').forEach(function(el) {
        el.addEventListener('click', function() {
          openQuizModal(pageState.filteredStudents[Number(el.getAttribute('data-index'))]);
        });
      });
    };

    const closeStudentModal = function() {
      document.getElementById('studentModal').classList.remove('show');
      document.body.classList.remove('modal-open');
    };

    const loadDashboard = async function() {
      try {
        const res = await fetch('/api/dashboard-data', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        document.getElementById('lastUpdatedPill').textContent = '最近更新：' + formatDate(new Date().toISOString());
        renderMetrics(data.metrics || {});
        renderStageStats(data.stageStats || []);
        pageState.students = data.students || [];
        filterAndRenderStudents();
      } catch (error) {
        console.error(error);
        setEmpty('metrics', '学生档案加载失败。');
        setEmpty('stageStats', '阶段统计加载失败。');
        setEmpty('students', '学生目录加载失败。');
      }
    };

    const clearAllData = async function() {
      const confirmed = window.confirm('确定要清除所有学生学习数据吗？此操作无法撤销。');
      if (!confirmed) return;

      const button = document.getElementById('clearAllBtn');
      button.disabled = true;
      button.textContent = '清除中...';

      try {
        const res = await fetch('/api/clear-all', { method: 'POST' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        pageState.students = [];
        pageState.filteredStudents = [];
        await loadDashboard();
      } catch (error) {
        console.error(error);
        alert('清除失败，请稍后重试。');
      } finally {
        button.disabled = false;
        button.textContent = '清除所有数据';
      }
    };

    document.getElementById('refreshBtn').addEventListener('click', loadDashboard);
    document.getElementById('clearAllBtn').addEventListener('click', clearAllData);
    document.getElementById('searchInput').addEventListener('input', filterAndRenderStudents);
    document.getElementById('sortSelect').addEventListener('change', filterAndRenderStudents);
    document.getElementById('closeModalBtn').addEventListener('click', closeStudentModal);
    document.querySelector('[data-close-modal="1"]').addEventListener('click', closeStudentModal);
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') closeStudentModal();
    });

    loadDashboard();
    setInterval(loadDashboard, 15000);
  </script>
</body>
</html>`;

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3001;

  app.use(express.json({ limit: "50mb" }));

  app.get("/admin", (_req, res) => {
    res.type("html").send(adminHtml());
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/deepseek", async (req, res) => {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.GEMINI_API_KEY;
    const { prompt, messages, temperature = 0.7 } = req.body || {};
    const normalizedMessages = Array.isArray(messages)
      ? messages
          .filter((item) => item && typeof item.content === "string")
          .map((item) => ({
            role: item.role === "assistant" || item.role === "system" ? item.role : "user",
            content: item.content,
          }))
      : typeof prompt === "string"
        ? [{ role: "user", content: prompt }]
        : [];

    if (!apiKey) {
      res.status(500).json({ error: "AI service is not configured" });
      return;
    }

    if (!normalizedMessages.length) {
      res.status(400).json({ error: "Missing prompt or messages" });
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30010);

    try {
      const aiRes = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: normalizedMessages,
          temperature,
        }),
        signal: controller.signal,
      });

      const text = await aiRes.text();
      if (!aiRes.ok) {
        console.error("DeepSeek request failed:", aiRes.status, text.slice(0, 300));
        res.status(502).json({ error: "AI service request failed" });
        return;
      }

      const data = JSON.parse(text);
      res.json({ content: data.choices?.[0]?.message?.content || "" });
    } catch (err: any) {
      console.error("DeepSeek proxy error:", err?.message || err);
      res.status(502).json({ error: "AI service is temporarily unavailable" });
    } finally {
      clearTimeout(timeoutId);
    }
  });

  app.post("/api/records", (req, res) => {
    const { playerName, stage, score, failCount, details } = req.body;

    try {
      const stmt = db.prepare(`
        INSERT INTO records (playerName, stage, score, failCount, details)
        VALUES (?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        playerName || "Unknown",
        stage || 0,
        score || 0,
        failCount || 0,
        details ? JSON.stringify(details) : "{}"
      );

      res.json({ success: true, id: info.lastInsertRowid });
    } catch (err: any) {
      console.error("Error inserting record:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/records", (_req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM records ORDER BY timestamp DESC, id DESC");
      const rows = stmt.all() as RawRow[];
      res.json(toParsedRows(rows));
    } catch (err: any) {
      console.error("Error fetching records:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/dashboard-data", (_req, res) => {
    try {
      const stmt = db.prepare("SELECT * FROM records ORDER BY id ASC");
      const rows = stmt.all() as RawRow[];
      const parsedRows = toParsedRows(rows);
      res.json(aggregateDashboardData(parsedRows));
    } catch (err: any) {
      console.error("Error aggregating dashboard data:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/clear-all", (_req, res) => {
    try {
      db.prepare("DELETE FROM records").run();
      db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run("records");
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error clearing records:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/wordcloud", (req, res) => {
    const student = req.query.student as string;
    if (!student) {
      res.status(400).json({ error: "Missing student parameter" });
      return;
    }
    try {
      const stmt = db.prepare("SELECT details FROM records WHERE playerName = ? ORDER BY id DESC");
      const rows = stmt.all(student) as { details: string | null }[];
      let wordCloudImage = "";
      for (const row of rows) {
        const details = safeJsonParse(row.details);
        if (typeof details.wordCloudImage === "string" && details.wordCloudImage.length > 100) {
          wordCloudImage = details.wordCloudImage;
          break;
        }
      }
      res.json({ student, wordCloudImage });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/student-detail", (req, res) => {
    const studentName = req.query.name as string;
    if (!studentName) {
      res.status(400).json({ error: "Missing name parameter" });
      return;
    }
    try {
      const stmt = db.prepare("SELECT * FROM records WHERE playerName = ? ORDER BY id ASC");
      const rows = stmt.all(studentName) as RawRow[];
      if (rows.length === 0) {
        res.status(404).json({ error: "Student not found" });
        return;
      }
      const parsedRows = toParsedRows(rows);
      const allData = aggregateDashboardData(parsedRows);
      const student = allData.students.find((s: any) => s.playerName === studentName);
      if (!student) {
        res.status(404).json({ error: "Student not found in aggregation" });
        return;
      }
      res.json(student);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);

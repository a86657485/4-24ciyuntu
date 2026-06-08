import React, { useState } from 'react';
import { Background } from './components/Background';
import { TopBar } from './components/TopBar';
import { Intro } from './stages/Intro';
import { Stage1 } from './stages/Stage1';
import { Stage2 } from './stages/Stage2';
import { Stage3 } from './stages/Stage3';
import { Stage4 } from './stages/Stage4';
import { Stage5 } from './stages/Stage5';
import { Stage6 } from './stages/Stage6';
import { QuizStage } from './stages/QuizStage';
import { Outro } from './stages/Outro';
import { AnimatePresence, motion } from 'motion/react';
import { TestPanel } from './components/TestPanel';
import { AITutorProvider } from './contexts/AIContext';
import { PasswordLock } from './components/PasswordLock';
import { OperationGuide, type OperationGuideContent } from './components/OperationGuide';

const normalizeWordFreq = (value: any) => {
  const source = value?.wordFrequencies && typeof value.wordFrequencies === 'object'
    ? value.wordFrequencies
    : value;

  if (!source || typeof source !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source)
      .map(([word, count]) => [word, Number(count)] as [string, number])
      .filter((entry): entry is [string, number] => Number.isFinite(entry[1]) && entry[1] > 0)
  ) as Record<string, number>;
};

const STAGE_OPERATION_GUIDES: Record<number, OperationGuideContent> = {
  1: {
    title: '第一关操作说明',
    tips: [
      '先认真看左边的词云图，找一找哪个词最大。',
      '右边会出现小问题，点击你认为正确的答案。',
      '答完后看小结，再点击“继续冒险”。',
    ],
  },
  2: {
    title: '第二关操作说明',
    tips: [
      '这一关要把一句话切成一个个有意思的词。',
      '把鼠标移到两个字中间，觉得这里该断开就点一下。',
      '如果切错了，先看看提示，再继续找正确位置。',
    ],
  },
  3: {
    title: '第三关操作说明',
    tips: [
      '先单击一个词，会出现“停用”和“有效”两个按钮。',
      '像“的、了、在、是”这类没有重点意思的词，点“停用”。',
      '像人物、地点、物品、动作这类重要词，点“有效”。',
    ],
  },
  4: {
    title: '第四关操作说明',
    tips: [
      '这一关要统计关键词出现了几次。',
      '看到目标词就点击它，右边表格会自动增加次数。',
      '每个词达到目标次数后，就说明统计完成了。',
    ],
  },
  5: {
    title: '第五关操作说明',
    tips: [
      '这一关要把同一个意思的词合并到一起。',
      '先点一个词语，再点它对应的人物或物品头像。',
      '例如“悟空、大师兄、行者”都可以连到“悟空”。',
    ],
  },
  6: {
    title: '第六关操作说明',
    tips: [
      '先看词频数据，数字越大，词云图里的字通常越大。',
      '确认数据后，点击“绘制词云图”。',
      '词云图生成后，可以继续查看评价并进入下一关。',
    ],
  },
  8: {
    title: '第八关操作说明',
    tips: [
      '这一关是终极测验，请先读清楚题目。',
      '每题只需要点击一个你认为正确的选项。',
      '答题后看解析，再点击下一题。',
    ],
  },
};

export default function App() {
  const [unlockedStages, setUnlockedStages] = useState<Record<number, boolean>>({});
  const [gameState, setGameState] = useState({
    playerName: "",
    totalXP: 0,
    currentStage: 0,
    stageResults: [] as number[],
    wordFreq: { '悟空': 12, '唐僧': 6, '妖怪': 8 }, // Default fallback
    cloudWords: [] as {text: string, count: number}[],
    isTeacherTestSession: false,
  });

  const handleStart = (name: string) => {
    setGameState(prev => ({ ...prev, playerName: name, currentStage: 1, isTeacherTestSession: false }));
  };

  const unlockStage = (stage: number) => {
    setUnlockedStages(prev => ({ ...prev, [stage]: true }));
    setGameState(prev => ({ ...prev, currentStage: stage }));
  };

  const wrapComplete = (stageIdx: number) => {
    return (score: number, extraData?: any, failCount: number = 0) => {
      // Async POST without awaiting to avoid blocking UI
      fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: gameState.playerName,
          stage: stageIdx,
          score: score,
          failCount: failCount,
          details: extraData || {}
        })
      }).catch(err => console.log('Notice: Local saving skipped', err));

      setGameState(prev => {
        const next = { ...prev };
        next.totalXP += score;
        next.stageResults[stageIdx - 1] = score;
        next.currentStage = stageIdx + 1;
        
        if ((stageIdx === 4 || stageIdx === 5) && extraData) {
          const wordFreq = normalizeWordFreq(extraData);
          if (Object.keys(wordFreq).length > 0) {
            next.wordFreq = wordFreq;
          }
        }
        if (stageIdx === 6 && extraData) {
          next.cloudWords = extraData;
        }
        
        return next;
      });
    };
  };

  const handleJump = (targetStage: number, options?: { teacherTest?: boolean }) => {
    const isTeacherTest = Boolean(options?.teacherTest);

    if (isTeacherTest) {
      setUnlockedStages(prev => ({
        ...prev,
        [targetStage]: true,
      }));
    }

    setGameState(prev => ({
      ...prev,
      currentStage: targetStage,
      playerName: isTeacherTest ? '教师测试账号' : prev.playerName,
      isTeacherTestSession: isTeacherTest,
    }));
  };

  const activeGuide = STAGE_OPERATION_GUIDES[gameState.currentStage];
  const shouldShowOperationGuide =
    Boolean(activeGuide) &&
    gameState.currentStage !== 7 &&
    (gameState.currentStage !== 8 || Boolean(unlockedStages[8]));

  return (
    <div className="min-h-screen relative font-sans text-white overflow-hidden pb-20">
      <AITutorProvider playerName={gameState.playerName}>
        <Background />
      
      {gameState.currentStage > 0 && gameState.currentStage <= 8 && (
        <TopBar stage={gameState.currentStage} xp={gameState.totalXP} />
      )}
      
      <main className="w-full h-full px-4 pt-4 pb-20 relative z-10 overflow-y-auto" style={{ height: 'calc(100vh - 60px)' }}>
        <AnimatePresence mode="wait">
          {gameState.currentStage === 0 && (
            <motion.div key="intro" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="h-full">
              <Intro onStart={handleStart} />
            </motion.div>
          )}

          {gameState.currentStage === 1 && (
            <motion.div key="stage1" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="h-full">
              <Stage1 onComplete={wrapComplete(1)} />
            </motion.div>
          )}

          {gameState.currentStage === 2 && (
            <motion.div key="stage2" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="h-full">
              <Stage2 onComplete={wrapComplete(2)} />
            </motion.div>
          )}

          {gameState.currentStage === 3 && (
            <motion.div key="stage3" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="h-full">
              <Stage4 mode="clean" onComplete={wrapComplete(3)} />
            </motion.div>
          )}

          {gameState.currentStage === 4 && (
            <motion.div key="stage4" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="h-full">
              <Stage3 onComplete={wrapComplete(4)} />
            </motion.div>
          )}

          {gameState.currentStage === 5 && (
            <motion.div key="stage5" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="h-full">
              <Stage4 mode="merge" onComplete={wrapComplete(5)} />
            </motion.div>
          )}

          {gameState.currentStage === 6 && (
            <motion.div key="stage6" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="h-full">
              <Stage5 wordFreq={gameState.wordFreq} playerName={gameState.playerName} onComplete={wrapComplete(6)} />
            </motion.div>
          )}

          {gameState.currentStage === 7 && (
            <motion.div key="stage7" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="h-full">
              {!unlockedStages[7] ? (
                 <PasswordLock stageName="实战演练" correctPassword="405" onUnlock={() => unlockStage(7)} onJump={handleJump} />
              ) : (
                 <Stage6
                   onComplete={wrapComplete(7)}
                   playerName={gameState.playerName}
                   isTeacherTestSession={gameState.isTeacherTestSession}
                   hasCompletedBefore={gameState.stageResults[6] !== undefined}
                   onGoToStage8Password={() => handleJump(8)}
                 />
              )}
            </motion.div>
          )}

          {gameState.currentStage === 8 && (
            <motion.div key="stage8" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }} className="h-full">
              {!unlockedStages[8] ? (
                 <PasswordLock stageName="终极测验" correctPassword="000" onUnlock={() => unlockStage(8)} onJump={handleJump} />
              ) : (
                 <QuizStage onComplete={wrapComplete(8)} />
              )}
            </motion.div>
          )}

          {gameState.currentStage === 9 && (
            <motion.div key="outro" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="h-full flex flex-col items-center">
              <Outro playerName={gameState.playerName} totalXP={gameState.totalXP} stageResults={gameState.stageResults} />
              
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2 }}
                onClick={() => handleJump(7)} // Jump back to Stage 7 (实战演练)
                className="mt-8 px-10 py-4 bg-brand-cyan/20 border border-brand-cyan text-brand-cyan font-bold rounded-xl text-xl hover:bg-brand-cyan hover:text-white transition shadow-[0_0_20px_rgba(0,255,255,0.4)]"
              >
                🔄 意犹未尽？使用自己的文本再次进入实战实验室
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
        {shouldShowOperationGuide && (
          <OperationGuide guideKey={gameState.currentStage} guide={activeGuide} />
        )}
      </main>

      <TestPanel onJump={handleJump} />
      </AITutorProvider>
    </div>
  );
}


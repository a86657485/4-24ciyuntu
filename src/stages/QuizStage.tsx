import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MonkeyDialog } from '../components/MonkeyDialog';
import { Button } from '../components/Button';
import { playError, playSuccess } from '../utils/audio';

interface Props {
  onComplete: (score: number, extraData?: any) => void;
}

const QUIZ_QUESTIONS = [
  {
    q: '词云图属于哪种数据呈现方式？',
    opts: ['可视化表达', '表格表达', '视频表达', '声音表达'],
    ans: 0,
    expl: '词云图是一种能直观反映文本数据的可视化表达方式。'
  },
  {
    q: '词云图的主要作用是什么？',
    opts: ['计算文本的总字数', '直观反映文本中不同词的重要性和相关性', '测试阅读速度', '给文本标注拼音'],
    ans: 1,
    expl: '它通过改变字号大小来表现词语的重要性和出现的规律。'
  },
  {
    q: '在词云图中，某个词语显示的字号越大，通常代表什么？',
    opts: ['该词的笔画越多', '该词的发音越响亮', '该词在文本中出现的频次越高', '该词的拼音越长'],
    ans: 2,
    expl: '词频决定字号大小，这是词云图的核心原理。'
  },
  {
    q: '分析《西游记》文本时，第一步应该做什么？',
    opts: ['词频统计', '设计颜色', '直接画图', '文本分词'],
    ans: 3,
    expl: '计算机无法理解长句子，必须先把句子切分成一个个独立的词语。'
  },
  {
    q: '分词主要是将什么分割成词语？',
    opts: ['句子', '偏旁', '笔画', '标点'],
    ans: 0,
    expl: '分词的基础就是把完整的句子切分为有独立含义的词语。'
  },
  {
    q: '在进行文本处理时，“停用词”通常指什么？',
    opts: ['文章的主角名字', '的、了等无意义的虚词', '所有动词', '所有形容词'],
    ans: 1,
    expl: '如“的”、“了”、“在”等，出现频率高但没有实际分析价值。'
  },
  {
    q: '为什么要进行“过滤清洗”？',
    opts: ['因为停用词太难看', '为了让文章变长', '为了突出关键信息，减少干扰', '为了凑字数'],
    ans: 2,
    expl: '去掉停用词可以让我们更集中精力去分析重要的词汇。'
  },
  {
    q: '“悟空”、“孙悟空”、“行者”在词频统计前，最好怎么处理？',
    opts: ['合并词义近似的词', '删除其中两个', '分别计算且不关联', '随机保留一个'],
    ans: 0,
    expl: '它们指代的是同一个人，合并后才能准确反映该角色的重要性。'
  },
  {
    q: '词频统计主要是统计什么？',
    opts: ['每一个标点符号的次数', '每一个关键的词语出现的次数', '整本书的字数', '每个段落的字数'],
    ans: 1,
    expl: '我们需要知道每个有意义的词出现的次数。'
  },
  {
    q: '如果同一段文本，去掉了不同的停用词词汇，生成的词云图会怎样？',
    opts: ['完全一样', '会变成空白', '会有较大变化', '只是颜色会改变'],
    ans: 2,
    expl: '保留的词汇不同，最终绘制出来的重点和图形也会产生巨大的变化。'
  },
  {
    q: '制作词云图需要用到的主要工具是什么？',
    opts: ['放大镜', '尺子', '数字化工具', '计算器'],
    ans: 2,
    expl: '我们需要依赖计算机和专业的数字化工具来处理大量文本。'
  },
  {
    q: '词频统计属于对哪种类型数据进行可视化? ',
    opts: ['非数值类数据', '纯音频数据', '视频帧数据', '图像像素数据'],
    ans: 0,
    expl: '文本本身是非数值类数据，通过统计转换为可计算的数值。'
  },
  {
    q: '如果《西游记》词云图里“唐僧”比“八戒”字号大很多，说明什么？',
    opts: ['唐僧比较胖', '唐僧文本出现次数多', '系统出错了', '八戒被删除了'],
    ans: 1,
    expl: '字号大意味着在原著文本中被提及的频次更高。'
  },
  {
    q: '四年级学生在制作词云图时，通常哪一步最考验思考能力？',
    opts: ['启动软件', '选择要保留的关键词语', '打开电脑', '认识汉字'],
    ans: 1,
    expl: '筛选哪些词有意义、哪些是停用词需要结合上下文的思考。'
  },
  {
    q: '透过《西游记》的词云图找第一主角，这体现了什么思维？',
    opts: ['随便猜', '凭感觉', '用数据说话', '少数服从多数'],
    ans: 2,
    expl: '用计算机辅助统计，利用数据作为依据得出结论，就是用数据说话！'
  }
];

export const QuizStage: React.FC<Props> = ({ onComplete }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExpl, setShowExpl] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  
  const q = QUIZ_QUESTIONS[currentQ];

  const handleSelect = (idx: number) => {
    if (showExpl) return;
    setSelected(idx);
    const isCorrect = idx === q.ans;
    if (isCorrect) {
      playSuccess();
      setScore(s => s + 10);
    } else {
      playError();
    }
    setRecords(prev => [...prev, {
      questionIndex: currentQ,
      questionText: q.q,
      selectedOptionIndex: idx,
      selectedOptionText: q.opts[idx],
      isCorrect
    }]);
    setShowExpl(true);
  };

  const handleNext = () => {
    if (currentQ < QUIZ_QUESTIONS.length - 1) {
      setCurrentQ(c => c + 1);
      setSelected(null);
      setShowExpl(false);
    } else {
      onComplete(score, records);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-4xl mx-auto py-8 px-4 min-h-[500px]">
      <div className="w-full absolute bottom-10 left-0 px-4 md:px-10 z-20 pointer-events-none">
        <MonkeyDialog 
          text={
            currentQ === 0 ? "经历了前面的实战，让俺老孙考考你！看看你掌握了多少知识点！" :
            currentQ === 5 ? "注意啦，这可是关于没用废话的知识！" :
            currentQ === 7 ? "同一号人物有好几个名字，你该怎么处理？" :
            currentQ === 12 ? "这题可是考验你对字号大小的理解！" :
            `来看第 ${currentQ + 1} 题，仔细读题目：${q.q.slice(0, 15)}...`
          }
          show={!showExpl && currentQ < QUIZ_QUESTIONS.length - 1}
        />
        {currentQ === QUIZ_QUESTIONS.length - 1 && showExpl && (
          <MonkeyDialog 
            text="太棒了！所有的测验都完成啦，你已经是一个合格的取经人了！接下来你可以选择重新去实战演练一番！"
            show={true}
          />
        )}
      </div>

      <div className="bg-glass p-8 rounded-2xl w-full flex flex-col items-center relative z-10 mb-48">
        <h2 className="text-3xl font-bold bg-gradient-to-br from-brand-gold to-[#FFF8DC] text-transparent bg-clip-text mb-2 text-center">
          第八关：终极测验
        </h2>
        <p className="text-brand-cyan mb-8 text-center font-bold">
          第 {currentQ + 1} / {QUIZ_QUESTIONS.length} 题
        </p>

        <div className="w-full max-w-2xl bg-black/40 border border-white/10 rounded-xl p-8 mb-8">
           <h3 className="text-xl font-bold text-white leading-relaxed mb-6">
             {q.q}
           </h3>

           <div className="flex flex-col gap-4">
             {q.opts.map((opt, idx) => {
               const isCorrect = idx === q.ans;
               const isSelected = selected === idx;
               let btnClass = "bg-white/5 border-white/20 hover:bg-white/10";
               
               if (showExpl) {
                 if (isCorrect) btnClass = "bg-green-500/30 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)] text-green-100";
                 else if (isSelected) btnClass = "bg-brand-red/30 border-brand-red shadow-[0_0_15px_rgba(255,68,68,0.4)] text-red-100";
                 else btnClass = "bg-white/5 border-white/10 opacity-50";
               }

               return (
                 <button
                   key={idx}
                   disabled={showExpl}
                   onClick={() => handleSelect(idx)}
                   className={`w-full text-left px-6 py-4 rounded-xl border transition-all flex items-center gap-4 ${btnClass}`}
                 >
                   <span className="font-bold text-brand-gold">{String.fromCharCode(65 + idx)}</span>
                   <span className="text-lg">{opt}</span>
                 </button>
               );
             })}
           </div>
        </div>

        <AnimatePresence>
          {showExpl && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-2xl flex flex-col gap-4"
            >
              <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-xl p-6 text-brand-gold">
                <span className="font-bold mr-2">【知识点解析】</span>
                {q.expl}
              </div>
              
              <Button onClick={handleNext} className="w-full py-4 text-xl">
                {currentQ < QUIZ_QUESTIONS.length - 1 ? '下一题 →' : '提交试卷，完成取经！'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

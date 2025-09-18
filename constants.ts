import React from 'react';
import { SearchLevel, ProtocolPhase } from './types';
import {
  DeconstructionIcon,
  KnowledgeBaseIcon,
  VectorIcon,
  DataMiningIcon,
  SynthesisIcon,
  ReasoningIcon,
  EngineeringIcon,
  ReportIcon,
  CompleteIcon,
  IdleIcon,
} from './components/common/AnimatedIcons';


export const SEARCH_LEVELS = [
  {
    id: SearchLevel.LEVEL_1,
    name: 'اسکن تاکتیکی',
    description: 'تحلیل متمرکز با یک چرخه استدلال. مناسب برای پاسخ‌های سریع.',
  },
  {
    id: SearchLevel.LEVEL_2,
    name: 'تحلیل استراتژیک',
    description: 'کاوش گسترده و تحلیل مقایسه‌ای با دو چرخه استدلال برای افزایش دقت.',
  },
  {
    id: SearchLevel.LEVEL_3,
    name: 'کاوش عمیق',
    description: 'تحلیل جامع با چهار چرخه استدلال تخصصی برای رسیدن به یک راهکار ضد-شکننده (Anti-Fragile) به همراه نقشه راه اجرایی.',
  },
];

export const PHASE_DATA: Record<ProtocolPhase, { description: string; Icon: React.FC<{ className?: string }> }> = {
    [ProtocolPhase.IDLE]: { description: 'در حالت آماده به کار', Icon: IdleIcon },
    [ProtocolPhase.QUERY_DECONSTRUCTION]: { description: 'واکشی و تجزیه درخواست اولیه', Icon: DeconstructionIcon },
    [ProtocolPhase.KNOWLEDGE_BASE_QUERYING]: { description: 'پرس‌وجو از پایگاه دانش', Icon: KnowledgeBaseIcon },
    [ProtocolPhase.SEARCH_VECTOR_GENERATION]: { description: 'تولید بردارهای جستجوی هوشمند', Icon: VectorIcon },
    [ProtocolPhase.PARALLELIZED_DATA_MINING]: { description: 'کاوش عمیق در منابع اطلاعاتی', Icon: DataMiningIcon },
    [ProtocolPhase.INFORMATION_SYNTHESIS]: { description: 'سنتز و یکپارچه‌سازی اطلاعات', Icon: SynthesisIcon },
    [ProtocolPhase.ITERATIVE_REASONING]: { description: 'استدلال تکرارشونده و بهینه‌سازی', Icon: ReasoningIcon },
    [ProtocolPhase.SOLUTION_ENGINEERING]: { description: 'مهندسی راه‌حل نهایی', Icon: EngineeringIcon },
    [ProtocolPhase.FINAL_REPORT_GENERATION]: { description: 'تولید گزارش جامع استراتژیک', Icon: ReportIcon },
    [ProtocolPhase.RETRYING]: { description: 'تلاش با خطا مواجه شد. در حال تلاش مجدد...', Icon: ReasoningIcon },
    [ProtocolPhase.COMPLETE]: { description: 'عملیات با موفقیت به پایان رسید', Icon: CompleteIcon },
};


export const PHASE_ORDER: ProtocolPhase[] = [
  ProtocolPhase.QUERY_DECONSTRUCTION,
  ProtocolPhase.KNOWLEDGE_BASE_QUERYING,
  ProtocolPhase.SEARCH_VECTOR_GENERATION,
  ProtocolPhase.PARALLELIZED_DATA_MINING,
  ProtocolPhase.INFORMATION_SYNTHESIS,
  ProtocolPhase.ITERATIVE_REASONING,
  ProtocolPhase.SOLUTION_ENGINEERING,
  ProtocolPhase.FINAL_REPORT_GENERATION,
  ProtocolPhase.COMPLETE,
];
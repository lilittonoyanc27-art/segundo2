/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  RotateCcw,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Trophy,
  Menu,
  X,
  Languages,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { QUESTIONS_DATA, PRIZE_LADDER, QuestionItem, QuestionOption } from './questions.ts';
import { sounds } from './sound.ts';
import { speakSpanish } from './speech.ts';

type LifelineType = 'fiftyFifty' | 'coach' | 'secondChance';

export default function App() {
  // Game state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedKey, setSelectedKey] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [eliminatedKeys, setEliminatedKeys] = useState<string[]>([]);
  const [usedLifelines, setUsedLifelines] = useState<Record<LifelineType, boolean>>({
    fiftyFifty: false,
    coach: false,
    secondChance: false,
  });

  // Translation visibility states (for click-to-reveal on Spanish text)
  const [showQuestionHy, setShowQuestionHy] = useState<boolean>(false);
  const [revealedOptionsHy, setRevealedOptionsHy] = useState<Record<string, boolean>>({});
  const [globalTranslationMode, setGlobalTranslationMode] = useState<'click' | 'always'>('click');

  // Coach hint modal state
  const [coachHintOpen, setCoachHintOpen] = useState<boolean>(false);
  const [grammarModalOpen, setGrammarModalOpen] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Stats
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [isGameFinished, setIsGameFinished] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Second chance state for active question
  const [secondChanceActive, setSecondChanceActive] = useState<boolean>(false);

  const currentQ: QuestionItem = QUESTIONS_DATA[currentIndex];
  const currentPrize = PRIZE_LADDER[currentIndex];

  // Guaranteed prize milestone reached so far
  const guaranteedPrize = useMemo(() => {
    let prize = '€0';
    for (let i = 0; i <= currentIndex; i++) {
      if (PRIZE_LADDER[i].isMilestone && i < currentIndex) {
        prize = PRIZE_LADDER[i].display;
      }
    }
    return prize;
  }, [currentIndex]);

  // Reset translations and eliminated choices when question changes
  useEffect(() => {
    setSelectedKey(null);
    setIsAnswerRevealed(false);
    setEliminatedKeys([]);
    setSecondChanceActive(false);
    setShowQuestionHy(globalTranslationMode === 'always');
    setRevealedOptionsHy({
      A: globalTranslationMode === 'always',
      B: globalTranslationMode === 'always',
      C: globalTranslationMode === 'always',
      D: globalTranslationMode === 'always',
    });
  }, [currentIndex, globalTranslationMode]);

  // Audio ambient drone control
  useEffect(() => {
    sounds.enabled = soundEnabled;
  }, [soundEnabled]);

  // Lifeline 1: 50:50
  const handleFiftyFifty = () => {
    if (usedLifelines.fiftyFifty || isAnswerRevealed) return;
    sounds.playLifeline();

    const wrongKeys = currentQ.options
      .map((o) => o.key)
      .filter((k) => k !== currentQ.correctKey);

    // Randomly pick two wrong answers to eliminate
    const shuffled = [...wrongKeys].sort(() => Math.random() - 0.5);
    const toEliminate = shuffled.slice(0, 2);

    setEliminatedKeys(toEliminate);
    setUsedLifelines((prev) => ({ ...prev, fiftyFifty: true }));
  };

  // Lifeline 2: Coach Hint
  const handleCoachHint = () => {
    if (usedLifelines.coach || isAnswerRevealed) return;
    sounds.playLifeline();
    setUsedLifelines((prev) => ({ ...prev, coach: true }));
    setCoachHintOpen(true);
  };

  // Lifeline 3: Second Chance
  const handleSecondChance = () => {
    if (usedLifelines.secondChance || isAnswerRevealed || secondChanceActive) return;
    sounds.playLifeline();
    setUsedLifelines((prev) => ({ ...prev, secondChance: true }));
    setSecondChanceActive(true);
  };

  // Toggle question translation on click
  const toggleQuestionHy = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQuestionHy((prev) => !prev);
  };

  // Toggle option translation on click
  const toggleOptionHy = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRevealedOptionsHy((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle option click (answer selection)
  const handleSelectOption = (key: 'A' | 'B' | 'C' | 'D') => {
    if (eliminatedKeys.includes(key)) return;
    if (isAnswerRevealed && !secondChanceActive) return;

    sounds.playOptionSelect();
    setSelectedKey(key);

    const isCorrect = key === currentQ.correctKey;

    if (isCorrect) {
      setIsAnswerRevealed(true);
      setCorrectCount((prev) => prev + 1);
      sounds.playCorrect();
      setSecondChanceActive(false);

      // Automatically reveal translations on answered question for learning
      setShowQuestionHy(true);
      setRevealedOptionsHy({ A: true, B: true, C: true, D: true });

      // If last question reached
      if (currentIndex === QUESTIONS_DATA.length - 1) {
        setTimeout(() => {
          sounds.playVictory();
          setIsGameFinished(true);
        }, 1200);
      }
    } else {
      // Wrong answer
      sounds.playIncorrect();

      if (secondChanceActive) {
        // Player used second chance lifeline, eliminate this wrong choice and let them try again!
        setEliminatedKeys((prev) => [...prev, key]);
        setSecondChanceActive(false);
      } else {
        // As per prompt: "если ответ неверный то всё равно продолжить играть"
        // Show correct answer and allow player to continue or retry!
        setIsAnswerRevealed(true);
        setWrongCount((prev) => prev + 1);

        // Reveal translations to understand mistake
        setShowQuestionHy(true);
        setRevealedOptionsHy({ A: true, B: true, C: true, D: true });
      }
    }
  };

  // Move to next question
  const handleNextQuestion = () => {
    if (currentIndex < QUESTIONS_DATA.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsGameFinished(true);
    }
  };

  // Retry the current question
  const handleRetryCurrent = () => {
    setSelectedKey(null);
    setIsAnswerRevealed(false);
    setEliminatedKeys([]);
  };

  // Jump to specific question
  const handleJumpToQuestion = (index: number) => {
    setCurrentIndex(index);
    setSidebarOpen(false);
  };

  // Restart the whole game
  const handleRestartGame = () => {
    setCurrentIndex(0);
    setSelectedKey(null);
    setIsAnswerRevealed(false);
    setEliminatedKeys([]);
    setUsedLifelines({ fiftyFifty: false, coach: false, secondChance: false });
    setCorrectCount(0);
    setWrongCount(0);
    setIsGameFinished(false);
    setShowQuestionHy(false);
    setRevealedOptionsHy({});
  };

  return (
    <div className="min-h-screen bg-[#040814] text-slate-100 flex flex-col justify-between selection:bg-amber-500/30 selection:text-amber-200 studio-glow relative overflow-x-hidden">
      {/* Background Decorative Studio Lighting */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Top central spotlight */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-blue-600/15 rounded-full blur-3xl" />
        {/* Left and right stage light beams */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
        {/* Starry Millionaire grid overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px] opacity-10" />
      </div>

      {/* Top Bar Contract (3 Zones: Brand Title, Nav Controls, Actions) */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-3.5 border-b border-blue-900/40 bg-[#060c1f]/80 backdrop-blur-md">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 via-amber-600 to-blue-900 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <span className="text-sm font-black text-slate-950 font-display">1M</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-extrabold tracking-wide font-display text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400">
              ¿Quién Quiere Ser Millonario?
            </span>
            <span className="text-[11px] text-blue-300/70 font-armenian -mt-0.5">
              Ո՞վ է ուզում դառնալ միլիոնատեր · Ֆուտբոլային իսպաներեն
            </span>
          </div>
        </div>

        {/* Zone 2: Informative quiet status */}
        <div className="hidden md:flex items-center gap-5 text-xs text-blue-200/80">
          <span className="font-semibold text-amber-400 tabular-nums">
            Հարց {currentIndex + 1} / {QUESTIONS_DATA.length}
          </span>
          <span aria-hidden="true" className="text-blue-800">·</span>
          <span className="font-semibold text-emerald-400 tabular-nums">
            Մրցանակ՝ {currentPrize.display}
          </span>
          <span aria-hidden="true" className="text-blue-800">·</span>
          <span className="text-blue-300/60 font-armenian">
            Առանց ժամանակի սահմանափակման
          </span>
        </div>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2">
          {/* Translation mode button */}
          <button
            onClick={() => {
              const nextMode = globalTranslationMode === 'click' ? 'always' : 'click';
              setGlobalTranslationMode(nextMode);
              if (nextMode === 'always') {
                setShowQuestionHy(true);
                setRevealedOptionsHy({ A: true, B: true, C: true, D: true });
              } else {
                setShowQuestionHy(false);
                setRevealedOptionsHy({});
              }
            }}
            title={globalTranslationMode === 'click' ? 'Սեղմեք իսպաներենի վրա թարգմանության համար' : 'Հայերենը միշտ բաց է'}
            className="px-2.5 py-1.5 rounded-lg border border-blue-800/60 bg-blue-950/60 hover:bg-blue-900/60 text-xs text-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Languages className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline font-armenian text-[11px]">
              {globalTranslationMode === 'click' ? 'Հայերեն՝ Սեղմելով' : 'Հայերեն՝ Բաց'}
            </span>
          </button>

          {/* Grammar guide button */}
          <button
            onClick={() => setGrammarModalOpen(true)}
            title="Քերականական ուղեցույց (Gramática)"
            className="px-2.5 py-1.5 rounded-lg border border-blue-800/60 bg-blue-950/60 hover:bg-blue-900/60 text-xs text-blue-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline font-armenian text-[11px]">Քերականություն</span>
          </button>

          {/* Sound toggle button */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Ձայնն անջատել' : 'Ձայնը միացնել'}
            className="p-2 rounded-lg border border-blue-800/60 bg-blue-950/60 hover:bg-blue-900/60 text-blue-200 transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Mobile Ladder toggle button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 transition-colors cursor-pointer"
            title="Մրցանակային սանդուղք"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Game Stage Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: The Millionaire Studio Stage (Questions, Options, Lifelines) */}
        <div className="lg:col-span-8 flex flex-col gap-5 sm:gap-6">
          
          {/* Lifelines Bar (Comodines / Օգնություններ) */}
          <div className="flex items-center justify-between bg-[#070e24]/90 border border-blue-900/60 rounded-xl px-4 py-3 shadow-lg shadow-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-blue-300/80 font-display tracking-wider uppercase">
                Օգնություն / Comodines:
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* 50:50 Lifeline */}
              <button
                onClick={handleFiftyFifty}
                disabled={usedLifelines.fiftyFifty || isAnswerRevealed}
                title="50:50 — Հեռացնում է 2 սխալ պատասխան"
                className={`relative px-3 sm:px-4 py-1.5 rounded-lg border text-xs sm:text-sm font-extrabold tracking-wider transition-all duration-200 ${
                  usedLifelines.fiftyFifty
                    ? 'border-slate-800 bg-slate-900/40 text-slate-600 line-through cursor-not-allowed'
                    : 'border-amber-400/60 bg-gradient-to-b from-amber-500/20 to-blue-950 text-amber-300 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/20 cursor-pointer'
                }`}
              >
                50:50
              </button>

              {/* Coach Hint Lifeline */}
              <button
                onClick={handleCoachHint}
                disabled={usedLifelines.coach || isAnswerRevealed}
                title="⚽ Մարզչի խորհուրդ — Քերականական հուշում ժամանակի ցուցիչի վերաբերյալ"
                className={`relative px-3 sm:px-4 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  usedLifelines.coach
                    ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                    : 'border-blue-500/60 bg-gradient-to-b from-blue-600/20 to-blue-950 text-blue-200 hover:border-cyan-300 hover:shadow-lg hover:shadow-cyan-500/20 cursor-pointer'
                }`}
              >
                <span>⚽ Մարզիչ</span>
              </button>

              {/* Second Chance Lifeline */}
              <button
                onClick={handleSecondChance}
                disabled={usedLifelines.secondChance || isAnswerRevealed || secondChanceActive}
                title="🔄 Երկրորդ հնարավորություն — Սխալվելու դեպքում կարող եք կրկին ընտրել"
                className={`relative px-3 sm:px-4 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  usedLifelines.secondChance
                    ? 'border-slate-800 bg-slate-900/40 text-slate-600 cursor-not-allowed'
                    : secondChanceActive
                    ? 'border-emerald-400 bg-emerald-500/30 text-emerald-200 animate-pulse'
                    : 'border-indigo-500/60 bg-gradient-to-b from-indigo-600/20 to-blue-950 text-indigo-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Կրկնել</span>
                <span className="sm:hidden">2x</span>
              </button>
            </div>
          </div>

          {/* Question Level Badge & Tense Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold font-display uppercase tracking-widest">
                Հարց #{currentQ.id}
              </span>
              <span className="px-3 py-1 rounded-md bg-blue-950/80 border border-blue-800/50 text-blue-200 text-xs font-medium">
                {currentQ.tenseFocus}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-armenian text-blue-300/80">
                Սեղմեք իսպաներենի վրա՝ հայերեն թարգմանության համար
              </span>
            </div>
          </div>

          {/* CLASSIC MILLIONAIRE QUESTION BOX */}
          <div className="relative group">
            {/* Outer golden/cyan glow edge lines */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-amber-400/40 to-blue-600 rounded-2xl blur-sm opacity-50 group-hover:opacity-75 transition-opacity" />
            
            <div
              onClick={toggleQuestionHy}
              className="relative bg-gradient-to-b from-[#0b1636] via-[#081026] to-[#040814] border-2 border-blue-500/50 hover:border-amber-400/60 rounded-xl p-5 sm:p-7 text-center shadow-2xl transition-all cursor-pointer select-none"
            >
              {/* Question Text in Spanish */}
              <div className="flex items-center justify-center gap-3">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
                  {currentQ.questionEs}
                </h2>
                {/* Audio speech button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakSpanish(currentQ.questionEs);
                  }}
                  title="Լսել արտասանությունը (Audio)"
                  className="p-1.5 rounded-full bg-blue-900/40 hover:bg-blue-800/80 text-blue-300 hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <Volume2 className="w-5 h-5 text-amber-400" />
                </button>
              </div>

              {/* Armenian Translation for Question (Revealed on click or always) */}
              <div
                className={`mt-4 pt-4 border-t border-blue-900/40 transition-all duration-300 ${
                  showQuestionHy ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden mt-0 pt-0 border-none'
                }`}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/70 border border-blue-700/50 text-amber-200 text-base sm:text-lg font-armenian font-medium shadow-inner">
                  <span className="text-xs">🇦🇲</span>
                  <span>{currentQ.questionHy}</span>
                </div>
              </div>

              {/* Subtle click prompt hint if translation not revealed */}
              {!showQuestionHy && (
                <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-blue-300/50 font-armenian">
                  <Eye className="w-3.5 h-3.5" />
                  <span>Սեղմեք հարցի վրա՝ թարգմանությունը տեսնելու համար</span>
                </div>
              )}
            </div>
          </div>

          {/* 4 ANSWER OPTIONS (A, B, C, D) in 2x2 grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            {currentQ.options.map((option) => {
              const isEliminated = eliminatedKeys.includes(option.key);
              const isSelected = selectedKey === option.key;
              const isCorrect = option.key === currentQ.correctKey;
              const showArmenian = revealedOptionsHy[option.key] || globalTranslationMode === 'always';

              // Visual styling logic based on answer state
              let containerStyle = 'bg-gradient-to-b from-[#0a1432] to-[#050b1c] border-blue-800/70 text-slate-100 hover:border-amber-400/70 hover:bg-blue-950/60 shadow-md';
              let badgeStyle = 'text-amber-400 border-amber-500/40 bg-amber-500/10';

              if (isEliminated) {
                containerStyle = 'bg-slate-950/30 border-slate-900 text-slate-700 opacity-20 cursor-not-allowed pointer-events-none';
                badgeStyle = 'text-slate-700 border-slate-800 bg-transparent';
              } else if (isAnswerRevealed) {
                if (isCorrect) {
                  // CORRECT ANSWER: Glowing Emerald Green
                  containerStyle = 'bg-gradient-to-b from-emerald-950/80 via-emerald-900/60 to-emerald-950 border-emerald-400 text-emerald-100 shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-400 animate-pulse';
                  badgeStyle = 'text-white border-emerald-400 bg-emerald-600 font-black';
                } else if (isSelected) {
                  // WRONG CHOSEN ANSWER: Ruby Red / Crimson
                  containerStyle = 'bg-gradient-to-b from-rose-950/80 via-rose-900/60 to-rose-950 border-rose-500 text-rose-100 shadow-lg shadow-rose-500/20';
                  badgeStyle = 'text-white border-rose-400 bg-rose-600 font-black';
                } else {
                  // Other unselected options
                  containerStyle = 'bg-[#060c1f]/60 border-blue-950 text-slate-500 opacity-50';
                  badgeStyle = 'text-slate-600 border-slate-800 bg-transparent';
                }
              } else if (isSelected) {
                // SELECTED (Suspense amber state before reveal)
                containerStyle = 'bg-gradient-to-b from-amber-950/70 via-amber-900/50 to-blue-950 border-amber-400 text-amber-100 shadow-lg shadow-amber-500/20 animate-pulse';
                badgeStyle = 'text-slate-950 border-amber-300 bg-amber-400 font-black';
              }

              return (
                <div
                  key={option.key}
                  onClick={() => !isEliminated && handleSelectOption(option.key)}
                  className={`group relative rounded-xl border-2 p-3.5 sm:p-4.5 transition-all duration-200 select-none flex flex-col justify-between ${containerStyle} ${
                    isEliminated ? '' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Diamond-style Key Badge (A, B, C, D) */}
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center font-extrabold text-sm border shrink-0 transition-transform group-hover:scale-105 ${badgeStyle}`}
                    >
                      {option.key}
                    </div>

                    {/* Spanish Option Text */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm sm:text-base font-semibold leading-snug">
                          {option.textEs}
                        </span>

                        {/* Pronunciation button */}
                        {!isEliminated && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              speakSpanish(option.textEs);
                            }}
                            title="Լսել արտասանությունը"
                            className="p-1 rounded text-blue-400 hover:text-amber-300 hover:bg-blue-900/40 transition-colors shrink-0"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Clickable Armenian Translation */}
                      <div
                        onClick={(e) => toggleOptionHy(option.key, e)}
                        className="mt-2"
                      >
                        {showArmenian ? (
                          <div className="text-xs sm:text-sm font-armenian text-amber-300/90 bg-blue-950/60 border border-blue-800/40 px-2 py-1 rounded inline-block">
                            {option.textHy}
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => toggleOptionHy(option.key, e)}
                            className="text-[11px] font-armenian text-blue-300/50 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Թարգմանություն 🇦🇲</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Feedback & Continuous Play Action Bar */}
          {isAnswerRevealed && (
            <div className="rounded-xl border border-blue-800/60 bg-[#070f2b]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-md flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start gap-3">
                {selectedKey === currentQ.correctKey ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-bold ${
                      selectedKey === currentQ.correctKey ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {selectedKey === currentQ.correctKey
                        ? '¡Respuesta Correcta! — Ճիշտ պատասխան'
                        : '¡Buen intento! — Ուշադրություն (Խաղը շարունակվում է)'}
                    </h3>
                  </div>

                  {/* Grammar explanation (why this tense is used) */}
                  <div className="mt-2 text-xs sm:text-sm text-slate-300 flex flex-col gap-1.5 bg-blue-950/40 p-3 rounded-lg border border-blue-900/40">
                    <p className="font-medium text-amber-200">
                      💡 <strong className="text-white">Ինչո՞ւ {currentQ.tenseFocus}։</strong> {currentQ.grammarTipHy}
                    </p>
                    <p className="text-blue-200/80 italic text-xs">
                      🇪🇸 {currentQ.grammarTipEs}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Continue Playing OR Retry Question */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-blue-900/40">
                {selectedKey !== currentQ.correctKey && (
                  <button
                    onClick={handleRetryCurrent}
                    className="px-4 py-2 rounded-lg border border-blue-700/60 bg-blue-950/60 hover:bg-blue-900/60 text-xs sm:text-sm text-blue-200 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span className="font-armenian">Փորձել նորից</span>
                  </button>
                )}

                <button
                  onClick={handleNextQuestion}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all transform hover:scale-[1.02] cursor-pointer"
                >
                  <span className="font-armenian">
                    {currentIndex < QUESTIONS_DATA.length - 1 ? 'Շարունակել խաղը' : 'Տեսնել արդյունքները'}
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Info bar at bottom */}
          <div className="flex items-center justify-between text-xs text-blue-300/60 px-2">
            <span className="font-armenian">
              ⚽ Ֆուտբոլային իրավիճակներ · Pretérito Perfecto / Indefinido / Imperfecto
            </span>
            <span className="tabular-nums">
              Ճիշտ: <strong className="text-emerald-400">{correctCount}</strong> · Սխալ: <strong className="text-rose-400">{wrongCount}</strong>
            </span>
          </div>
        </div>

        {/* Right Column: The 30-Step Millionaire Money Tree Ladder */}
        <aside className="hidden lg:block lg:col-span-4 bg-[#060b1e]/90 border border-blue-900/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md sticky top-6">
          <div className="flex items-center justify-between pb-3 border-b border-blue-900/40 mb-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest font-display flex items-center gap-1.5">
              <Trophy className="w-4 h-4" />
              Մրցանակային Սանդուղք
            </span>
            <span className="text-xs text-blue-300 font-mono">
              30 Մակարդակ
            </span>
          </div>

          {/* Scrollable Money Ladder list (30 down to 1) */}
          <div className="flex flex-col gap-1 max-h-[580px] overflow-y-auto pr-1">
            {[...PRIZE_LADDER].reverse().map((item, revIdx) => {
              const qIndex = PRIZE_LADDER.length - 1 - revIdx;
              const isCurrent = qIndex === currentIndex;
              const isPassed = qIndex < currentIndex;
              const isMilestone = item.isMilestone;

              let rowStyle = 'text-blue-300/60 hover:bg-blue-950/40';
              let badgeStyle = 'text-blue-400/50';

              if (isCurrent) {
                rowStyle = 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-400 text-amber-300 font-bold shadow-md';
                badgeStyle = 'text-amber-400 font-black';
              } else if (isPassed) {
                rowStyle = 'text-emerald-400/80 bg-emerald-950/20';
                badgeStyle = 'text-emerald-400';
              } else if (isMilestone) {
                rowStyle = 'text-white font-bold bg-blue-900/20';
                badgeStyle = 'text-amber-300';
              }

              return (
                <button
                  key={item.level}
                  onClick={() => handleJumpToQuestion(qIndex)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${rowStyle}`}
                >
                  <div className="flex items-center gap-2 tabular-nums">
                    <span className={`w-6 text-right font-mono ${badgeStyle}`}>
                      {item.level}
                    </span>
                    {isMilestone && <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    <span className="font-armenian">
                      {isCurrent ? '▶ Ներկա' : `Հարց ${item.level}`}
                    </span>
                  </div>
                  <span className={`font-mono tabular-nums font-bold ${
                    isMilestone ? 'text-amber-300' : ''
                  }`}>
                    {item.display}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current bank status summary */}
          <div className="mt-4 pt-3 border-t border-blue-900/40 flex items-center justify-between text-xs">
            <span className="text-blue-300/70 font-armenian">Երաշխավորված գումար՝</span>
            <span className="font-bold text-emerald-400 font-mono tabular-nums">
              {guaranteedPrize}
            </span>
          </div>
        </aside>
      </main>

      {/* Mobile Drawer for Money Tree Ladder */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative ml-auto w-80 max-w-[85vw] h-full bg-[#060b1e] border-l border-blue-900/60 p-5 flex flex-col justify-between shadow-2xl z-10">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-blue-900/50 mb-3">
                <span className="text-sm font-bold text-amber-400 font-display flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Մրցանակային Սանդուղք
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-1 max-h-[70vh] overflow-y-auto pr-1">
                {[...PRIZE_LADDER].reverse().map((item, revIdx) => {
                  const qIndex = PRIZE_LADDER.length - 1 - revIdx;
                  const isCurrent = qIndex === currentIndex;
                  const isPassed = qIndex < currentIndex;
                  const isMilestone = item.isMilestone;

                  return (
                    <button
                      key={item.level}
                      onClick={() => handleJumpToQuestion(qIndex)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500/20 border border-amber-400 text-amber-300 font-bold'
                          : isPassed
                          ? 'text-emerald-400 bg-emerald-950/20'
                          : isMilestone
                          ? 'text-white font-bold bg-blue-900/20'
                          : 'text-blue-300/70'
                      }`}
                    >
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="w-6 text-right font-mono">
                          {item.level}
                        </span>
                        {isMilestone && <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="font-armenian">
                          {isCurrent ? '▶ Ներկա' : `Հարց ${item.level}`}
                        </span>
                      </div>
                      <span className="font-mono font-bold">{item.display}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-blue-900/40 text-xs flex justify-between">
              <span className="text-blue-300/70 font-armenian">Երաշխավորված՝</span>
              <span className="font-bold text-emerald-400 font-mono">{guaranteedPrize}</span>
            </div>
          </div>
        </div>
      )}

      {/* Coach Hint Modal */}
      {coachHintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-lg w-full bg-[#0a122e] border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl shadow-amber-500/10">
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/50">
              <div className="flex items-center gap-2 text-amber-400">
                <span className="text-xl">⚽</span>
                <h3 className="font-bold text-base font-display">
                  Մարզչի Խորհուրդը / Consejo del Entrenador
                </h3>
              </div>
              <button
                onClick={() => setCoachHintOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 flex flex-col gap-3">
              <div className="bg-blue-950/60 p-3.5 rounded-xl border border-blue-800/40">
                <span className="text-xs text-blue-300 font-semibold block mb-1">
                  ⏱️ Ժամանակային նշիչ (Marcador temporal):
                </span>
                <span className="text-base font-bold text-amber-300">
                  {currentQ.timeMarker}
                </span>
              </div>

              <div className="text-sm text-slate-200 leading-relaxed font-armenian">
                <p>
                  «Ուշադրություն դարձրու հարցի մեջ նշված ժամանակին։ Այստեղ խոսքը գնում է{' '}
                  <strong className="text-amber-300">{currentQ.tenseFocus}</strong> ({currentQ.tenseFocusHy}) ժամանակաձևի մասին։»
                </p>
                <p className="mt-2 text-xs text-blue-200/80">
                  💡 {currentQ.grammarTipHy}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCoachHintOpen(false)}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm font-armenian transition-colors cursor-pointer"
              >
                Հասկացա, շնորհակալություն
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grammar Cheat Sheet Modal */}
      {grammarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="relative max-w-2xl w-full max-h-[85vh] bg-[#070e26] border-2 border-blue-700/60 rounded-2xl p-5 sm:p-7 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-blue-900/60 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-base sm:text-lg text-white font-display">
                  Իսպաներենի Անցյալ Ժամանակաձևեր · Guía Gramatical
                </h3>
              </div>
              <button
                onClick={() => setGrammarModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-blue-900/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 overflow-y-auto pr-1 flex flex-col gap-4 text-xs sm:text-sm text-slate-200">
              {/* Pretérito Perfecto */}
              <div className="bg-blue-950/50 border border-blue-800/40 rounded-xl p-4">
                <h4 className="text-amber-300 font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>1. Pretérito Perfecto</span>
                  <span className="text-xs font-normal text-blue-300 font-armenian">(Անկատար ներկա / Վաղակատար)</span>
                </h4>
                <p className="mt-1 font-armenian text-slate-300">
                  Օգտագործվում է, երբ գործողությունը կատարվել է անցյալում, բայց այն ժամանակահատվածը, որում այն տեղի է ունեցել, դեռ չի ավարտվել կամ կապված է ներկայի հետ։
                </p>
                <div className="mt-2 text-xs text-blue-200 bg-blue-900/30 p-2 rounded">
                  <strong>Հիմնական նշիչներ՝</strong> hoy (այսօր), esta semana (այս շաբաթ), este mes (այս ամիս), este año (այս տարի), alguna vez (երբևէ)։
                  <br />
                  <strong>Կազմությունը՝</strong> haber (he, has, ha, hemos, habéis, han) + participio (-ado / -ido)։
                </div>
              </div>

              {/* Pretérito Indefinido */}
              <div className="bg-blue-950/50 border border-blue-800/40 rounded-xl p-4">
                <h4 className="text-cyan-300 font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>2. Pretérito Indefinido</span>
                  <span className="text-xs font-normal text-blue-300 font-armenian">(Անցյալ կատարյալ)</span>
                </h4>
                <p className="mt-1 font-armenian text-slate-300">
                  Օգտագործվում է անցյալում կոնկրետ ժամանակահատվածում ավարտված եզակի կամ հաջորդական գործողությունների համար։
                </p>
                <div className="mt-2 text-xs text-cyan-200 bg-cyan-950/30 p-2 rounded">
                  <strong>Հիմնական նշիչներ՝</strong> ayer (երեկ), anoche (երեկ գիշեր), el domingo pasado (անցած կիրակի), en 2023, inmediatamente (անմիջապես)։
                  <br />
                  <strong>Օրինակներ՝</strong> marqué (խփեցի), fui (գնացի), descansé (հանգստացա), empezó (սկսեց)։
                </div>
              </div>

              {/* Pretérito Imperfecto */}
              <div className="bg-blue-950/50 border border-blue-800/40 rounded-xl p-4">
                <h4 className="text-indigo-300 font-bold text-sm sm:text-base flex items-center gap-2">
                  <span>3. Pretérito Imperfecto</span>
                  <span className="text-xs font-normal text-blue-300 font-armenian">(Անցյալ անկատար)</span>
                </h4>
                <p className="mt-1 font-armenian text-slate-300">
                  Օգտագործվում է անցյալում կրկնվող սովորությունների, երկարատև գործընթացների, մանկության փուլի կամ վիճակի/բնութագրի նկարագրության համար։
                </p>
                <div className="mt-2 text-xs text-indigo-200 bg-indigo-950/30 p-2 rounded">
                  <strong>Հիմնական նշիչներ՝</strong> cuando era pequeño/niño (երբ փոքր էի), siempre (միշտ), normalmente (սովորաբար), mientras (մինչդեռ/մինչ)։
                  <br />
                  <strong>Օրինակներ՝</strong> jugaba (խաղում էի), era (էի/էր), calentaba (տաքացում էի անում)։
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-blue-900/60 flex justify-end shrink-0">
              <button
                onClick={() => setGrammarModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm font-armenian transition-colors cursor-pointer"
              >
                Փակել
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory / Game Finished Screen */}
      {isGameFinished && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95">
          <div className="relative max-w-lg w-full bg-gradient-to-b from-[#0b1638] via-[#07102a] to-[#040816] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/20">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-amber-500 via-yellow-300 to-amber-600 mx-auto flex items-center justify-center shadow-xl shadow-amber-500/40 mb-4 animate-bounce">
              <Trophy className="w-10 h-10 text-slate-950" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 font-display">
              ¡FELICIDADES MILLONARIO!
            </h2>
            <p className="mt-1 text-sm sm:text-base font-armenian text-amber-200 font-semibold">
              Շնորհավորում ենք, Դուք դարձաք Միլիոնատեր։
            </p>

            <div className="my-5 p-4 rounded-xl bg-blue-950/70 border border-blue-800/60 text-xs sm:text-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-armenian">Շահած գումար՝</span>
                <span className="text-lg font-black text-amber-400 font-mono">€1.000.000</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-armenian">Ճիշտ պատասխաններ՝</span>
                <span className="font-bold text-emerald-400 tabular-nums">{correctCount} / 30</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-armenian">Լրացուցիչ փորձեր՝</span>
                <span className="font-bold text-blue-300 tabular-nums">{wrongCount}</span>
              </div>
            </div>

            <p className="text-xs text-blue-200/80 font-armenian mb-6">
              Դուք հաջողությամբ յուրացրեցիք իսպաներենի Pretérito Perfecto, Pretérito Indefinido և Pretérito Imperfecto ժամանակաձևերը ֆուտբոլային իրական խոսակցություններում։
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleRestartGame}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="font-armenian">Խաղալ նորից</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Bar */}
      <footer className="relative z-10 py-3 px-4 border-t border-blue-900/40 bg-[#040814]/90 text-center text-xs text-blue-300/50">
        <p className="font-armenian">
          ⚽ Juego: Elige la mejor respuesta — Խաղ․ ընտրի՛ր ճիշտ պատասխանը · Իսպաներենի ուսուցում առանց ժամանակի ճնշման
        </p>
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import { Copy, Check, FileCode2, Download, Terminal } from 'lucide-react';
import { CODE_PATCHES } from '../data/patches';

export const PatchesView: React.FC = () => {
  const [selectedPatchIndex, setSelectedPatchIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const currentPatch = CODE_PATCHES[selectedPatchIndex];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentPatch.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentPatch.code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentPatch.filename.split('/').pop() || 'patch.py';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Готовые решения и патчи
            </span>
            <span className="text-xs text-slate-400">Проверено на совместимость с Python 3.11+</span>
          </div>
          <h2 className="text-2xl font-black text-slate-100 tracking-tight">
            Исправленные файлы для репозитория
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Скопируйте код или скачайте файлы для мгновенного устранения найденных багов в проекте.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/apply_fixes.py"
            download="apply_fixes.py"
            className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Автоматический скрипт применения всех правок"
          >
            <Download className="w-4 h-4" />
            <span>Скачать apply_fixes.py</span>
          </a>

          <a
            href="/smokefree_fixes.patch"
            download="smokefree_fixes.patch"
            className="px-3.5 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Полный git diff патч"
          >
            <Download className="w-4 h-4" />
            <span>Скачать .patch</span>
          </a>

          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Скопировано!' : 'Копировать текущий'}</span>
          </button>
        </div>
      </div>

      {/* One-click terminal instructions */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Как применить все исправления в 1 команду в терминале вашего репозитория:
          </span>
          <span className="text-[11px] text-slate-400 font-mono">Terminal / Bash</span>
        </div>
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono text-emerald-300 overflow-x-auto">
          <code>curl -sSL {window.location.origin}/apply_fixes.py | python3</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`curl -sSL ${window.location.origin}/apply_fixes.py | python3`);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shrink-0"
            title="Скопировать команду"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* File Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {CODE_PATCHES.map((patch, idx) => (
          <button
            key={patch.filename}
            onClick={() => {
              setSelectedPatchIndex(idx);
              setCopied(false);
            }}
            className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 shrink-0 transition-all ${
              selectedPatchIndex === idx
                ? 'bg-slate-800 text-emerald-300 border-emerald-500/40 font-semibold shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span className="font-mono">{patch.filename}</span>
          </button>
        ))}
      </div>

      {/* Code Viewer Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Info bar */}
        <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-slate-200 font-semibold">{currentPatch.filename}</span>
            <span className="text-slate-500 hidden sm:inline">&bull;</span>
            <span className="text-slate-400 hidden sm:inline">{currentPatch.description}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {currentPatch.category}
          </span>
        </div>

        {/* Code Content */}
        <div className="p-4 sm:p-6 overflow-x-auto font-mono text-xs text-slate-300 bg-slate-950 leading-relaxed max-h-[580px] overflow-y-auto">
          <pre className="whitespace-pre">{currentPatch.code}</pre>
        </div>
      </div>
    </div>
  );
};

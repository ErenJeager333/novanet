'use client';

import React, { useState } from 'react';
import { Plus, X, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PollCreatorProps {
  onPollChange: (poll: { question: string; options: string[] } | null) => void;
}

export default function PollCreator({ onPollChange }: PollCreatorProps) {
  const [active, setActive] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  function updateOption(index: number, value: string) {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    onPollChange({ question, options: newOptions });
  }

  function addOption() {
    if (options.length >= 4) return;
    const newOptions = [...options, ''];
    setOptions(newOptions);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    onPollChange({ question, options: newOptions });
  }

  function updateQuestion(value: string) {
    setQuestion(value);
    onPollChange({ question: value, options });
  }

  function removePoll() {
    setActive(false);
    setQuestion('');
    setOptions(['', '']);
    onPollChange(null);
  }

  if (!active) {
    return (
      <button
        onClick={() => setActive(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
      >
        <BarChart2 size={16} />
        Sondage
      </button>
    );
  }

  return (
    <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 space-y-2 bg-indigo-50/50 dark:bg-indigo-950/20">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
          <BarChart2 size={14} /> Sondage
        </span>
        <button onClick={removePoll} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      <input
        value={question}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateQuestion(e.target.value)}
        placeholder="Question du sondage…"
        className="w-full px-3 py-2 bg-white dark:bg-gray-800 rounded-lg text-sm border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-400"
        maxLength={100}
      />

      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}.</span>
            <input
              value={opt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(i, e.target.value)}
              placeholder={`Option ${i + 1}`}
              className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-lg text-sm border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-400"
              maxLength={50}
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {options.length < 4 && (
        <button
          onClick={addOption}
          className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-600 transition-colors"
        >
          <Plus size={14} /> Ajouter une option
        </button>
      )}
    </div>
  );
}
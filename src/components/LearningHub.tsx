import { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { LearningModule } from '../types/edna.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface LearningHubProps {
  modules: LearningModule[];
}

export function LearningHub({ modules }: LearningHubProps) {
  const [activeModule, setActiveModule] = useState<LearningModule | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B2528]">
          eDNA Methodology & Bioinformatics Learning Hub
        </h1>
        <p className="text-sm text-[#4A6366] mt-1">
          Structured curriculum covering sterile aquatic sampling, barcode marker selection, alpha diversity statistics, and conservation monitoring.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {modules.map((mod) => (
          <article
            key={mod.id}
            className="bg-white border border-[#D8E5E1] rounded-xl overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="aspect-[16/9] bg-[#F0F6F4] overflow-hidden">
                <ResilientImage
                  src={mod.imageUrl}
                  alt={mod.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-6 space-y-2.5">
                <div className="text-xs text-[#4A6366] flex items-center gap-2">
                  <span className="font-medium text-emerald-800">{mod.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{mod.difficulty}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{mod.readMinutes} min read</span>
                </div>
                <h2 className="text-xl font-semibold text-[#0B2528]">
                  {mod.title}
                </h2>
                <p className="text-sm text-[#4A6366] leading-relaxed">
                  {mod.summary}
                </p>
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={() => setActiveModule(mod)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#0B2528] bg-[#F0F6F4] hover:bg-[#E3EFEA] border border-[#D8E5E1] rounded-lg transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read Curriculum Guide</span>
              </button>
            </div>
          </article>
        ))}
      </div>

      {activeModule && (
        <div
          className="fixed inset-0 z-50 bg-[#06181A]/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeModule.title}
        >
          <div className="bg-white border border-[#D8E5E1] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-[#E7F0ED] pb-4">
              <div>
                <p className="text-xs font-mono text-emerald-800">
                  {activeModule.category} · {activeModule.difficulty} ·{' '}
                  {activeModule.readMinutes} min read
                </p>
                <h2 className="text-2xl font-bold text-[#0B2528] mt-1">
                  {activeModule.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModule(null)}
                aria-label="Close module"
                className="p-2 rounded-lg text-[#4A6366] hover:bg-[#F0F6F4]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-[#0B2528] leading-relaxed">
              {activeModule.contentMarkdown.split('\n\n').map((block, idx) => {
                if (block.startsWith('### ')) {
                  const [heading, ...rest] = block.split('\n');
                  return (
                    <div key={idx} className="space-y-2 pt-2">
                      <h3 className="text-base font-bold text-[#0B2528]">
                        {heading.replace('### ', '')}
                      </h3>
                      {rest.map((line, lIdx) => (
                        <p key={lIdx} className="text-[#4A6366]">
                          {line.replace(/^- /, '• ')}
                        </p>
                      ))}
                    </div>
                  );
                }
                return (
                  <p key={idx} className="text-[#4A6366]">
                    {block}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

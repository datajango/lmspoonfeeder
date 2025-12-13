import { useRef, useEffect } from 'react';
import type { ComfyUIGeneration, GenerationParameters } from '../../types/comfyui';
import GenerationCard from './GenerationCard';
import { Image, Loader2 } from 'lucide-react';

interface GenerationHistoryProps {
    generations: ComfyUIGeneration[];
    onReuseSettings: (params: GenerationParameters) => void;
    onViewWorkflow?: (id: string) => void;
    onDelete?: (id: string) => void;
    isPolling?: boolean;
}

export default function GenerationHistory({
    generations,
    onReuseSettings,
    onViewWorkflow,
    onDelete,
    isPolling = false,
}: GenerationHistoryProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Scroll to top when new generations are added (newest first)
    useEffect(() => {
        if (containerRef.current && generations.length > 0) {
            containerRef.current.scrollTop = 0;
        }
    }, [generations.length]);

    return (
        <div className="card h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 sticky top-0 bg-[var(--bg-card)] pb-2 z-10">
                <h3 className="font-semibold">Generation History</h3>
                {isPolling && (
                    <span className="flex items-center gap-2 text-sm text-yellow-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                    </span>
                )}
            </div>

            <div
                ref={containerRef}
                className="flex-1 overflow-y-auto space-y-4"
            >
                {generations.length === 0 ? (
                    <div className="text-center text-[var(--text-secondary)] py-8">
                        <Image className="w-10 h-10 mx-auto mb-3 opacity-50" />
                        <p>No images generated yet</p>
                        <p className="text-sm">Enter a prompt to get started</p>
                    </div>
                ) : (
                    generations.map((gen) => (
                        <GenerationCard
                            key={gen.id}
                            generation={gen}
                            onReuseSettings={onReuseSettings}
                            onViewWorkflow={onViewWorkflow}
                            onDelete={onDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
}


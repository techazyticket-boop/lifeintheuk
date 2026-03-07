import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studyMaterials } from '../data/studyMaterials';
import { useProgress } from '../hooks/useProgress';
import { ArrowLeft, CheckCircle, Play, Square, Pause } from 'lucide-react';

export default function StudyMaterial() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { progress, markChapterComplete } = useProgress();
    const [marked, setMarked] = useState(false);

    // Audio State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const chapter = studyMaterials.find(c => c.id === id);

    // Stop speaking when navigating away or changing chapters
    useEffect(() => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
        window.scrollTo(0, 0);

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [id]);

    const playAudio = () => {
        if (!chapter) return;

        if (isPaused) {
            window.speechSynthesis.resume();
            setIsPaused(false);
            setIsPlaying(true);
            return;
        }

        // Strip HTML tags for reading
        const textToRead = chapter.content.replace(/<[^>]*>?/gm, '');

        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = 'en-GB'; // British English accent
        utterance.rate = 0.95; // Slightly slower for better comprehension

        utterance.onend = () => {
            setIsPlaying(false);
            setIsPaused(false);
        };

        window.speechSynthesis.cancel(); // cancel any ongoing speech
        window.speechSynthesis.speak(utterance);

        setIsPlaying(true);
        setIsPaused(false);
    };

    const pauseAudio = () => {
        window.speechSynthesis.pause();
        setIsPaused(true);
        setIsPlaying(false);
    };

    const stopAudio = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setIsPaused(false);
    };

    if (!chapter) {
        return <div className="container" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center' }}>Chapter Not Found</div>;
    }

    const currentIndex = studyMaterials.findIndex(c => c.id === id);
    const prevChapter = currentIndex > 0 ? studyMaterials[currentIndex - 1] : null;
    const nextChapter = currentIndex < studyMaterials.length - 1 ? studyMaterials[currentIndex + 1] : null;

    const handleComplete = () => {
        markChapterComplete(chapter.id);
        setMarked(true);
        window.speechSynthesis.cancel();
        setTimeout(() => {
            if (nextChapter) {
                navigate('/study/' + nextChapter.id);
                setMarked(false);
            } else {
                navigate('/dashboard');
            }
        }, 1500);
    };

    const alreadyCompleted = progress.completedChapters.includes(chapter.id);

    return (
        <div className="container slide-up" style={{ padding: 'var(--space-xl) 0', maxWidth: '800px' }}>
            <button onClick={() => navigate('/dashboard')} className="btn btn-secondary" style={{ marginBottom: 'var(--space-lg)' }}>
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div className="glass-panel fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>{chapter.title}</h1>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>Estimated time: {chapter.timeToRead}</p>
                    </div>

                    {/* Audio Controls */}
                    <div style={{
                        display: 'flex', gap: 8, background: 'rgba(59,130,246,0.1)',
                        padding: '8px 12px', borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(59,130,246,0.25)'
                    }}>
                        {!isPlaying ? (
                            <button onClick={playAudio} className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} title="Read Aloud">
                                <Play size={16} fill="currentColor" /> {isPaused ? 'Resume' : 'Listen to Chapter'}
                            </button>
                        ) : (
                            <button onClick={pauseAudio} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' }} title="Pause Reading">
                                <Pause size={16} fill="currentColor" /> Pause
                            </button>
                        )}
                        {(isPlaying || isPaused) && (
                            <button onClick={stopAudio} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }} title="Stop Reading">
                                <Square size={16} fill="currentColor" /> Stop
                            </button>
                        )}
                    </div>
                </div>

                {/* Render HTML content securely assuming trusted local data */}
                <div
                    className="study-content"
                    dangerouslySetInnerHTML={{ __html: chapter.content }}
                    style={{ lineHeight: 1.8, fontSize: '1.1rem', marginBottom: 'var(--space-2xl)' }}
                />

                <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-color)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                    {prevChapter ? (
                        <button className="btn btn-secondary" onClick={() => navigate('/study/' + prevChapter.id)}>
                            ← Previous
                        </button>
                    ) : <div style={{ width: 100 }} />}

                    <button
                        className={"btn " + ((alreadyCompleted || marked) ? 'btn-success' : 'btn-primary')}
                        onClick={handleComplete}
                        disabled={alreadyCompleted || marked}
                    >
                        <CheckCircle size={20} />
                        {(alreadyCompleted || marked) ? 'Chapter Completed' : 'Mark as Read & Continue'}
                    </button>

                    {nextChapter ? (
                        <button className="btn btn-secondary" onClick={() => navigate('/study/' + nextChapter.id)}>
                            Next →
                        </button>
                    ) : <div style={{ width: 100 }} />}
                </div>
            </div>
        </div >
    );
}

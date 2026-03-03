import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studyMaterials } from '../data/studyMaterials';
import { useProgress } from '../hooks/useProgress';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function StudyMaterial() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { progress, markChapterComplete } = useProgress();
    const [marked, setMarked] = useState(false);

    const chapter = studyMaterials.find(c => c.id === id);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    if (!chapter) {
        return <div className="container" style={{ padding: 'var(--space-2xl) 0', textAlign: 'center' }}>Chapter Not Found</div>;
    }

    // Premium guard
    if (chapter.isPremium && !progress.isPremium) {
        return (
            <div className="container slide-up" style={{ padding: 'var(--space-xl) 0', maxWidth: '800px' }}>
                <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-xl)' }}>
                    <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">
                        <ArrowLeft size={16} /> Dashboard
                    </button>
                    <button onClick={() => navigate('/')} className="btn btn-secondary">
                        Home
                    </button>
                    {!progress.isPremium && !localStorage.getItem('user') && (
                        <button onClick={() => navigate('/pricing')} className="btn btn-secondary" style={{ marginLeft: 'auto', border: '1px solid var(--accent-primary)', color: 'var(--accent-primary)' }}>
                            Log In
                        </button>
                    )}
                </div>
                <div style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-xl)', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 'var(--radius-xl)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🔒</div>
                    <h2 style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>Unlock 27 More Exams + Full Study Guide</h2>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: 'var(--space-xl)', maxWidth: 500, margin: '0 auto var(--space-xl)' }}>
                        From £1.99/week — all 30 mocks, all 5 chapters, pass guarantee. Cancel anytime.
                    </p>
                    <button onClick={() => navigate('/pricing')} className="btn btn-primary" style={{ fontSize: '1.2rem', padding: 'var(--space-md) var(--space-2xl)' }}>
                        Start Your Subscription →
                    </button>
                </div>
            </div>
        );
    }

    const currentIndex = studyMaterials.findIndex(c => c.id === id);
    const prevChapter = currentIndex > 0 ? studyMaterials[currentIndex - 1] : null;
    const nextChapter = currentIndex < studyMaterials.length - 1 ? studyMaterials[currentIndex + 1] : null;

    const handleComplete = () => {
        markChapterComplete(chapter.id);
        setMarked(true);
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
                <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-xs)' }}>{chapter.title}</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>Estimated time: {chapter.timeToRead}</p>

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

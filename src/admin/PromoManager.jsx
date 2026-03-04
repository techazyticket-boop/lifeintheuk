import React, { useState, useEffect } from 'react';
import { Gift, Plus } from 'lucide-react';
import { promoService } from '../services/promoService';
import PromoForm from './PromoForm';
import PromoTable from './PromoTable';
import { isMockMode } from '../lib/supabase';

export default function PromoManager() {
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [stats, setStats] = useState({ totalCreated: 0, totalRedeemed: 0, topPromo: 'N/A' });

    async function loadPromos() {
        setLoading(true);
        setError('');
        try {
            const data = await promoService.loadPromos();
            let totalCreated = data.length;
            let totalRedeemed = 0;
            let topPromo = 'N/A';
            let maxUses = -1;

            data.forEach(p => {
                const uses = p.current_uses || 0;
                totalRedeemed += uses;
                if (uses > maxUses) {
                    maxUses = uses;
                    topPromo = p.code;
                }
            });

            setPromos(data);
            setStats({ totalCreated, totalRedeemed, topPromo });
        } catch (err) {
            console.error('Failed to load promo codes:', err);
            setError('Failed to load promotional campaigns. Check database permissions.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadPromos();
    }, [isMockMode]);

    if (loading) {
        return <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Promo Manager...</div>;
    }

    return (
        <div className="glass-panel" style={{ padding: 'var(--space-xl)', marginTop: 'var(--space-2xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Gift size={24} color="var(--accent-primary)" />
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Promo Campaigns Manager</h2>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Plus size={16} /> {showForm ? 'Cancel Creation' : 'Create Promo Code'}
                </button>
            </div>

            {/* Analytics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Promos Created</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalCreated}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Redemptions</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{stats.totalRedeemed}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Top Performing Code</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{stats.topPromo}</div>
                </div>
            </div>

            {error && (
                <div style={{ padding: 'var(--space-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: 'var(--space-lg)' }}>
                    {error}
                </div>
            )}

            {showForm && (
                <PromoForm
                    onCreated={() => { setShowForm(false); loadPromos(); }}
                    onCancel={() => setShowForm(false)}
                />
            )}

            <PromoTable promos={promos} onUpdated={loadPromos} />
        </div>
    );
}

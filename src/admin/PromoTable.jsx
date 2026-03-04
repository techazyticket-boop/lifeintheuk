import React, { useState } from 'react';
import { Trash2, Edit2, Save, X } from 'lucide-react';
import { promoService } from '../services/promoService';

export default function PromoTable({ promos, onUpdated }) {
    const [editingId, setEditingId] = useState(null);
    const [editExpiry, setEditExpiry] = useState('');

    const handleDelete = async (id, code) => {
        if (!window.confirm(`Are you sure you want to delete the promo code ${code}?`)) return;

        try {
            await promoService.deletePromo(id);
            onUpdated();
        } catch (err) {
            alert('Failed to delete promo: ' + err.message);
        }
    };

    const handleEditStart = (p) => {
        setEditingId(p.id);
        setEditExpiry(p.expiry_date ? new Date(p.expiry_date).toISOString().split('T')[0] : '');
    };

    const handleEditSave = async (id) => {
        try {
            await promoService.updatePromoExpiry(id, editExpiry || null);
            setEditingId(null);
            onUpdated();
        } catch (err) {
            alert('Failed to update promo: ' + err.message);
        }
    };

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Code</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Value</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Usage</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Expiry</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                        <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {promos.map(p => {
                        const isExpired = p.expiry_date && new Date(p.expiry_date) < new Date();
                        const isMaxedOut = p.max_uses && p.current_uses >= p.max_uses;
                        const isActive = !isExpired && !isMaxedOut;
                        const isEditing = editingId === p.id;

                        return (
                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '16px 16px', fontWeight: 800, color: 'white' }}>{p.code}</td>
                                <td style={{ padding: '16px 16px', textTransform: 'capitalize' }}>
                                    {p.type === 'full' ? <span style={{ color: 'var(--accent-primary)' }}>Full Premium</span> : 'Discount'}
                                </td>
                                <td style={{ padding: '16px 16px' }}>{p.type === 'percentage' ? `${p.value}%` : '100%'}</td>
                                <td style={{ padding: '16px 16px' }}>{p.current_uses || 0} {p.max_uses ? `/ ${p.max_uses}` : ''}</td>
                                <td style={{ padding: '16px 16px' }}>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            value={editExpiry}
                                            onChange={e => setEditExpiry(e.target.value)}
                                            style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', color: 'white' }}
                                        />
                                    ) : (
                                        p.expiry_date ? new Date(p.expiry_date).toLocaleDateString() : 'Never'
                                    )}
                                </td>
                                <td style={{ padding: '16px 16px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                                        background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: isActive ? 'var(--success)' : 'var(--danger)',
                                    }}>
                                        {isActive ? 'Active' : (isExpired ? 'Expired' : 'Maxed')}
                                    </span>
                                </td>
                                <td style={{ padding: '16px 16px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                    {isEditing ? (
                                        <>
                                            <button onClick={() => handleEditSave(p.id)} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer' }} title="Save">
                                                <Save size={18} />
                                            </button>
                                            <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }} title="Cancel">
                                                <X size={18} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => handleEditStart(p)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', opacity: 0.7 }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.7} title="Edit Expiry">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(p.id, p.code)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', opacity: 0.7 }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.7} title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                    {promos.length === 0 && (
                        <tr>
                            <td colSpan="7" style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                                No promotional campaigns active.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

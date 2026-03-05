import React, { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { promoService } from '../services/promoService';

export default function PromoForm({ onCreated, onCancel }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage', // 'percentage' or 'full'
        value: '',
        expiry_date: '',
        max_uses: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            const newPromo = {
                code: formData.code.toUpperCase().trim(),
                type: formData.type,
                value: formData.type === 'percentage' ? parseInt(formData.value) : 100,
                max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
                expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : null,
                valid_for_plan: formData.type === 'percentage' && formData.valid_for_plan ? formData.valid_for_plan : null,
                duration_in_months: formData.type === 'percentage' && formData.duration_in_months ? parseInt(formData.duration_in_months) : null,
            };

            await promoService.createPromo(newPromo);
            onCreated();
            setFormData({ code: '', type: 'percentage', value: '', expiry_date: '', max_uses: '', valid_for_plan: '', duration_in_months: '' });
        } catch (err) {
            setError(err.message || 'Failed to create promo code');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ background: 'rgba(0,0,0,0.2)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                <h3 style={{ margin: 0 }}>Create New Promo Code</h3>
            </div>

            {error && <div style={{ color: 'var(--danger)', marginBottom: 'var(--space-md)', fontSize: '0.85rem' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 'var(--space-xs)', color: 'var(--text-muted)' }}>Promo Code</label>
                    <input type="text" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="e.g. SUMMER50" required style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: 'white' }} />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 'var(--space-xs)', color: 'var(--text-muted)' }}>Type</label>
                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: '10px', background: 'rgba(15,23,42,1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: 'white' }}>
                        <option value="percentage">Percentage Discount</option>
                        <option value="full">Full Premium Access</option>
                    </select>
                </div>
                {formData.type === 'percentage' && (
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 'var(--space-xs)', color: 'var(--text-muted)' }}>Discount Value (%)</label>
                        <input type="number" min="1" max="100" value={formData.value} onChange={e => setFormData({ ...formData, value: e.target.value })} placeholder="e.g. 50" required style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: 'white' }} />
                    </div>
                )}
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 'var(--space-xs)', color: 'var(--text-muted)' }}>Expiry Date (Optional)</label>
                    <input type="date" value={formData.expiry_date} onChange={e => setFormData({ ...formData, expiry_date: e.target.value })} style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: 'white' }} />
                </div>
                {formData.type === 'percentage' && (
                    <>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 'var(--space-xs)', color: 'var(--text-muted)' }}>Valid for Plan</label>
                            <select value={formData.valid_for_plan || ''} onChange={e => setFormData({ ...formData, valid_for_plan: e.target.value })} style={{ width: '100%', padding: '10px', background: 'rgba(15,23,42,1)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: 'white' }}>
                                <option value="">Any Plan</option>
                                <option value="monthly">Monthly Only</option>
                                <option value="weekly">Weekly Only</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 'var(--space-xs)', color: 'var(--text-muted)' }}>Discount Duration (Months)</label>
                            <input type="number" min="1" max="100" value={formData.duration_in_months || ''} onChange={e => setFormData({ ...formData, duration_in_months: e.target.value })} placeholder="Leave blank for forever" style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: 'white' }} />
                        </div>
                    </>
                )}
                <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: 'var(--space-xs)', color: 'var(--text-muted)' }}>Max Uses (Optional)</label>
                    <input type="number" min="1" value={formData.max_uses} onChange={e => setFormData({ ...formData, max_uses: e.target.value })} placeholder="Leave blank for unlimited" style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)', color: 'white' }} />
                </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || !formData.code} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isSubmitting ? <RefreshCw size={16} className="spin" /> : <Plus size={16} />}
                    Create Campaign
                </button>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </form>
    );
}

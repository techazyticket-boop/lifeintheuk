import { supabase, isMockMode } from '../lib/supabase';

export const promoService = {
    async loadPromos() {
        if (isMockMode) {
            return [
                { id: '1', code: 'FREEPREMIUM', type: 'full', value: 100, expiry_date: '2026-01-01', current_uses: 3, max_uses: 100 },
                { id: '2', code: 'STUDY50', type: 'percentage', value: 50, expiry_date: '2025-12-31', current_uses: 21, max_uses: 100 }
            ];
        }

        const { data, error } = await supabase
            .from('promo_codes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async createPromo(promoData) {
        if (isMockMode) throw new Error('Cannot create promos in mock mode');

        const { error } = await supabase
            .from('promo_codes')
            .insert([promoData]);

        if (error) {
            if (error.code === '23505') throw new Error('A promo code with this name already exists.');
            throw error;
        }
    },

    async updatePromoExpiry(id, expiry_date) {
        if (isMockMode) throw new Error('Cannot update promos in mock mode');

        const { error } = await supabase
            .from('promo_codes')
            .update({ expiry_date: expiry_date ? new Date(expiry_date).toISOString() : null })
            .eq('id', id);

        if (error) throw error;
    },

    async deletePromo(id) {
        if (isMockMode) return;

        const { error } = await supabase
            .from('promo_codes')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};

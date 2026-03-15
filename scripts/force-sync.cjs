require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    try {
        console.log("Finding user's latest checkout session...");
        const events = await stripe.events.list({ type: 'checkout.session.completed', limit: 1 });
        if (events.data.length === 0) {
            console.log("No checkout sessions found.");
            return;
        }

        const session = events.data[0].data.object;
        console.log("Found session:", session.id);

        const email = session.customer_details?.email;
        if (!email) {
            console.log("No email in session");
            return;
        }

        const { data: user } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (!user) {
            console.log("User not found in Supabase:", email);
            return;
        }

        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        const customerId = session.customer;

        const plan = subscription.items?.data?.[0]?.price;
        const planInterval = plan?.recurring?.interval;
        const planLabel = planInterval === 'month' ? 'monthly' : 'weekly';

        const subData = {
            user_id: user.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            plan: planLabel,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        };

        console.log("Writing to Supabase subscriptions table...");
        const { error } = await supabase.from('subscriptions').insert(subData);
        if (error) {
            console.error("Supabase insert error:", error);
        } else {
            console.log("Success! Sub inserted.");
        }
    } catch (err) {
        console.error(err);
    }
}
run();
